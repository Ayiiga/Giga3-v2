import { isImageCommentaryOrInstruction } from "./imageRequestIntent";

type Turn = { role: string; content: string; createdAt?: number };

const MISSING_PERSON = /\bmissing[- ](?:person|child|boy|girl|man|woman|teen(?:ager)?)\b/i;
const POSTER = /\b(?:poster|flyer|notice)\b/i;
const DESIGN_REQUEST = /\b(?:design|create|make|generate|render|give|send|show|want|need|update|correct|edit|fix|revise|change)\b/i;
const CONTEXT_REFERENCE = /\b(?:use|using|based on|with)\s+(?:(?:the|my|our|these|those|this)\s+)?(?:information|info|details|brief|content|text|copy|words|instructions)(?:\s+(?:above|earlier|provided|(?:I|we|you) (?:gave|shared|sent|provided|uploaded|attached)))\b|\b(?:above|earlier|previous)\s+(?:information|info|details|brief|content|text|copy|instructions)\b|\b(?:same|this|that|previous|earlier)\s+(?:design|poster|flyer|notice)\b/i;
const BARE_DESIGN = /^(?:(?:yes|please)[,\s]+)*(?:(?:can|could|would|will) you\s+)?(?:please\s+)?(?:design|create|make|generate|render|produce|give (?:me|us))\s+(?:(?:a|an|me|us|my|our|the)\s+)?(?:(?:beautiful|good|nice|clean|professional|promotional|bright|clear|custom|original|new)\s+){0,5}(?:poster|flyer|banner)(?:\s+please)?[.?!]*$/i;
const RESUME_POSTER = /^(?:please[ ,]+)?(?:i(?:(?: have|['’]ve)? already (?:sent|shared|uploaded|attached|provided)| (?:can['’]t|cannot|can not) (?:send(?:ing)?|attach|upload|resend))\b|(?:please )?use what i (?:already )?(?:sent|shared|uploaded|attached|provided)\b)/i;
const WITHOUT_PHOTO = /\b(?:without (?:a |an |the )?(?:photo|picture|image|portrait)|(?:please )?(?:skip|omit|leave out) the (?:photo|picture|image)|text[- ]only poster)\b/i;
const CANNOT_SEND_PHOTO = /\b(?:can['’]t|cannot|can not) (?:send|attach|upload|resend) (?:you )?(?:(?:any|another|the|a|an) )?(?:photo|picture|image|portrait)\b/i;
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
  return /^(?:analy[sz]e (?:this image|the uploaded files)|(?:please\s+)?use (?:this|that)(?: one)?|(?:here is|here's|use) (?:the|this|my) (?:photo|picture|image)(?: for (?:the|this) (?:poster|flyer))?|photo attached)[.!?]*$/i.test(imageBriefText(query));
}

export function needsPosterHistory(query: string, hasPhoto = false): boolean {
  const text = imageBriefText(query);
  return EDIT_CURRENT_POSTER.test(text) || RESUME_POSTER.test(text) || WITHOUT_PHOTO.test(text) || (hasPhoto && isPhotoOnlyPosterFollowup(text)) ||
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
  | { kind: "missing_person"; photo?: string; details: PosterDetails; usedSavedPreview?: boolean }
  | { kind: "image"; prompt: string };

function isPosterClarification(content?: string): boolean {
  return content === PHOTO_REQUIRED || content === CHOOSE_PHOTO || content === DETAILS_REQUIRED;
}

function samePerson(name: string, other: string): boolean {
  const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
  return normalize(name) === normalize(other);
}

function savedPosterPhotos(
  history: Turn[],
  name: string,
  uploadAt: number | undefined,
  photos: Array<{ dataUrl?: string }>
): { urls: string[]; preview: boolean } | undefined {
  let matchingBrief = false;
  let askedForPhoto = false;
  let askedForDetails = false;
  let selected: { urls: string[]; preview: boolean } | undefined;
  for (const turn of history) {
    if (turn.role === "assistant") {
      askedForPhoto = turn.content === PHOTO_REQUIRED || turn.content === CHOOSE_PHOTO;
      askedForDetails = turn.content === DETAILS_REQUIRED;
      continue;
    }
    if (turn.role !== "user") continue;
    const text = imageBriefText(turn.content);
    const missingBrief = MISSING_PERSON.test(text) && !isImageCommentaryOrInstruction(text);
    const details = missingBrief || askedForDetails || askedForPhoto ? readPosterDetails(text) : undefined;
    if (details || (missingBrief && !CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text))) {
      matchingBrief = Boolean(details && samePerson(details.name, name));
      if (!matchingBrief) selected = undefined;
    }
    if (matchingBrief && (details || (askedForPhoto && isPhotoOnlyPosterFollowup(text)))) {
      const hasSource = uploadAt !== undefined && turn.createdAt === uploadAt && photos.length > 0;
      const previews = [...turn.content.matchAll(/!\[[^\]\n]*\]\((data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]{1,70000})\)/gi)]
        .map(match => match[1]);
      if (hasSource) selected = { urls: photos.map(photo => photo.dataUrl!).filter(Boolean), preview: false };
      else if (previews.length) selected = { urls: previews, preview: true };
    }
    if (matchingBrief && WITHOUT_PHOTO.test(text)) selected = undefined;
    askedForPhoto = false;
    askedForDetails = false;
  }
  return selected;
}

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
  const lastAssistant = args.history.filter(turn => turn.role === "assistant").at(-1);
  const pendingPoster = isPosterClarification(lastAssistant?.content);
  const resume = pendingPoster && (RESUME_POSTER.test(query) || WITHOUT_PHOTO.test(query));
  if (!photoOnly && !resume && isImageCommentaryOrInstruction(query) && !POSTER_DELIVERY.test(query)) return undefined;
  const confirmedDetails = readPosterDetails(query);
  const suppliesRequestedDetails = Boolean(confirmedDetails && pendingPoster);
  const completeMissingBrief = Boolean(confirmedDetails && MISSING_PERSON.test(query));
  if (!POSTER.test(query) && !suppliesRequestedDetails && !completeMissingBrief && !resume) {
    if (!photoOnly && (!photos.length || args.historicalImages) && EDIT_CURRENT_POSTER.test(query) &&
      lastAssistant?.content.startsWith(MISSING_PERSON_POSTER_REPLY)) {
      return { kind: "ask", content: DETAILS_REQUIRED };
    }
    if (!photoOnly) return undefined;
  }

  const previous = args.history.filter(turn => turn.role === "user");
  const newestBrief = [...previous].reverse().find(turn => {
    const text = imageBriefText(turn.content);
    return !isPhotoOnlyPosterFollowup(text) && !BARE_DESIGN.test(text) &&
      (readPosterDetails(text) || (!isImageCommentaryOrInstruction(text) &&
        !CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text) && /\S.{12}/s.test(text)));
  });
  const reference = resume || CONTEXT_REFERENCE.test(query) || POSTER_DELIVERY.test(query);
  const waitingForPhoto = photoOnly && !args.historicalImages && photos.length > 0 && pendingPoster;
  if (photoOnly && !waitingForPhoto) return undefined;

  const explicitMissing = MISSING_PERSON.test(query);
  const priorMissing = [...previous].reverse().find(turn => {
    const text = imageBriefText(turn.content);
    const details = readPosterDetails(text);
    if (MISSING_PERSON.test(text) && !isImageCommentaryOrInstruction(text) &&
        (details || (!CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text)))) return true;
    if (!details) return false;
    const precedingReply = args.history.slice(0, args.history.indexOf(turn))
      .filter(message => message.role === "assistant").at(-1);
    return precedingReply?.content === DETAILS_REQUIRED || precedingReply?.content === PHOTO_REQUIRED ||
      precedingReply?.content === CHOOSE_PHOTO;
  });
  const newestIsOtherDesign = newestBrief && newestBrief !== priorMissing &&
    !MISSING_PERSON.test(imageBriefText(newestBrief.content)) &&
    POSTER.test(imageBriefText(newestBrief.content)) && DESIGN_REQUEST.test(imageBriefText(newestBrief.content));
  const refersToMissing = (reference || waitingForPhoto) && priorMissing && !newestIsOtherDesign;
  if (explicitMissing || refersToMissing || suppliesRequestedDetails || resume || waitingForPhoto) {
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

    if (WITHOUT_PHOTO.test(query)) return { kind: "missing_person", details };

    // Fresh uploads take precedence. Recover a prior selection only from this
    // thread and only if it was tied to the same missing-person brief.
    const priorDetails = priorMissing && readPosterDetails(priorMissing.content);
    const historyPhotos = args.historicalImages ? photos : [];
    const saved = (!direct || (priorDetails && samePerson(priorDetails.name, details.name)))
      ? savedPosterPhotos(args.history, details.name, args.uploadAt, historyPhotos)
      : undefined;
    const uploadTurn = previous.at(-1);
    const explicitlyUsesPhoto = /\b(?:use|using|with|from)\s+(?:(?:the|my|this|that|our|his|her|their|uploaded|attached|original|brighter)\s+){0,4}(?:photo|picture|image|portrait)\b/i.test(query);
    const explicitRecentUpload = args.historicalImages && priorDetails && samePerson(priorDetails.name, details.name) &&
      args.uploadAt !== undefined &&
      uploadTurn?.createdAt === args.uploadAt &&
      priorMissing?.createdAt !== undefined && args.uploadAt > priorMissing.createdAt &&
      explicitlyUsesPhoto;
    const source = !args.historicalImages && photos.length
      ? { urls: photos.map(photo => photo.dataUrl!), preview: false }
      : explicitRecentUpload && historyPhotos.length
        ? { urls: historyPhotos.map(photo => photo.dataUrl!), preview: false }
        : saved;
    if (!source?.urls.length) {
      return CANNOT_SEND_PHOTO.test(query) ? { kind: "missing_person", details } : { kind: "ask", content: PHOTO_REQUIRED };
    }
    if (source.urls.length !== 1) {
      return CANNOT_SEND_PHOTO.test(query) ? { kind: "missing_person", details } : { kind: "ask", content: CHOOSE_PHOTO };
    }
    const [photo] = source.urls;
    if (!RASTER_DATA_URL.test(photo)) return { kind: "ask", content: PHOTO_REQUIRED };
    return { kind: "missing_person", photo, details, usedSavedPreview: source.preview };
  }

  if (reference && !resume && !/\b(?:same|this|that|previous|earlier)\s+(?:design|poster|flyer|notice)\b/i.test(query)) {
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
  const top = photo ? 0 : 485;
  let y = 830 - top;
  const body: string[] = [
    text(details.name, 735 - top, 74, "#142035", true),
    text("LAST SEEN", 785 - top, 28, "#9e2336", true),
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
  const height = Math.max(y + 66, photo ? 1160 : 760);
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
  ${photo ? `<rect x="95" y="195" width="810" height="454" rx="20" fill="#ece8df"/>
  <image x="110" y="205" width="780" height="434" href="${photo}" preserveAspectRatio="xMidYMid meet"/>` : ""}
  <rect y="${footer}" width="100%" height="${height - footer}" fill="#142035"/>
  <g font-family="Arial, sans-serif">${text("MISSING PERSON", 103, 78, "#fff", true)}${body.join("")}</g>
</svg>`;
}

export const MISSING_PERSON_POSTER_REPLY = "Here is your missing-person poster:";

export function missingPersonPosterReply(plan: Extract<ChatPosterPlan, { kind: "missing_person" }>, url: string): string {
  const note = plan.usedSavedPreview ? "\n\nI used the saved photo preview from this chat." : "";
  return `${MISSING_PERSON_POSTER_REPLY}${note}\n\n${url}`;
}
