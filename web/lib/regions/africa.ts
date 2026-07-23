/**
 * Africa multi-region catalog — additive to DEFAULT_LOCALE (en-GH).
 * Used only when phase6.multi_region is enabled.
 */

export type AfricaRegionId =
  | "GH"
  | "NG"
  | "KE"
  | "ZA"
  | "UG"
  | "TZ"
  | "RW"
  | "CI"
  | "SN"
  | "EG";

export type AfricaRegionConfig = {
  id: AfricaRegionId;
  name: string;
  locale: string;
  timeZone: string;
  currency: string;
  paystackSupported: boolean;
  onboardingHint: string;
};

export const AFRICA_REGIONS: Record<AfricaRegionId, AfricaRegionConfig> = {
  GH: {
    id: "GH",
    name: "Ghana",
    locale: "en-GH",
    timeZone: "Africa/Accra",
    currency: "GHS",
    paystackSupported: true,
    onboardingHint: "Welcome — Giga3 is tuned for Ghana (GHS, GMT).",
  },
  NG: {
    id: "NG",
    name: "Nigeria",
    locale: "en-NG",
    timeZone: "Africa/Lagos",
    currency: "NGN",
    paystackSupported: true,
    onboardingHint: "Welcome — explore creators and learning across Nigeria.",
  },
  KE: {
    id: "KE",
    name: "Kenya",
    locale: "en-KE",
    timeZone: "Africa/Nairobi",
    currency: "KES",
    paystackSupported: true,
    onboardingHint: "Welcome — discover East African creators and study groups.",
  },
  ZA: {
    id: "ZA",
    name: "South Africa",
    locale: "en-ZA",
    timeZone: "Africa/Johannesburg",
    currency: "ZAR",
    paystackSupported: true,
    onboardingHint: "Welcome — Giga3 supports ZAR-ready commerce tooling.",
  },
  UG: {
    id: "UG",
    name: "Uganda",
    locale: "en-UG",
    timeZone: "Africa/Kampala",
    currency: "UGX",
    paystackSupported: false,
    onboardingHint: "Welcome — join communities and learning spaces in Uganda.",
  },
  TZ: {
    id: "TZ",
    name: "Tanzania",
    locale: "en-TZ",
    timeZone: "Africa/Dar_es_Salaam",
    currency: "TZS",
    paystackSupported: false,
    onboardingHint: "Welcome — explore GigaSocial and GigaLearn in Tanzania.",
  },
  RW: {
    id: "RW",
    name: "Rwanda",
    locale: "en-RW",
    timeZone: "Africa/Kigali",
    currency: "RWF",
    paystackSupported: false,
    onboardingHint: "Welcome — build with creators and classrooms in Rwanda.",
  },
  CI: {
    id: "CI",
    name: "Côte d’Ivoire",
    locale: "fr-CI",
    timeZone: "Africa/Abidjan",
    currency: "XOF",
    paystackSupported: false,
    onboardingHint: "Bienvenue — explorez Giga3 pour la création et l’apprentissage.",
  },
  SN: {
    id: "SN",
    name: "Senegal",
    locale: "fr-SN",
    timeZone: "Africa/Dakar",
    currency: "XOF",
    paystackSupported: false,
    onboardingHint: "Bienvenue — rejoignez la communauté Giga3.",
  },
  EG: {
    id: "EG",
    name: "Egypt",
    locale: "en-EG",
    timeZone: "Africa/Cairo",
    currency: "EGP",
    paystackSupported: false,
    onboardingHint: "Welcome — discover creators and AI learning in Egypt.",
  },
};

export const DEFAULT_AFRICA_REGION: AfricaRegionId = "GH";

export function getAfricaRegion(id?: string | null): AfricaRegionConfig {
  if (id && id in AFRICA_REGIONS) {
    return AFRICA_REGIONS[id as AfricaRegionId];
  }
  return AFRICA_REGIONS[DEFAULT_AFRICA_REGION];
}

export function listAfricaRegions(): AfricaRegionConfig[] {
  return Object.values(AFRICA_REGIONS);
}
