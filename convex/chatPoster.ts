import { isImageCommentaryOrInstruction, isPosterRedesignRequest, posterRedesignLayout } from "./imageRequestIntent";

import { MISSING_PERSON_PLACEHOLDER_FALLBACK, missingPersonPlaceholderIndex } from "./posterPlaceholder";

export const POSTER_DESIGNS = { alert: "Alert", bulletin: "Bulletin" } as const;
export type PosterDesign = keyof typeof POSTER_DESIGNS;
export const POSTER_REDESIGN_HISTORY_LIMIT = 64;

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

// A short reply can accept a poster handoff without restating the asset name.
const POSTER_CONTINUATION = /^(?:please[ ,]+)?(?:yes|ok(?:ay)?|go ahead(?: and (?:generate|render|create|make|show|send) it)?|do it|continue|nothing has changed|still the same|(?:please )?(?:generate|render|create|make|show|send|give)(?: (?:me|us))? (?:it|(?:(?:the|my) missing[- ]person|the|my|an?|actual|real|redesigned|visual|poster) )*(?:poster|image|visual)(?: itself)?|(?:generate|render|create|make|show|send) it|where(?: is|'s) (?:it|(?:the|my) (?:image|poster)))(?:[, ]+(?:please|now|then|go ahead|do it))*[.!?]*$/i;
const STORED_POSTER_URL = /https:\/\/[\w-]+\.convex\.(?:cloud|site)\/api\/storage\/[\w-]+\s*$/;
const POSTER_HANDOFF_REPLY = /\b(?:missing[- ]person poster|(?:poster|visual image) (?:design|layout|itself)|(?:create|generate|redesign|render) (?:the|your|a|an|a new|an attractive) (?:[\w-]+ ){0,4}(?:poster|visual image))\b/i;

export function needsExtendedPosterHistory(query: string): boolean {
  const text = imageBriefText(query);
  return isPosterRedesignRequest(text) || POSTER_CONTINUATION.test(text);
}

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
  return needsExtendedPosterHistory(text) || EDIT_CURRENT_POSTER.test(text) || RESUME_POSTER.test(text) || WITHOUT_PHOTO.test(text) || (hasPhoto && isPhotoOnlyPosterFollowup(text)) ||
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
  | { kind: "missing_person"; photo?: string; details: PosterDetails; usedSavedPreview?: boolean; design?: PosterDesign }
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
  for (const [index, turn] of history.entries()) {
    if (turn.role === "assistant") {
      askedForPhoto = turn.content === PHOTO_REQUIRED || turn.content === CHOOSE_PHOTO;
      askedForDetails = turn.content === DETAILS_REQUIRED;
      continue;
    }
    if (turn.role !== "user") continue;
    const text = imageBriefText(turn.content);
    const missingBrief = MISSING_PERSON.test(text) && !isImageCommentaryOrInstruction(text);
    const details = missingBrief || askedForDetails || askedForPhoto ? readPosterDetails(text) : undefined;
    if (details || (missingBrief && !CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text) && !isPosterRedesignRequest(text) && !POSTER_CONTINUATION.test(text))) {
      matchingBrief = Boolean(details && samePerson(details.name, name));
      if (!matchingBrief) selected = undefined;
    }
    const next = history[index + 1];
    const renderedRedesign = posterRedesignLayout(text) && next?.role === "assistant" &&
      next.content.startsWith(MISSING_PERSON_POSTER_REPLY);
    if (matchingBrief && (details || renderedRedesign || (askedForPhoto && isPhotoOnlyPosterFollowup(text)))) {
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
  const redesign = isPosterRedesignRequest(query);
  const requestedLayout = posterRedesignLayout(query);
  const photos = (args.images ?? []).filter(a => a.dataUrl);
  if (!needsPosterHistory(query, !args.historicalImages && photos.length > 0)) return undefined;
  const lastAssistant = args.history.filter(turn => turn.role === "assistant").at(-1);
  const pendingPoster = isPosterClarification(lastAssistant?.content);
  const lastUser = args.history.filter(turn => turn.role === "user").at(-1);
  const lastUserText = imageBriefText(lastUser?.content ?? "");
  const posterHandoff = POSTER_CONTINUATION.test(query) && Boolean(lastAssistant &&
    (pendingPoster || lastAssistant.content.startsWith(MISSING_PERSON_POSTER_REPLY) ||
      lastAssistant.content.startsWith(MISSING_PERSON_PLACEHOLDER_FALLBACK) ||
      missingPersonPlaceholderIndex(lastAssistant.content) >= 0 ||
      (POSTER_HANDOFF_REPLY.test(lastAssistant.content) && MISSING_PERSON.test(lastAssistant.content))) &&
    (POSTER.test(lastUserText) || POSTER_CONTINUATION.test(lastUserText) || isPhotoOnlyPosterFollowup(lastUserText)));
  const resume = pendingPoster && (RESUME_POSTER.test(query) || WITHOUT_PHOTO.test(query));
  if (!photoOnly && !resume && !posterHandoff && isImageCommentaryOrInstruction(query) && !POSTER_DELIVERY.test(query)) return undefined;
  const confirmedDetails = readPosterDetails(query);
  const suppliesRequestedDetails = Boolean(confirmedDetails && pendingPoster);
  const completeMissingBrief = Boolean(confirmedDetails && MISSING_PERSON.test(query));
  if (!POSTER.test(query) && !suppliesRequestedDetails && !completeMissingBrief && !resume && !posterHandoff) {
    if (!photoOnly && (!photos.length || args.historicalImages) && EDIT_CURRENT_POSTER.test(query) &&
      lastAssistant?.content.startsWith(MISSING_PERSON_POSTER_REPLY)) {
      return { kind: "ask", content: DETAILS_REQUIRED };
    }
    if (!photoOnly) return undefined;
  }

  const previous = args.history.filter(turn => turn.role === "user");
  const newestBrief = [...previous].reverse().find(turn => {
    const text = imageBriefText(turn.content);
    return !isPhotoOnlyPosterFollowup(text) && !BARE_DESIGN.test(text) && !isPosterRedesignRequest(text) && !POSTER_CONTINUATION.test(text) &&
      (readPosterDetails(text) || (!isImageCommentaryOrInstruction(text) &&
        !CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text) && /\S.{12}/s.test(text)));
  });
  const reference = resume || posterHandoff || redesign || CONTEXT_REFERENCE.test(query) || POSTER_DELIVERY.test(query);
  const waitingForPhoto = photoOnly && !args.historicalImages && photos.length > 0 && pendingPoster;
  if (photoOnly && !waitingForPhoto) return undefined;

  const explicitMissing = MISSING_PERSON.test(query);
  const priorMissing = [...previous].reverse().find(turn => {
    const text = imageBriefText(turn.content);
    const details = readPosterDetails(text);
    if (MISSING_PERSON.test(text) && !isImageCommentaryOrInstruction(text) &&
        (details || (!CONTEXT_REFERENCE.test(text) && !POSTER_DELIVERY.test(text) && !isPosterRedesignRequest(text) && !POSTER_CONTINUATION.test(text)))) return true;
    if (!details) return false;
    const precedingReply = args.history.slice(0, args.history.indexOf(turn))
      .filter(message => message.role === "assistant").at(-1);
    return precedingReply?.content === DETAILS_REQUIRED || precedingReply?.content === PHOTO_REQUIRED ||
      precedingReply?.content === CHOOSE_PHOTO;
  });
  const newestIsOtherDesign = newestBrief && newestBrief !== priorMissing &&
    !MISSING_PERSON.test(imageBriefText(newestBrief.content)) &&
    POSTER.test(imageBriefText(newestBrief.content)) && DESIGN_REQUEST.test(imageBriefText(newestBrief.content));
  const completedHandoff = posterHandoff && !newestIsOtherDesign &&
    lastAssistant?.content.startsWith(MISSING_PERSON_POSTER_REPLY);
  if (completedHandoff && lastAssistant && STORED_POSTER_URL.test(lastAssistant.content)) {
    return { kind: "ask", content: lastAssistant.content };
  }
  const refersToMissing = (reference || waitingForPhoto) && priorMissing && !newestIsOtherDesign;
  if (explicitMissing || refersToMissing || suppliesRequestedDetails || resume || waitingForPhoto) {
    const direct = confirmedDetails;
    const brief = direct
      ? { content: query, createdAt: undefined }
      : (reference || waitingForPhoto) && priorMissing ? priorMissing : undefined;
    const details = brief && readPosterDetails(brief.content);
    // A partial correction must never silently render the previous person's fields.
    const hasPartialFields = /^(?:name|last seen|age|height|contacts?)\s*:/im.test(query);
    const editsOldFacts = (!requestedLayout && EDIT_CURRENT_POSTER.test(query)) ||
      /\b(?:change|update|correct|replace|edit|fix|revise)\s+(?:(?:his|her|their|the)\s+)?(?:name|date|location|phone|contacts?|age|height|build|complexion)\b/i.test(query);
    if (!details || (!direct && (hasPartialFields || editsOldFacts))) return { kind: "ask", content: DETAILS_REQUIRED };
    if (redesign && !requestedLayout && !direct) {
      return { kind: "ask", content: "Say “Redesign the poster in Alert” or “Redesign the poster in Bulletin.” To change the details, tap the pencil on the existing poster." };
    }

    const briefDesign = /^poster design[ \t]*:[ \t]*(alert|bulletin)[ \t]*$/im.exec(query + "\n" + (brief?.content ?? ""))?.[1]?.toLowerCase() as PosterDesign | undefined;
    const priorDetails = priorMissing && readPosterDetails(priorMissing.content);
    const samePriorBrief = priorDetails && samePerson(priorDetails.name, details.name);
    const posterHistoryAnchor = direct ? (samePriorBrief ? priorMissing : undefined) : brief;
    const latestPoster = posterHistoryAnchor && args.history.slice(args.history.indexOf(posterHistoryAnchor))
      .reverse().find(turn => turn.role === "assistant" && turn.content.startsWith(MISSING_PERSON_POSTER_REPLY));
    const previousDesign = /^Poster design: (Alert|Bulletin)\.$/m.exec(latestPoster?.content ?? "")?.[1];
    const currentDesign = previousDesign === "Bulletin" ? "bulletin" : previousDesign === "Alert" ? "alert" : briefDesign ?? "alert";
    const alternate = currentDesign === "bulletin" ? "alert" : "bulletin";
    const handoffLayout = posterHandoff && !completedHandoff ? posterRedesignLayout(lastUserText) : undefined;
    const layout = requestedLayout ?? handoffLayout;
    const selectedDesign = layout === "alternate" ? alternate : layout ?? (completedHandoff ? currentDesign : briefDesign);
    const freshPhoto = !args.historicalImages && photos.length > 0;
    const lastPosterRequest = latestPoster && args.history.slice(0, args.history.indexOf(latestPoster))
      .reverse().find(turn => turn.role === "user");
    const wasTextOnly = latestPoster?.content.includes("\n\nThis poster has no photo.") ||
      (lastPosterRequest && WITHOUT_PHOTO.test(lastPosterRequest.content));
    if (WITHOUT_PHOTO.test(query) || ((redesign || posterHandoff) && !freshPhoto && wasTextOnly)) {
      return { kind: "missing_person", details, design: selectedDesign };
    }

    // Fresh uploads take precedence. Recover a prior selection only from this
    // thread and only if it was tied to the same missing-person brief.
    const historyPhotos = args.historicalImages ? photos : [];
    const saved = (!direct || samePriorBrief)
      ? savedPosterPhotos(args.history, details.name, args.uploadAt, historyPhotos)
      : undefined;
    const uploadTurn = previous.at(-1);
    const explicitlyUsesPhoto = /\b(?:use|using|with|from)\s+(?:(?:the|my|this|that|our|his|her|their|uploaded|attached|original|brighter)\s+){0,4}(?:photo|picture|image|portrait)\b/i.test(query);
    const explicitRecentUpload = args.historicalImages && samePriorBrief &&
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
      if (posterHandoff && !layout && latestPoster &&
          STORED_POSTER_URL.test(latestPoster.content)) {
        return { kind: "ask", content: latestPoster.content };
      }
      if (redesign && lastPosterRequest && CANNOT_SEND_PHOTO.test(lastPosterRequest.content)) {
        return { kind: "missing_person", details, design: selectedDesign };
      }
      if ((redesign || posterHandoff) && latestPoster) {
        return { kind: "ask", content: "Tap the pencil on your previous poster to change its design using the saved photo." };
      }
      return CANNOT_SEND_PHOTO.test(query) ? { kind: "missing_person", details, design: selectedDesign } : { kind: "ask", content: PHOTO_REQUIRED };
    }
    if (source.urls.length !== 1) {
      return CANNOT_SEND_PHOTO.test(query) ? { kind: "missing_person", details, design: selectedDesign } : { kind: "ask", content: CHOOSE_PHOTO };
    }
    const [photo] = source.urls;
    if (!RASTER_DATA_URL.test(photo)) return { kind: "ask", content: PHOTO_REQUIRED };
    return { kind: "missing_person", photo, details, usedSavedPreview: source.preview, design: selectedDesign };
  }

  if (posterHandoff) {
    return { kind: "ask", content: "I couldn’t find a complete poster brief in this chat. If you have an earlier poster here, tap its pencil to update it." };
  }
  if (redesign) {
    return { kind: "ask", content: "Open the poster and tap the pencil to change its design. If you’re starting a new poster, send the details you want to use." };
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
  const { details, photo, design = "alert" } = plan;
  const bulletin = design === "bulletin";
  const compact = Boolean(photo && !bulletin);
  const ink = bulletin ? "#173445" : "#231a2a";
  const accent = bulletin ? "#17645a" : "#a51b3b";
  const muted = bulletin ? "#50636f" : "#655560";
  const paper = bulletin ? "#f1f5f3" : "#faf4ef";
  const text = (copy: string, x: number, y: number, size: number, color: string, weight = 400, spacing = 0) =>
    `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" letter-spacing="${spacing}">${escapeXml(copy)}</text>`;
  const rect = (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
  const lines = (copy: string, width: number, size: number, bold = false) => {
    const limit = Math.max(1, Math.floor(width / (size * (bold ? 0.68 : 0.62))));
    const parts: string[] = [];
    let line = "";
    for (const word of copy.split(/\s+/)) {
      const length = Array.from(word).length;
      if (line && Array.from(line).length + length + 1 > limit) {
        parts.push(line);
        line = "";
      }
      const letters = Array.from(word);
      while (letters.length > limit) parts.push(letters.splice(0, limit).join(""));
      line += (line ? " " : "") + letters.join("");
    }
    if (line) parts.push(line);
    return parts;
  };

  const photoY = 206;
  const photoHeight = compact ? 514 : 512;
  const x = compact ? 510 : 72;
  const width = 928 - x;
  let y = compact ? 262 : photo ? photoY + photoHeight + 90 : 254;
  const fields: string[] = [];
  const write = (copy: string, size: number, color: string, bold = false) => {
    for (const line of lines(copy, width, size, bold)) {
      fields.push(text(line, x, y, size, color, bold ? 700 : 400));
      y += Math.ceil(size * 1.18);
    }
  };
  write(details.name, compact ? 62 : 76, ink, true);
  y += 12;
  fields.push(rect(x, y, 64, 5, accent, 2));
  y += 49;
  fields.push(text("LAST SEEN", x, y, 23, accent, 700, 2.5));
  y += 43;
  write(details.lastSeen, 38, ink, true);
  const columnGap = 24;
  const columnWidth = (width - columnGap) / 2;
  for (let i = 0; i < details.description.length; i += 2) {
    const labelY = y + 19;
    const valueY = labelY + 36;
    let bottom = valueY;
    details.description.slice(i, i + 2).forEach(([label, value], index) => {
      const left = x + index * (columnWidth + columnGap);
      fields.push(text(label.toUpperCase(), left, labelY, 20, muted, 700, 1.5));
      const longestWord = Math.max(...value.split(/\s+/).map(word => Array.from(word).length));
      const size = Math.max(23, Math.min(29, Math.floor(columnWidth / (Math.max(1, longestWord) * 0.62))));
      const values = lines(value, columnWidth, size);
      values.forEach((line, row) => fields.push(text(line, left, valueY + row * 35, size, ink)));
      bottom = Math.max(bottom, valueY + values.length * 35);
    });
    y = bottom;
  }

  const footerY = Math.max(y + 29, photo ? photoY + photoHeight + 42 : 0);
  let contactY = footerY + 59;
  const contacts = [text("PLEASE CONTACT", 72, contactY, 24, "#f6d9d8", 700, 3)];
  for (const contact of details.contacts) {
    contactY += 46;
    for (const [index, line] of lines(contact, 856, 38, true).entries()) {
      if (index) contactY += 46;
      contacts.push(text(line, 72, contactY, 38, "#ffffff", 700));
    }
  }
  const height = contactY + 68;
  const editableBrief = [
    `Name: ${details.name}`,
    `Last seen: ${details.lastSeen}`,
    ...details.description.map(([label, value]) => `${label}: ${value}`),
    ...details.contacts.map(contact => `Contact: ${contact}`),
  ].join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${height}" viewBox="0 0 1000 ${height}" data-poster-design="${design}">
  <desc>${escapeXml(editableBrief)}</desc>
  ${rect(0, 0, 1000, height, paper)}
  ${rect(0, 0, 1000, 154, bulletin ? ink : accent)}
  ${rect(0, 150, 1000, 5, bulletin ? "#7ecbb9" : "#ef977c")}
  ${photo ? `${rect(56, photoY - 10, compact ? 414 : 888, photoHeight + 20, bulletin ? "#dce8e3" : "#f0e2da", 16)}
  <image x="66" y="${photoY}" width="${compact ? 394 : 868}" height="${photoHeight}" href="${photo}" preserveAspectRatio="xMidYMid meet"/>` : ""}
  ${rect(0, footerY, 1000, height - footerY, ink)}
  <g font-family="Arial, sans-serif">
    ${text("MISSING PERSON", 72, 101, 69, "#ffffff", 700, 1.5)}
    ${fields.join("")}
    ${contacts.join("")}
  </g>
</svg>`;
}

export const MISSING_PERSON_POSTER_REPLY = "Here is your missing-person poster:";

export function missingPersonPosterReply(plan: Extract<ChatPosterPlan, { kind: "missing_person" }>, url: string): string {
  const design = plan.design ? `\n\nPoster design: ${POSTER_DESIGNS[plan.design]}.` : "";
  const note = plan.usedSavedPreview ? "\n\nI used the saved photo preview from this chat."
    : plan.design && !plan.photo ? "\n\nThis poster has no photo." : "";
  return `${MISSING_PERSON_POSTER_REPLY}${design}${note}\n\n${url}`;
}
