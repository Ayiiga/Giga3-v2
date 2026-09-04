/** Client tips for video prompts with text/logos/UI (mirror convex/mediaVideoPrompt.ts). */

const TEXT_OR_UI_PATTERN =
  /\b(logo|logos|text|title|caption|subtitle|typography|lettering|brand|branding|giga|app\b|ui\b|ux\b|screen|interface|website|slogan|headline|font|readable|spell(?:ed|ing)?|word(?:s)?|letter(?:s)?|nameplate|watermark|banner|poster)\b/i;

const DEVICE_UI_PATTERN =
  /\b(phone|smartphone|mobile app|dashboard|notification|mockup|app store|software|saas|tablet|laptop screen|computer screen)\b/i;

export function videoPromptNeedsTextGuard(userPrompt: string): boolean {
  const p = userPrompt.trim();
  if (!p) return false;
  if (TEXT_OR_UI_PATTERN.test(p) || DEVICE_UI_PATTERN.test(p)) return true;
  return /"[^"]{2,}"/.test(p) || /'[^']{2,}'/.test(p);
}

export const VIDEO_TEXT_TIP =
  "Prompts with logos, app UI, or readable words automatically get an English text frame first, then we animate it — for best results, upload your own frame with Start from an image.";
