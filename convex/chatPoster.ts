import { isImageCommentaryOrInstruction } from "./imageRequestIntent";

type Turn = { role: string; content: string; createdAt?: number };

const MISSING_PERSON = /\bmissing[- ](?:person|child|boy|girl|man|woman|teen(?:ager)?)\b/i;
const POSTER = /\b(?:poster|flyer|notice)\b/i;
const DESIGN_REQUEST = /\b(?:design|create|make|generate|render|give|send|show|want|need|update|correct|edit|fix|revise|change)\b/i;
const CONTEXT_REFERENCE = /\b(?:use|using|based on|with)\s+(?:(?:the|my|our|these|those|this)\s+)?(?:information|info|details|brief|content|text|copy|words|instructions)(?:\s+(?:above|earlier|provided|I (?:gave|shared|sent)))\b|\b(?:above|earlier|previous)\s+(?:information|info|details|brief|content|text|copy|instructions)\b|\b(?:same|this|that|previous|earlier)\s+(?:design|poster|flyer|notice)\b/i;
const BARE_DESIGN = /^(?:(?:yes|please)[,\s]+)*(?:(?:can|could|would|will) you\s+)?(?:please\s+)?(?:design|create|make|generate|render|produce|give (?:me|us))\s+(?:(?:a|an|me|us|my|our|the)\s+)?(?:(?:beautiful|good|nice|clean|professional|promotional|bright|clear|custom|original|new)\s+){0,5}(?:poster|flyer|banner)(?:\s+please)?[.?!]*$/i;
const PHOTO_REQUIRED = "Please attach one original photo of the person to use in the poster. No image credits were charged.";
const CHOOSE_PHOTO = "Please attach only the one photo you want on the poster. No image credits were charged.";
const FIELD_LABEL = /^(?:name|full name|last seen|age|height|high|complexion|build|contacts?)\s*[:–-]/i;
const DETAILS_REQUIRED = "Please send the confirmed details as separate lines: Name, Last seen (date and place), and a contact name and phone number. You can also include age, height, complexion, and build. No image credits were charged.";
const EDIT_CURRENT_POSTER = /^(?:please\s+)?(?:edit|update|correct|fix|revise|change|replace|make it|brighten|darken)\b/i;
const POSTER_DELIVERY = /^(?:here is your|where(?: is|'s)|show me|give me|i (?:am |’m |'m )?waiting for|i (?:need|want))\b.{0,50}\b(?:poster|flyer|banner|notice)\b/i;

export function imageBriefText(content: string): string {
  return content
    .replace(/!\[[^\]\n]*\]\(data:image\/[^)]+\)/gi, "")
    .replace(/data:image\/[\w.+-]+;base64,[a-z0-9+/=]+/gi, "")
    .replace(/^\s*\[Please respond in [^\]\n]+\]\s*$/gim, "")
    .trim();
}

