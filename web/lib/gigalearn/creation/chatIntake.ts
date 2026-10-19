import {
  applySkip,
  brainstormBookTitles,
  classifyBookIntakeMessage,
  defaultSeparationOutline,
  educationalBookReply,
  formatTitleSuggestions,
  MORE_TITLES,
  outlineForSubject,
} from "@/lib/gigalearn/creation/bookIntakeActions";
import {
  formatValue,
  hasValue,
  nextIntakeField,
  normalizeAnswer,
  summaryRows,
  withDefaults,
} from "@/lib/gigalearn/creation/intake";
import { CREATION_VERB } from "@/lib/gigalearn/creation/chatIntent";
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
  /** Last title brainstorm options (book intake). */
  titleSuggestions?: string[];
};

export type ChatCreationTurn = {
  state: ChatCreationState | null;
  reply: string;
  /** Builder link to open after the user typed a confirmation. */
  navigateTo?: string;
  autostart?: boolean;
};

const MAX_INTENT_LENGTH = 220;

const TEMPLATE_NOUNS: Array<{ id: CreationTemplateId; pattern: RegExp }> = [
  { id: "cv", pattern: /\b(cv|resume|résumé|curriculum vitae)\b/i },
  { id: "research", pattern: /\b(research(\s+(project|proposal|work|paper))?|thesis|dissertation|project\s+work|long\s+essay)\b/i },
  { id: "rhyme", pattern: /\b(nursery\s+)?rhymes?\b/i },
  { id: "quiz", pattern: /\b(quiz(zes)?|test\s+questions|class\s+exercise)\b/i },
  { id: "book", pattern: /\b(e-?book|book)\b/i },
  { id: "lesson", pattern: /\b(lesson(\s+(plan|note|notes))?|scheme\s+of\s+(learning|work))\b/i },
];

/** Requests for images, video or software go to the normal chat / media flows. */
const MEDIA_OR_APP =
  /\b(image|picture|photo|video|logo|poster|flyer|cover|thumbnail|drawing|illustration|animation|website|app|slides?|presentation)\b/i;

/** A different document type named first ("a summary of this book") is not a template request. */
const OTHER_DOCUMENT =
  /\b(summary|review|report|essay|letter|story|poem|song|email|speech|article|blog|caption|outline|abstract|cover\s+letter|analysis)\b/i;

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
  if (MEDIA_OR_APP.test(text)) return null;

  let best: { id: CreationTemplateId; index: number } | null = null;
  for (const noun of TEMPLATE_NOUNS) {
    const match = noun.pattern.exec(text);
    if (match && (best === null || match.index < best.index)) best = { id: noun.id, index: match.index };
  }
  if (!best) return null;
  const otherDocument = OTHER_DOCUMENT.exec(text);
  if (otherDocument && otherDocument.index < best.index) return null;

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
const CONFIRM = /^(yes|yeah|yep|y|confirm|ok|okay|sure|go\s+ahead|generate|please\s+do|use this outline)\b/i;
const EDIT = /^(no|edit|change|not\s+yet)\b/i;
const USE_OUTLINE = /^(use this outline|use the outline|accept outline|yes,? use (this|the) outline)\b/i;

function withState(
  template: CreationTemplate,
  inputs: CreationInputs,
  prefix: string,
  extras?: Partial<ChatCreationState>
): ChatCreationTurn {
  const turn = askOrPreview(template, inputs, prefix);
  if (!turn.state) return turn;
  return {
    ...turn,
    state: {
      ...turn.state,
      titleSuggestions: extras?.titleSuggestions,
    },
  };
}

