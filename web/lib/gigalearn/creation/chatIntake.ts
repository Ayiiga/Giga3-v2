import {
  formatValue,
  hasValue,
  nextIntakeField,
  normalizeAnswer,
  summaryRows,
  withDefaults,
} from "@/lib/gigalearn/creation/intake";
import { buildCreationLink } from "@/lib/gigalearn/creation/links";
import {
  RHYME_CATEGORY_LABELS,
  SUBJECT_OPTIONS,
  getCreationTemplate,
} from "@/lib/gigalearn/creation/templates";
import type {
  CreationInputs,
  CreationTemplate,
  CreationTemplateId,
  IntakeField,
} from "@/lib/gigalearn/creation/types";

/**
 * Chat-driven creation intake. Runs entirely on the client as local chat turns:
 * it asks one question at a time, shows a Generation Preview, and hands off to
 * the builder. Nothing is generated (and no credits are used) until the user
 * confirms.
 */

export type ChatCreationState = {
  templateId: CreationTemplateId;
  inputs: CreationInputs;
  pendingFieldId: string | null;
  awaitingConfirmation: boolean;
};

export type ChatCreationTurn = {
  state: ChatCreationState | null;
  reply: string;
  /** Builder link to open after the user typed a confirmation. */
  navigateTo?: string;
  autostart?: boolean;
};

const MAX_INTENT_LENGTH = 220;

const CREATION_VERB =
  /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?|help\s+me\s+(?:to\s+)?|i\s+(?:want|need|would\s+like)\s+(?:you\s+)?to\s+|i\s+want\s+|i\s+need\s+|let'?s\s+)?(?:create|make|write|build|prepare|draft|generate|develop|design|compose)\b/i;

const TEMPLATE_NOUNS: Array<{ id: CreationTemplateId; pattern: RegExp }> = [
  { id: "cv", pattern: /\b(cv|resume|résumé|curriculum vitae)\b/i },
  { id: "research", pattern: /\b(research(\s+(project|proposal|work|paper))?|thesis|dissertation|project\s+work|long\s+essay)\b/i },
  { id: "rhyme", pattern: /\b(nursery\s+)?rhymes?\b/i },
  { id: "quiz", pattern: /\b(quiz(zes)?|test\s+questions|class\s+exercise)\b/i },
  { id: "book", pattern: /\b(e-?book|book)\b/i },
  { id: "lesson", pattern: /\b(lesson(\s+(plan|note|notes))?|scheme\s+of\s+(learning|work))\b/i },
];

const SUBJECT_KEYWORDS: Array<[RegExp, string]> = [
  [/\bscience\b/i, "Science"],
  [/\bmath(s|ematics)?\b/i, "Mathematics"],
  [/\benglish\b/i, "English Language"],
  [/\bsocial\s+studies\b/i, "Social Studies"],
  [/\b(rme|religious)\b/i, "Religious & Moral Education"],
  [/\b(computing|ict)\b/i, "Computing"],
  [/\bcreative\s+arts?\b/i, "Creative Arts & Design"],
  [/\bcareer\s+tech(nology)?\b/i, "Career Technology"],
  [/\bfrench\b/i, "French"],
  [/\bhistory\b/i, "History"],
  [/\bghanaian\s+language\b/i, "Ghanaian Language"],
];

const RHYME_KEYWORDS: Array<[RegExp, (typeof RHYME_CATEGORY_LABELS)[number]]> = [
  [/\b(alphabet|letters?|abc)\b/i, "Alphabet"],
  [/\b(count(ing)?|numbers?)\b/i, "Numbers & Counting"],
  [/\b(fruits?|vegetables?)\b/i, "Fruits & Vegetables"],
  [/\banimals?\b/i, "African Animals"],
  [/\bcolou?rs?\b/i, "Colours"],
  [/\b(hygiene|hand\s*washing|health|brush)\b/i, "Health & Hygiene"],
  [/\bmanners?\b/i, "Good Manners"],
  [/\bschool\b/i, "School"],
  [/\b(nature|environment|trees?|rain)\b/i, "Nature & Environment"],
  [/\b(movement|actions?|dance|jump)\b/i, "Movement & Actions"],
  [/\b(twi|ewe|ga|dagbani|hausa|yoruba|swahili|languages?)\b/i, "African Languages"],
  [/\bculture\b/i, "Ghana & African Culture"],
];