export function isPhotoOnlyPosterFollowup(query: string): boolean {
  return /^(?:analy[sz]e (?:this image|the uploaded files)|(?:here is|here's|use) (?:the|this|my) (?:photo|picture|image)(?: for (?:the|this) (?:poster|flyer))?|photo attached)[.!?]*$/i.test(imageBriefText(query));
}

export function needsPosterHistory(query: string, hasPhoto = false): boolean {
  const text = imageBriefText(query);
  return EDIT_CURRENT_POSTER.test(text) || (hasPhoto && isPhotoOnlyPosterFollowup(text)) ||
    text.split(/\r?\n/).some(line => FIELD_LABEL.test(line.trim())) ||
    (POSTER.test(text) && (DESIGN_REQUEST.test(text) || CONTEXT_REFERENCE.test(text) || POSTER_DELIVERY.test(text)));
}

type PosterDetails = {
  name: string;
  lastSeen: string;
  description: Array<[string, string]>;
  contacts: string[];
};

function cleanLines(content: string): string[] {
  return imageBriefText(content).split(/\r?\n/).map(line =>
    line.trim().replace(/^[-•*]+\s*/, "").replace(/\*\*/g, "").trim()
  );
}

function readPosterDetails(content: string): PosterDetails | undefined {
  const lines = cleanLines(content);
  const field = (labels: string) => {
    const pattern = new RegExp(`^(?:${labels})\\s*[:–-]\\s*(.*)$`, "i");
    const index = lines.findIndex(line => pattern.test(line));
    if (index < 0) return "";
    const inline = lines[index].match(pattern)?.[1]?.trim();
    const next = inline || lines.slice(index + 1).find(Boolean) || "";
    return FIELD_LABEL.test(next) || next.startsWith("[") ? "" : next;
  };
  const name = field("name|full name");
  const lastSeen = field("last seen");
  const contacts = lines.filter(line =>
    /(?:\+?\d[\d ()-]{6,}\d)/.test(line) &&
    !/^(?:last seen|name|age|height|weight|date|location)\b/i.test(line)
  ).map(line => line.replace(/^contacts?\s*:\s*/i, "").trim());
  if (!name || !lastSeen || !contacts.length || contacts.length > 4 ||
    name.length > 70 || lastSeen.length > 145 || contacts.some(line => line.length > 110)) return undefined;
  const description: Array<[string, string]> = [];
  for (const [label, aliases] of [
    ["Age", "age"], ["Height", "height|high"], ["Complexion", "complexion"], ["Build", "build"],
  ]) {
    const value = field(aliases);
    if (value.length > 70) return undefined;
    if (value) description.push([label, value]);
  }
  return { name, lastSeen, description, contacts };
}

const RASTER_DATA_URL = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i;

export type ChatPosterPlan =
  | { kind: "ask"; content: string }
  | { kind: "missing_person"; photo: string; details: PosterDetails }
  | { kind: "image"; prompt: string };

export function planChatPoster(args: {
  query: string;
  history: Turn[];
  images?: Array<{ dataUrl?: string }>;
  historicalImages?: boolean;
  uploadAt?: number;
}): ChatPosterPlan | undefined {
  const query = imageBriefText(args.query);
  const photoOnly = isPhotoOnlyPosterFollowup(query);
  const photos = (args.images ?? []).filter(a => a.dataUrl);
  if (!needsPosterHistory(query, !args.historicalImages && photos.length > 0)) return undefined;
  if (!photoOnly && isImageCommentaryOrInstruction(query) && !POSTER_DELIVERY.test(query)) return undefined;
  const lastAssistant = args.history.filter(turn => turn.role === "assistant").at(-1);
  const confirmedDetails = readPosterDetails(query);
  const suppliesRequestedDetails = Boolean(confirmedDetails &&
    (lastAssistant?.content === DETAILS_REQUIRED || lastAssistant?.content === PHOTO_REQUIRED ||
      lastAssistant?.content === CHOOSE_PHOTO));
  if (!POSTER.test(query) && !suppliesRequestedDetails) {
    if (!photoOnly && (!photos.length || args.historicalImages) && EDIT_CURRENT_POSTER.test(query) &&
      lastAssistant?.content.startsWith(MISSING_PERSON_POSTER_REPLY)) {
      return { kind: "ask", content: DETAILS_REQUIRED };
    }
    if (!photoOnly) return undefined;
  }

  const previous = args.history.filter(turn => turn.role === "user" && imageBriefText(turn.content) !== query);
  const newestBrief = [...previous].reverse().find(turn => {
    const text = imageBriefText(turn.content);
    return !isPhotoOnlyPosterFollowup(text) && !BARE_DESIGN.test(text) &&
      (readPosterDetails(text) || (!isImageCommentaryOrInstruction(text) &&
        !CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text) && /\S.{12}/s.test(text)));
  });
  const reference = CONTEXT_REFERENCE.test(query) || POSTER_DELIVERY.test(query);
  const waitingForPhoto = photoOnly && (lastAssistant?.content === PHOTO_REQUIRED || lastAssistant?.content === CHOOSE_PHOTO);
  if (photoOnly && !waitingForPhoto) return undefined;

  const explicitMissing = MISSING_PERSON.test(query);
  const priorMissing = [...previous].reverse().find(turn => {
    const text = imageBriefText(turn.content);
    if (MISSING_PERSON.test(text) && !CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text) &&
        !isImageCommentaryOrInstruction(text)) return true;
    if (!readPosterDetails(text)) return false;
    const precedingReply = args.history.slice(0, args.history.indexOf(turn))
      .filter(message => message.role === "assistant").at(-1);
    return precedingReply?.content === DETAILS_REQUIRED || precedingReply?.content === PHOTO_REQUIRED ||
      precedingReply?.content === CHOOSE_PHOTO;
  });
  const newestIsOtherDesign = newestBrief && newestBrief !== priorMissing &&
    !MISSING_PERSON.test(imageBriefText(newestBrief.content)) &&
    POSTER.test(imageBriefText(newestBrief.content)) && DESIGN_REQUEST.test(imageBriefText(newestBrief.content));
  const refersToMissing = (reference || waitingForPhoto) && priorMissing && !newestIsOtherDesign;
  if (explicitMissing || refersToMissing || suppliesRequestedDetails) {
    const direct = confirmedDetails;
    const brief = direct
      ? { content: query, createdAt: undefined }
      : (reference || waitingForPhoto) && priorMissing ? priorMissing : undefined;
    const details = brief && readPosterDetails(brief.content);
    // A partial correction must never silently render the previous person's fields.
    const hasPartialFields = /^(?:name|last seen|age|height|contacts?)\s*:/im.test(query);
    const editsOldFacts = EDIT_CURRENT_POSTER.test(query) ||
      /\b(?:change|update|correct|replace|edit|fix|revise)\s+(?:(?:his|her|their|the)\s+)?(?:name|date|location|phone|contacts?|age|height|build|complexion)\b/i.test(query);
    if (!details || (!direct && (hasPartialFields || editsOldFacts))) return { kind: "ask", content: DETAILS_REQUIRED };

    // A historical portrait must come from the same brief or a later upload in
    // this thread. Direct briefs require an attachment in the same request.
    const uploadTurn = args.history.find(turn => turn.role === "user" && turn.createdAt === args.uploadAt);
    const explicitlyUsesPhoto = /\b(?:use|using|with|from)\s+(?:(?:the|my|this|our|his|her|their|uploaded|attached|original|brighter)\s+){0,4}(?:photo|picture|image|portrait)\b/i.test(query);
    const uploadMatches = !args.historicalImages ||
      (brief?.createdAt !== undefined && (args.uploadAt === brief.createdAt ||
        (explicitlyUsesPhoto && uploadTurn && uploadTurn.createdAt !== undefined &&
          uploadTurn.createdAt > brief.createdAt && uploadTurn === previous.at(-1))));
    if (!uploadMatches || photos.length === 0) return { kind: "ask", content: PHOTO_REQUIRED };
    if (photos.length !== 1) return { kind: "ask", content: CHOOSE_PHOTO };
    const photo = photos[0].dataUrl!;
    if (!RASTER_DATA_URL.test(photo)) return { kind: "ask", content: PHOTO_REQUIRED };
    return { kind: "missing_person", photo, details };
  }

  if (reference && !/\b(?:same|this|that|previous|earlier)\s+(?:design|poster|flyer|notice)\b/i.test(query)) {
    if (!newestBrief) return { kind: "ask", content: "What is the poster for, and what exact details should it include? No image credits were charged." };
    return {
      kind: "image",
      prompt: `Use the following user-provided brief as the source for names, dates, locations, and contact details. Omit details the user did not supply.\n\n${imageBriefText(newestBrief.content).slice(0, 8000)}\n\nLatest user instructions:\n${query}`,
    };
  }
  if (BARE_DESIGN.test(query)) {
    return { kind: "ask", content: "Yes. What is the design for, and what exact text should it include? Attach any photo or logo you want to use. No image credits were charged." };
  }
  return undefined;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, character => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
  })[character]!);
}

