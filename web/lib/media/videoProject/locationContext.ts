import type { LocationRef } from "@/lib/media/videoProject/types";

/** Creative visualization hints — not factual claims about real places. */
const GHANA_LOCATION_HINTS: Record<string, string> = {
  accra:
    "Creative visualization of a coastal West African capital city: warm humid climate, tropical vegetation, mixed modern and local architecture, busy urban streets, open skies. Treat as fictional future or stylized scene unless user states otherwise.",
  kumasi:
    "Creative visualization of a Ghanaian inland city: warm climate, regional urban character, market and residential textures. Stylized, not a factual documentary claim.",
  tamale:
    "Creative visualization of northern Ghana urban environment: dry-season warmth, open horizons, regional building patterns. Stylized creative scene.",
};

const COUNTRY_HINTS: Record<string, string> = {
  ghana:
    "West African setting with tropical climate cues, diverse urban and rural textures, respectful local visual context. Present as AI-generated creative visualization, not verified documentary footage.",
};

export function buildLocationPromptContext(location: LocationRef): string {
  const city = location.city?.trim().toLowerCase();
  const country = location.country?.trim().toLowerCase();
  const region = location.region?.trim();
  const parts: string[] = [];

  if (country && COUNTRY_HINTS[country]) {
    parts.push(COUNTRY_HINTS[country]);
  }
  if (city && GHANA_LOCATION_HINTS[city]) {
    parts.push(GHANA_LOCATION_HINTS[city]);
  } else if (city && country) {
    parts.push(
      `Creative visualization set in ${city}${region ? `, ${region}` : ""}, ${location.country}. Use appropriate climate, vegetation, and architecture cues without stereotyping or inventing specific factual claims.`
    );
  } else if (location.environmentNote?.trim()) {
    parts.push(location.environmentNote.trim());
  }

  if (parts.length === 0) return "";
  return `${parts.join(" ")} Label as AI-generated visualization when depicting real places in fictional scenarios.`;
}

export function parseLocationFromPrompt(prompt: string): LocationRef | null {
  const lower = prompt.toLowerCase();
  const ref: LocationRef = {};

  if (/\bghana\b/.test(lower)) ref.country = "Ghana";
  if (/\baccra\b/.test(lower)) {
    ref.city = "Accra";
    ref.region = ref.region ?? "Greater Accra";
    ref.country = ref.country ?? "Ghana";
  }
  if (/\bkumasi\b/.test(lower)) {
    ref.city = "Kumasi";
    ref.country = ref.country ?? "Ghana";
  }
  if (/\btamale\b/.test(lower)) {
    ref.city = "Tamale";
    ref.country = ref.country ?? "Ghana";
  }

  return ref.country || ref.city ? ref : null;
}