function parseLevel(text: string): string | null {
  const jhs = text.match(/\bjhs\s?-?([1-3])\b/i);
  if (jhs) return `Basic ${6 + Number(jhs[1])}`;
  const shs = text.match(/\bshs\s?-?([1-3])\b/i);
  if (shs) return `SHS ${shs[1]}`;
  const kg = text.match(/\bkg\s?-?([12])\b/i);
  if (kg) return `KG ${kg[1]}`;
  const basic = text.match(/\b(?:basic|class|primary)\s?-?(\d{1,2})\b/i) ?? text.match(/\b[bp](\d{1,2})\b/i);
  if (basic) {
    const n = Number(basic[1]);
    if (n >= 1 && n <= 9) return `Basic ${n}`;
  }
  return null;
}

function parseTopic(text: string): string | null {
  const match = text.match(/\b(?:on|about|topic:?)\s+(.{2,100}?)(?=\s+for\s+(?:basic|class|primary|jhs|shs|kg|[bp]\d)|\s*[,.?!]|$)/i);
  const topic = match?.[1]?.trim();
  if (!topic || /^(a|an|the|my)$/i.test(topic)) return null;
  return topic.charAt(0).toUpperCase() + topic.slice(1);
}

function parseDuration(text: string): string | null {
  const minutes = text.match(/\b(\d{2,3})\s*(?:min|mins|minutes)\b/i);
  if (minutes) return `${Number(minutes[1])} minutes`;
  const hours = text.match(/\b(\d|an?|one)\s*hours?\b/i);
  if (hours) {
    const n = /^\d$/.test(hours[1]!) ? Number(hours[1]) : 1;
    return `${n * 60} minutes`;
  }
  return null;
}

/** Detect a creation request such as "Help me create a Basic 8 science lesson." */
export function detectCreationIntent(raw: string): { templateId: CreationTemplateId; inputs: CreationInputs } | null {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text || text.length > MAX_INTENT_LENGTH) return null;
  if (!CREATION_VERB.test(text)) return null;

  let best: { id: CreationTemplateId; index: number } | null = null;
  for (const noun of TEMPLATE_NOUNS) {
    const match = noun.pattern.exec(text);
    if (match && (best === null || match.index < best.index)) best = { id: noun.id, index: match.index };
  }
  if (!best) return null;

  const inputs: CreationInputs = {};
  const templateId = best.id;
  if (templateId === "lesson" || templateId === "quiz") {
    const subject = SUBJECT_KEYWORDS.find(([pattern]) => pattern.test(text))?.[1];
    if (subject && SUBJECT_OPTIONS.includes(subject)) inputs.subject = subject;
    const level = parseLevel(text);
    if (level) inputs.level = level;
    const topic = parseTopic(text);
    if (topic) inputs.topic = topic;
  }
  if (templateId === "lesson") {
    const duration = parseDuration(text);
    if (duration) inputs.duration = duration;
    if (/\blesson\s+notes?\b/i.test(text)) inputs.documentKind = "Lesson note";
    if (/\bscheme\s+of\s+(learning|work)\b/i.test(text)) inputs.documentKind = "Weekly scheme of learning";
  }
  if (templateId === "quiz") {
    const count = text.match(/\b(\d{1,2})\s*(?:questions|qs)\b/i);
    if (count) inputs.questionCount = count[1]!;
  }
  if (templateId === "research") {
    const topic = parseTopic(text);
    if (topic) inputs.topic = topic;
  }
  if (templateId === "rhyme") {
    const category = RHYME_KEYWORDS.find(([pattern]) => pattern.test(text))?.[1];
    if (category) inputs.category = category;
  }
  return { templateId, inputs };
}

function chatFields(template: CreationTemplate): IntakeField[] {
  // Chat asks only what is required; optional details can be added in Edit Details.
  return template.fields.filter((field) => field.askUpfront && field.required && !field.personalData);
}

function nextChatField(template: CreationTemplate, inputs: CreationInputs): IntakeField | null {
  const allowed = new Set(chatFields(template).map((field) => field.id));
  const skipped = new Set(template.fields.filter((field) => !allowed.has(field.id)).map((field) => field.id));
  return nextIntakeField(template, inputs, skipped);
}

function questionText(template: CreationTemplate, field: IntakeField, inputs: CreationInputs): string {
  let question = field.question;
  if (template.id === "lesson" && field.id === "topic" && hasValue(inputs.subject)) {
    question = `What ${formatValue(inputs.subject)} topic should the lesson cover?`;
  }
  if (template.id === "lesson" && field.id === "duration") question = "What lesson duration do you want?";
  if ((field.kind === "choice" || field.kind === "multichoice") && field.options?.length) {
    const list = field.options.map((option, i) => `${i + 1}. ${option}`).join("\n");
    const how =
      field.kind === "multichoice"
        ? "Reply with one or more numbers (e.g. 1, 3)"
        : "Reply with a number";
    return `${question}\n\n${list}\n\n_${how}${field.allowCustom ? " or type your own answer" : ""}._`;
  }
  return question;
}