export function renderMissingPersonPoster(plan: Extract<ChatPosterPlan, { kind: "missing_person" }>): string {
  const { details, photo } = plan;
  const width = 1000;
  const text = (copy: string, y: number, size: number, color: string, bold = false) => {
    const fit = Math.min(size, Math.floor(1320 / Math.max(1, Array.from(copy).length)));
    return `<text x="500" y="${y}" text-anchor="middle" fill="${color}" font-size="${fit}"${bold ? ' font-weight="700"' : ""}>${escapeXml(copy)}</text>`;
  };
  let y = 830;
  const body: string[] = [
    text(details.name, 735, 74, "#142035", true),
    text("LAST SEEN", 785, 28, "#9e2336", true),
    text(details.lastSeen, y, 43, "#142035"),
  ];
  for (const [label, value] of details.description) {
    y += 51;
    body.push(text(`${label}: ${value}`, y, 39, "#142035"));
  }
  y += 45;
  const footer = y;
  body.push(text("PLEASE CONTACT", y += 58, 32, "#fff", true));
  for (const contact of details.contacts) body.push(text(contact, y += 54, 45, "#fff", true));
  const height = Math.max(y + 66, 1160);
  const editableBrief = [
      `Name: ${details.name}`,
    `Last seen: ${details.lastSeen}`,
    ...details.description.map(([label, value]) => `${label}: ${value}`),
    ...details.contacts.map(contact => `Contact: ${contact}`),
  ].join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <desc>${escapeXml(editableBrief)}</desc>
  <rect width="100%" height="100%" fill="#fffaf1"/>
  <rect width="100%" height="155" fill="#ad1732"/>
  <rect x="95" y="195" width="810" height="454" rx="20" fill="#ece8df"/>
  <image x="110" y="205" width="780" height="434" href="${photo}" preserveAspectRatio="xMidYMid meet"/>
  <rect y="${footer}" width="100%" height="${height - footer}" fill="#142035"/>
  <g font-family="Arial, sans-serif">${text("MISSING PERSON", 103, 78, "#fff", true)}${body.join("")}</g>
</svg>`;
}

export const MISSING_PERSON_POSTER_REPLY = "Here is your missing-person poster:";
