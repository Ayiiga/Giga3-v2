export const SOCIAL_BOOST_COUNTRIES = [
  { code: "BJ", name: "Benin" },
  { code: "BF", name: "Burkina Faso" },
  { code: "CM", name: "Cameroon" },
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "GM", name: "The Gambia" },
  { code: "GH", name: "Ghana" },
  { code: "GN", name: "Guinea" },
  { code: "KE", name: "Kenya" },
  { code: "LR", name: "Liberia" },
  { code: "ML", name: "Mali" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "RW", name: "Rwanda" },
  { code: "SN", name: "Senegal" },
  { code: "SL", name: "Sierra Leone" },
  { code: "ZA", name: "South Africa" },
  { code: "TZ", name: "Tanzania" },
  { code: "TG", name: "Togo" },
  { code: "UG", name: "Uganda" },
] as const;

export type SocialBoostCountry = (typeof SOCIAL_BOOST_COUNTRIES)[number]["code"];

export function isSocialBoostCountry(value: string | null): value is SocialBoostCountry {
  return SOCIAL_BOOST_COUNTRIES.some((country) => country.code === value);
}
