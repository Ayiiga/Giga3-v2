/**
 * Media capability routing for Giga3 AI Chat — honest handoffs to Media Studio & GigaEdit.
 * Mirrors the researchCapabilities pattern: detect intent → system prompt addon.
 */

export const MEDIA_CAPABILITY_IDS = [
  "none",
  "tools_overview",
  "image_edit_request",
  "image_analyze_in_chat",
  "video_timeline_edit",
  "video_generate",
  "video_file_attached",
  "gigasocial_template",
] as const;

export type MediaCapabilityId = (typeof MEDIA_CAPABILITY_IDS)[number];

export type MediaSessionTools = {
  /** Media Studio image tab — generate, edit, enhance, backgrounds, etc. */
  imageStudio: boolean;
  /** Media Studio video tab + Video AI — text/image-to-video clips */
  videoStudio: boolean;
  /** GigaEdit — trim, merge, captions, overlays, export on-device */
  gigaEdit: boolean;
  /** Chat text-to-image generation (no pixel edit of uploads in chat) */
  chatImageGenerate: boolean;
  /** Chat vision — describe/analyze uploaded images (not pixel editing) */
  chatImageAnalyze: boolean;
};

export type MediaPromptContext = {
  hasImageAttachment?: boolean;
  hasVideoAttachment?: boolean;
  /** When an image attachment has a fetchable URL for Media Studio deep links */
  sourceImageUrl?: string;
  tools?: MediaSessionTools;
};

/** Default tools exposed in the Giga3 web app session. */
export function defaultMediaSessionTools(): MediaSessionTools {
  return {
    imageStudio: true,
    videoStudio: true,
    gigaEdit: true,
    chatImageGenerate: true,
    chatImageAnalyze: true,
  };
}

const MEDIA_TOOLS_QUESTION_RE =
  /\b(can you|do you|are you able to|could you|does giga3)\b[\s\S]{0,48}\b(edit|work with|handle|modify|change|enhance|create|generate|make|support)\b[\s\S]{0,48}\b(video|videos|picture|pictures|photo|photos|image|images|media|files?)\b/i;

const MEDIA_TOOLS_QUESTION_ALT_RE =
  /\b(edit (videos?|pictures?|photos?|images?) (here|in chat|on giga3|with giga3)|can you edit videos or pictures)\b/i;

const IMAGE_EDIT_INTENT_RE =
  /\b(remove background|background removal|replace background|upscale|enhance (this )?(photo|image|picture)|retouch|object removal|inpaint|color correct|relight|crop|resize|rotate|add text to (this )?(image|photo)|edit (this |my |the )?(photo|image|picture|pic))\b/i;

const VIDEO_EDIT_INTENT_RE =
  /\b(trim|cut|merge|join|caption|subtitle|transition|overlay|crop (this )?video|edit (this |my |the )?video|add music to (this )?video)\b/i;

const VIDEO_GENERATE_INTENT_RE =
  /\b(generate|create|make|produce)\b[\s\S]{0,32}\b(video|clip|reel|short|animation)\b/i;

const GIGASOCIAL_TEMPLATE_INTENT_RE =
  /\b(make|create|generate|produce|remix)\b[\s\S]{0,40}\b(like|similar to|inspired by|based on)\b[\s\S]{0,40}\b(this )?(gigasocial )?(post|video|clip|reel|template)\b/i;

const GIGASOCIAL_TEMPLATE_ALT_RE =
  /\b(use (this )?(gigasocial )?post as (a )?template|gigasocial template|use as template)\b/i;

export function detectMediaToolsQuestion(query: string): boolean {
  const q = query.trim();
  return MEDIA_TOOLS_QUESTION_RE.test(q) || MEDIA_TOOLS_QUESTION_ALT_RE.test(q);
}

export function detectImageEditIntent(query: string): boolean {
  return IMAGE_EDIT_INTENT_RE.test(query.trim());
}

export function detectVideoEditIntent(query: string): boolean {
  return VIDEO_EDIT_INTENT_RE.test(query.trim());
}

export function detectVideoGenerateIntent(query: string): boolean {
  return VIDEO_GENERATE_INTENT_RE.test(query.trim());
}

export function detectGigaSocialTemplateIntent(query: string): boolean {
  const q = query.trim();
  return GIGASOCIAL_TEMPLATE_INTENT_RE.test(q) || GIGASOCIAL_TEMPLATE_ALT_RE.test(q);
}