function continueBookCreation(state: ChatCreationState, text: string): ChatCreationTurn {
  const template = getCreationTemplate("book")!;
  const action = classifyBookIntakeMessage({
    text,
    pendingFieldId: state.pendingFieldId,
    inputs: state.inputs,
    titleSuggestions: state.titleSuggestions,
  });

  if (action.type === "cancel") {
    return { state: null, reply: `No problem — I've stopped the ${template.label}. Ask me anything.` };
  }
  if (action.type === "restart") {
    return askOrPreview(template, {}, "Starting over.");
  }

  if (action.type === "title_brainstorm") {
    // "More options" must reuse subject / prior suggestions as the topic hint —
    // never brainstorm from the navigation phrase itself.
    const topicHint = MORE_TITLES.test(text)
      ? [
          String(state.inputs.subject ?? "").trim(),
          String(state.inputs.audience ?? "").trim(),
          ...(state.titleSuggestions ?? []).slice(0, 3),
        ]
          .filter(Boolean)
          .join(" ") || action.topicHint
      : action.topicHint;
    const titles = brainstormBookTitles(topicHint, state.inputs);
    const reply = formatTitleSuggestions(titles, 0);
    return {
      state: {
        ...state,
        pendingFieldId: "title",
        awaitingConfirmation: false,
        titleSuggestions: titles,
      },
      reply,
    };
  }

  if (action.type === "title_pick" || action.type === "title_use") {
    const title =
      action.type === "title_pick"
        ? state.titleSuggestions?.[action.index - 1]
        : action.title;
    if (!title) {
      return {
        state: { ...state, pendingFieldId: "title" },
        reply: "I couldn't match that title. Reply with a number from the list, or type your own title.",
      };
    }
    const inputs = { ...state.inputs, title };
    return withState(template, inputs, `Title set to **${title}**.`, { titleSuggestions: undefined });
  }

  if (action.type === "skip") {
    const { inputs } = applySkip(state.pendingFieldId, state.inputs);
    // Mark skipped required fields by writing defaults via applySkip, then advance
    const skippedId = state.pendingFieldId;
    if (skippedId && !hasValue(inputs[skippedId]) && skippedId !== "purpose" && skippedId !== "genre" && skippedId !== "chapterCount" && skippedId !== "tone") {
      return {
        state,
        reply: `I still need a ${skippedId} to continue, or type **cancel** to stop.`,
      };
    }
    return withState(template, inputs, "Skipped — using a sensible default where needed.");
  }

  if (action.type === "set_fields") {
    const inputs = { ...state.inputs, ...action.patches };
    if (action.resumePending && action.resumePending !== "audience") {
      const field = template.fields.find((f) => f.id === action.resumePending);
      const prefix = action.preface ?? "Updated.";
      if (field && !hasValue(inputs[field.id])) {
        return {
          state: {
            templateId: "book",
            inputs,
            pendingFieldId: field.id,
            awaitingConfirmation: false,
            titleSuggestions: state.titleSuggestions,
          },
          reply: `${prefix}\n\n${questionText(template, field, inputs)}`,
        };
      }
    }
    return withState(template, inputs, action.preface ?? "Updated.", {
      titleSuggestions: state.titleSuggestions,
    });
  }

  if (action.type === "chapter_topics") {
    const inputs: CreationInputs = {
      ...state.inputs,
      chapterPlan: action.topics.join("\n"),
      chapterCount: String(action.suggestedCount),
    };
    if (!inputs.subject && /\bseparation of mixtures\b/i.test(text)) {
      inputs.subject = "Separation of mixtures";
    }
    return withState(
      template,
      inputs,
      `I've saved a **${action.suggestedCount}-chapter** plan from your topics. You can edit it in the builder before generating.`
    );
  }

  if (action.type === "suggest_outline") {
    const subject = String(state.inputs.subject ?? "").trim();
    if (!subject) {
      const needTitle = !hasValue(state.inputs.title);
      return {
        state: {
          ...state,
          pendingFieldId: needTitle ? "title" : "subject",
          awaitingConfirmation: false,
          titleSuggestions: state.titleSuggestions,
        },
        reply: needTitle
          ? "Before I can suggest an outline, I need a **title** and a **subject**. Share a title (or ask me to brainstorm titles), then tell me the topic."
          : "What subject should the outline cover? Share the topic first (for example **Photosynthesis** or **Separation of mixtures**), then ask me to **suggest an outline** again.",
      };
    }
    const audience = String(state.inputs.audience ?? "");
    const topics = outlineForSubject(subject, audience);
    const inputs: CreationInputs = {
      ...state.inputs,
      chapterPlan: topics.join("\n"),
      chapterCount: String(topics.length),
    };
    const listed = topics.map((line, i) => `${i + 1}. ${line}`).join("\n");
    return withState(
      template,
      inputs,
      [
        `Here's a suggested **${topics.length}-chapter** outline for **${subject}**:`,
        "",
        listed,
        "",
        "Reply **use this outline** to keep it, paste edits, or enter a different **chapter count** (1–30).",
      ].join("\n")
    );
  }

  if (action.type === "suggest_chapter_count") {
    const subject = String(state.inputs.subject ?? "").trim();
    const planLines = String(state.inputs.chapterPlan ?? "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (planLines.length < 3 && !subject) {
      return {
        state: {
          ...state,
          pendingFieldId: state.pendingFieldId ?? "subject",
          awaitingConfirmation: false,
        },
        reply:
          "I need a **subject** (or a chapter plan) before I can suggest a chapter count. Tell me the topic, then ask again.",
      };
    }
    const topics =
      planLines.length >= 3
        ? planLines
        : outlineForSubject(subject, String(state.inputs.audience ?? ""));
    const count = Math.min(30, Math.max(3, topics.length));
    const inputs: CreationInputs = {
      ...state.inputs,
      chapterPlan: topics.join("\n"),
      chapterCount: String(count),
    };
    return withState(
      template,
      inputs,
      `I'd suggest **${count} chapters** for this book (editable). Outline saved — reply **yes** at the preview to generate, or change the count.`
    );
  }

  if (action.type === "educational") {
    const patches: CreationInputs = { ...state.inputs };
    const mixturesQuestion = /\bseparation of mixtures\b/i.test(action.question);
    if (mixturesQuestion && !patches.subject) {
      patches.subject = "Separation of mixtures";
    }
    const audienceMatch = action.question.match(/\bjhs\s*-?\s*([1-3])\b/i);
    if (audienceMatch && !patches.audience) {
      patches.audience = `JHS ${audienceMatch[1]} students`;
    }
    const mixturesSubject = /\bseparation of mixtures\b/i.test(String(patches.subject ?? ""));
    // Only attach the hard-coded mixtures outline when the book subject matches
    // (or was just inferred from this question) — never overwrite an unrelated topic.
    const wantsMixturesOutline =
      mixturesSubject &&
      (state.pendingFieldId === "chapterCount" ||
        /\bmethods of separation\b/i.test(action.question) ||
        mixturesQuestion);
    if (wantsMixturesOutline) {
      patches.chapterPlan = defaultSeparationOutline().join("\n");
    }
    let reply = educationalBookReply(action.question, patches);
    const pendingFieldId =
      !hasValue(patches.title) && state.titleSuggestions?.length
        ? "title"
        : wantsMixturesOutline
          ? "chapterCount"
          : state.pendingFieldId;
    if (pendingFieldId === "title") {
      reply +=
        "\n\n_Your book setup is still waiting on a **title** — reply with a number from the suggestions, or type your own._";
    }
    return {
      state: {
        templateId: "book",
        inputs: patches,
        pendingFieldId,
        awaitingConfirmation: false,
        titleSuggestions: state.titleSuggestions,
      },
      reply,
    };
  }

  // Explicit accept of suggested outline while chapter count pending
  if (USE_OUTLINE.test(text) && state.inputs.chapterPlan) {
    const topics = String(state.inputs.chapterPlan)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    const inputs = {
      ...state.inputs,
      chapterCount: String(state.inputs.chapterCount || topics.length || 8),
      chapterPlan: topics.join("\n"),
    };
    return withState(template, inputs, "Outline accepted.");
  }

  const field = template.fields.find((candidate) => candidate.id === state.pendingFieldId);
  if (!field) return askOrPreview(template, state.inputs, "");

  const answer = normalizeAnswer(field, text);
  if (!answer.ok) {
    return { state, reply: `${answer.error}\n\n${questionText(template, field, state.inputs)}` };
  }
  const inputs = { ...state.inputs, [field.id]: answer.value };
  const ack = ACKS[Object.keys(inputs).length % ACKS.length]!;
  return withState(template, inputs, ack);
}

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

  if (template.id === "book") {
    return continueBookCreation(state, text);
  }

  const field = template.fields.find((candidate) => candidate.id === state.pendingFieldId);
  if (!field) return askOrPreview(template, state.inputs, "");

  // Non-book: never treat a clear content question as a numeric field answer.
  if (
    field.kind === "number" &&
    (/[?]/.test(text) || /^(what|how|why|explain|describe|list)\b/i.test(text))
  ) {
    return {
      state,
      reply: `${field.id === "chapterCount" ? "That looks like a content question, not a chapter count." : "That does not look like a number."} Reply with a number, type **skip** if you want a default, or **cancel** to ask in regular chat.\n\n${questionText(template, field, state.inputs)}`,
    };
  }

  const answer = normalizeAnswer(field, text);
  if (!answer.ok) {
    return { state, reply: `${answer.error}\n\n${questionText(template, field, state.inputs)}` };
  }
  const inputs = { ...state.inputs, [field.id]: answer.value };
  const ack = ACKS[Object.keys(inputs).length % ACKS.length]!;
  return askOrPreview(template, inputs, ack);
}
