/** Text requests about images must not enter a paid rendering pipeline. */
const TEXT_OUTPUTS = new Set([
  'feedback', 'critique', 'review', 'analysis', 'opinion', 'advice', 'idea', 'ideas',
  'tip', 'tips', 'instruction', 'instructions', 'prompt', 'prompts', 'wording',
  'caption', 'captions', 'copy', 'text', 'information', 'explanation', 'details',
]);
const OUTPUT_NOUN_RE = /\b(feedback|critique|review|analysis|opinion|advice|ideas?|tips?|instructions?|prompts?|wording|captions?|copy|text|information|explanation|details|logos?|posters?|flyers?|banners?|infographics?|invitations?|thumbnails?|certificates?|images?|pictures?|photos?|graphics?|portraits?|illustrations?|drawings?|sketches|brochures?|wallpapers?|icons?|stickers?|designs?)\b/gi;

export function isImageCommentaryOrInstruction(query: string): boolean {
  const request = query.trim().replace(
    /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?/i,
    '',
  );
  // Match the leading action, not instructional words inside a creative brief.
  if (/^(?:how|where|why|what|which|when)\b/i.test(request)) return true;
  if (/^(?:write|draft|compose|explain|describe|review|critique|analyse|analyze|evaluate|summari[sz]e|teach|brainstorm|suggest)\b/i.test(request)) return true;
  if (/^(?:show|tell|teach|guide|walk)\b(?:\s+(?:me|us))?\s+(?:how|where|why|what|which|whether|through|the steps)\b/i.test(request)) return true;

  const outputRequest = /^(?:give|provide|offer|share|send|create|generate)\s+([\s\S]+)/i.exec(request);
  if (!outputRequest) return false;
  const object = outputRequest[1];
  // Read the requested output before its purpose/content clause. In compounds,
  // “text logo” requests a logo; “flyer copy” requests copy. Modifiers such as
  // “AI”, “detailed” or “professional” do not need a fixed whitelist.
  const head = object.split(/\b(?:for|of|on|about|to|with|that|which|titled|saying|showing|depicting|featuring|containing|explaining|teaching)\b/i, 1)[0];
  const nouns = [...head.matchAll(OUTPUT_NOUN_RE)];
  const output = nouns.at(-1);
  if (!output) return false;
  if (output[1].toLowerCase() === 'copy') {
    const complement = /^\s+of\s+([\s\S]+)/i.exec(object.slice(output.index! + output[0].length));
    const copiedObject = complement ? [...complement[1].matchAll(OUTPUT_NOUN_RE)][0] : undefined;
    // Duplicating an image is a visual task; writing copy for one is prose.
    if (copiedObject && !TEXT_OUTPUTS.has(copiedObject[1].toLowerCase())) return false;
  }
  return TEXT_OUTPUTS.has(output[1].toLowerCase());
}