const ACKS = ["Good.", "Great.", "Thanks.", "Got it."];

function previewReply(template: CreationTemplate, inputs: CreationInputs): string {
  const rows = summaryRows(template, inputs)
    .map((row) => `- **${row.label}:** ${row.value}`)
    .join("\n");
  const confirmLink = buildCreationLink(template.id, inputs, { step: "confirm" });
  const editLink = buildCreationLink(template.id, inputs, { step: "edit" });
  return [
    "**Generation Preview**",
    rows,
    "Would you like me to generate this? Reply **yes** to confirm, **edit** to change details, or **cancel** to stop.",
    `[Confirm & Generate in ${template.label}](${confirmLink}) · [Edit Details](${editLink})`,
  ].join("\n\n");
}

function askOrPreview(
  template: CreationTemplate,
  inputs: CreationInputs,
  prefix: string
): ChatCreationTurn {
  const next = nextChatField(template, inputs);
  if (!next) {
    const withDefaultValues = withDefaults(template, inputs);
    return {
      state: { templateId: template.id, inputs: withDefaultValues, pendingFieldId: null, awaitingConfirmation: true },
      reply: `${prefix ? `${prefix}\n\n` : ""}${previewReply(template, withDefaultValues)}`,
    };
  }
  return {
    state: { templateId: template.id, inputs, pendingFieldId: next.id, awaitingConfirmation: false },
    reply: `${prefix ? `${prefix} ` : ""}${questionText(template, next, inputs)}`,
  };
}

export function startChatCreation(raw: string): ChatCreationTurn | null {
  const intent = detectCreationIntent(raw);
  if (!intent) return null;
  const template = getCreationTemplate(intent.templateId)!;

  if (template.id === "cv") {
    return {
      state: null,
      reply: `I can help you build a CV from your own information. Your personal details go into the ${template.label} form (not this chat), and nothing is generated until you confirm.\n\n[Open ${template.label}](${buildCreationLink("cv")})`,
    };
  }

  const intro =
    template.id === "research"
      ? "I can help. Let's build your research project step by step — I'll only use details you give me and never invent data or results."
      : `I can help. Let's build it step by step. _(Type **cancel** at any time to stop.)_`;
  const first = nextChatField(template, intent.inputs);
  if (!first) return askOrPreview(template, intent.inputs, intro);
  const body = questionText(template, first, intent.inputs);
  return {
    state: { templateId: template.id, inputs: intent.inputs, pendingFieldId: first.id, awaitingConfirmation: false },
    reply: `${intro}\n\nFirst, ${body.charAt(0).toLowerCase()}${body.slice(1)}`,
  };
}

const CANCEL = /^(cancel|stop|exit|quit|never\s*mind|nevermind)\b/i;
const RESTART = /^(start\s+over|restart|reset)\b/i;
const CONFIRM = /^(yes|yeah|yep|y|confirm|ok|okay|sure|go\s+ahead|generate|please\s+do)\b/i;
const EDIT = /^(no|edit|change|not\s+yet)\b/i;

export function continueChatCreation(state: ChatCreationState, raw: string): ChatCreationTurn {
  const template = getCreationTemplate(state.templateId)!;
  const text = raw.trim();

  if (CANCEL.test(text)) {
    return { state: null, reply: `No problem — I've stopped the ${template.label}. Ask me anything.` };
  }
  if (RESTART.test(text)) {
    return askOrPreview(template, {}, "Starting over.");
  }

  if (state.awaitingConfirmation) {
    if (CONFIRM.test(text)) {
      const link = buildCreationLink(template.id, state.inputs, { step: "confirm" });
      return {
        state: null,
        reply: `Confirmed. Opening the ${template.label} to generate your ${template.documentNoun}…\n\n[Open ${template.label}](${link})`,
        navigateTo: link,
        autostart: true,
      };
    }
    if (EDIT.test(text)) {
      const link = buildCreationLink(template.id, state.inputs, { step: "edit" });
      return {
        state: null,
        reply: `Sure — adjust any detail in the builder, then confirm there.\n\n[Edit Details](${link})`,
      };
    }
    return {
      state,
      reply: "Reply **yes** to generate, **edit** to change details, or **cancel** to stop.",
    };
  }

  const field = template.fields.find((candidate) => candidate.id === state.pendingFieldId);
  if (!field) return askOrPreview(template, state.inputs, "");

  const answer = normalizeAnswer(field, text);
  if (!answer.ok) {
    return { state, reply: `${answer.error}\n\n${questionText(template, field, state.inputs)}` };
  }
  const inputs = { ...state.inputs, [field.id]: answer.value };
  const ack = ACKS[Object.keys(inputs).length % ACKS.length]!;
  return askOrPreview(template, inputs, ack);
}