export function isVideoAttachment(mimeType?: string, name?: string): boolean {
  if (mimeType && /^video\//i.test(mimeType)) return true;
  if (name && /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name)) return true;
  return false;
}

export function resolveMediaCapability(args: {
  query: string;
  hasImageAttachment?: boolean;
  hasVideoAttachment?: boolean;
}): MediaCapabilityId {
  const { query, hasImageAttachment, hasVideoAttachment } = args;

  if (hasVideoAttachment && !hasImageAttachment) {
    return "video_file_attached";
  }

  if (detectMediaToolsQuestion(query)) {
    return "tools_overview";
  }

  if (detectGigaSocialTemplateIntent(query)) {
    return "gigasocial_template";
  }

  if (detectVideoEditIntent(query)) {
    return "video_timeline_edit";
  }

  if (detectVideoGenerateIntent(query) && !hasVideoAttachment) {
    return "video_generate";
  }

  if (detectImageEditIntent(query) || (hasImageAttachment && /\bedit\b/i.test(query))) {
    return hasImageAttachment ? "image_edit_request" : "image_edit_request";
  }

  if (hasImageAttachment && !detectImageEditIntent(query)) {
    return "image_analyze_in_chat";
  }

  return "none";
}

function buildMediaStudioImageUrl(action: string, sourceUrl?: string): string {
  const params = new URLSearchParams({
    tab: "image",
    category: "anime_art",
    template: "ai-images",
    prompt: "Edit or enhance this image based on your instructions.",
    action,
  });
  if (sourceUrl?.trim()) {
    params.set("source", sourceUrl.trim());
  }
  return `/media?${params.toString()}`;
}

const MEDIA_STUDIO_VIDEO_URL = "/media?tab=video";
const GIGAEDIT_URL = "/gigaedit/";
const MEDIA_STUDIO_IMAGE_URL = "/media?tab=image";
const GIGASOCIAL_TEMPLATES_URL = "/gigasocial/?tab=discover&view=templates";

const MEDIA_SAFETY_RULES = [
  "Media safety (mandatory):",
  "- Never claim an edit, generation, or export completed unless the relevant Giga3 tool actually performed it.",
  "- Chat can analyze/describe uploaded images and generate new images from text — it cannot directly pixel-edit an uploaded file in this thread.",
  "- Preserve the user's original media unless they explicitly request destructive editing.",
  "- Do not remove watermarks, copyright notices, or ownership metadata without clear authorization.",
  "- Refuse deceptive edits (impersonation, fabricated evidence, misleading manipulation). Offer a safe alternative.",
  "- Apply Giga3 privacy, copyright, and content policies to all media workflows.",
].join("\n");

const UPLOAD_PRIVACY_GUIDANCE = [
  "Upload privacy:",
  "- Files you attach in chat are used to fulfill your request and routed to Giga3 tools you choose.",
  "- Prefer Media Studio or GigaEdit for edits so processing stays in the dedicated media workflow.",
  "- Avoid uploading sensitive ID documents or private data unless necessary; delete local copies you no longer need.",
].join("\n");

export function mediaToolsOverviewTemplate(tools: MediaSessionTools): string {
  const lines = [
    "Absolutely! 🎨📸🎬 I can help you work with pictures and videos.",
    "",
    "Upload your photo or video and tell me what you'd like to change. Depending on the tools available in this session, I can help with things such as:",
    "",
    "• Background removal or replacement",
    "• Image enhancement and cleanup",
    "• Lighting and color improvements",
    "• Cropping, resizing, and rotation",
    "• Adding or changing text",
    "• Social media thumbnails and graphics",
    "• Video trimming and basic editing",
    "• Captions, transitions, and effects",
    "• Creative transformations and AI-generated visuals",
    "",
    "Just upload your media and describe the result you want. I'll guide you to the appropriate Giga3 AI editing tool.",
  ];

  if (tools.imageStudio) {
    lines.push("", `Image tools → [Media Studio](${MEDIA_STUDIO_IMAGE_URL})`);
  }
  if (tools.videoStudio) {
    lines.push(`Video generation → [Media Studio Video](${MEDIA_STUDIO_VIDEO_URL})`);
  }
  if (tools.gigaEdit) {
    lines.push(`Video editing (trim, captions, merge) → [GigaEdit](${GIGAEDIT_URL})`);
  }

  lines.push("", UPLOAD_PRIVACY_GUIDANCE);

  return lines.join("\n");
}

export function mediaSystemPromptAddon(
  capability: MediaCapabilityId,
  context: MediaPromptContext = {}
): string {
  if (capability === "none") return "";

  const tools = context.tools ?? defaultMediaSessionTools();
  const sourceUrl = context.sourceImageUrl?.trim();
  const editLink = tools.imageStudio
    ? buildMediaStudioImageUrl("edit", sourceUrl)
    : null;
  const removeBgLink = tools.imageStudio
    ? buildMediaStudioImageUrl("remove-bg", sourceUrl)
    : null;

  const parts: string[] = ["Giga3 AI media tools (capability-aware):", MEDIA_SAFETY_RULES];

  switch (capability) {
    case "tools_overview":
      parts.push(
        "The user is asking what picture/video editing Giga3 can do.",
        "Respond warmly and concisely using this structure (adapt wording naturally, keep it truthful):",
        mediaToolsOverviewTemplate(tools),
        "Do not claim chat alone performs pixel edits. Point to Media Studio for image edits and GigaEdit for timeline video edits.",
        UPLOAD_PRIVACY_GUIDANCE
      );
      break;

    case "image_edit_request":
      parts.push(
        "The user wants to edit an image.",
        context.hasImageAttachment
          ? "An image is attached — you may analyze/describe it in chat, but pixel edits run in Media Studio, not in this thread."
          : "No image attached yet — ask them to upload the photo first.",
        tools.imageStudio
          ? `Guide them to Media Studio: ${editLink ? `[Edit in Media Studio](${editLink})` : `[Media Studio](${MEDIA_STUDIO_IMAGE_URL})`}.`
          : "Image editing tools are not available in this session — explain that honestly.",
        removeBgLink
          ? `Background removal: [Remove background](${removeBgLink}).`
          : "",
        "Never say the edit is done until they run the tool and confirm the result."
      );
      break;

    case "image_analyze_in_chat":
      parts.push(
        "An image is attached for analysis (Vision).",
        tools.chatImageAnalyze
          ? "You may describe, OCR, and answer questions about the image."
          : "Vision analysis may be limited in this session — say so if you cannot process the image.",
        "If they want pixel edits (background, upscale, retouch), direct them to Media Studio — chat does not modify the file.",
        editLink ? `[Edit in Media Studio](${editLink})` : `[Media Studio](${MEDIA_STUDIO_IMAGE_URL})`
      );
      break;

    case "video_timeline_edit":
      parts.push(
        "The user wants timeline video editing (trim, cut, merge, captions, effects).",
        tools.gigaEdit
          ? `Chat cannot trim or caption video files directly. Guide them to [GigaEdit](${GIGAEDIT_URL}) to import their clip and edit on-device.`
          : "Video timeline editing is not available in this session.",
        "Do not claim the video was edited in chat."
      );
      break;

    case "video_generate":
      parts.push(
        "The user wants AI video generation.",
        tools.videoStudio
          ? `Guide them to [Media Studio Video](${MEDIA_STUDIO_VIDEO_URL}) or [Video AI](/video/) for text/image-to-video clips (5–15s per scene).`
          : "Video generation is not available in this session.",
        "Chat does not render video files inline."
      );
      break;

    case "video_file_attached":
      parts.push(
        "A video file is attached.",
        "Chat cannot visually analyze video pixels. Suggest: (1) export key frames as images for Vision analysis in chat, or (2) import the video into GigaEdit for editing.",
        tools.gigaEdit ? `[Open GigaEdit](${GIGAEDIT_URL})` : "",
        tools.videoStudio ? `[Media Studio Video](${MEDIA_STUDIO_VIDEO_URL}) for AI clip generation.` : ""
      );
      break;

    case "gigasocial_template":
      parts.push(
        "The user wants to create content inspired by a GigaSocial post template.",
        "Workflow:",
        "1) Confirm the post is eligible — creator must allow templates (public, fans, or owner-only).",
        "2) Ask what new topic or idea they want if they have not provided one.",
        "3) Explain that Giga3 analyzes structure/style only — never copies the original media, voice, music, watermarks, or likeness.",
        "4) Guide them to GigaSocial → Use as Template, or browse [Creative Templates](" + GIGASOCIAL_TEMPLATES_URL + ").",
        "5) After generation, they can preview, edit in Media Studio or GigaEdit, export, or publish a new original post.",
        "Include attribution when appropriate: \"Inspired by a GigaSocial template by @creator.\"",
        "Refuse if the request would impersonate someone, remove watermarks, or reuse copyrighted audio without rights."
      );
      break;
  }

  return parts.filter(Boolean).join("\n\n");
}
