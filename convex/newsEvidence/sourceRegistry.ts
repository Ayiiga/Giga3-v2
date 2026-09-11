/**
 * Configurable Ghana/Africa news source registry with trust tiers.
 * Tier 1 = official primary; Tier 4 = social/user-generated.
 */

export type SourceTier = 1 | 2 | 3 | 4;

export type SourceRegistryEntry = {
  id: string;
  publisher: string;
  domains: readonly string[];
  tier: SourceTier;
  region: "ghana" | "africa" | "international";
  notes?: string;
};

export const GHANA_NEWS_SOURCE_REGISTRY: readonly SourceRegistryEntry[] = [
  {
    id: "gov_gh",
    publisher: "Government of Ghana",
    domains: ["ghana.gov.gh", "presidency.gov.gh", "parliament.gh"],
    tier: 1,
    region: "ghana",
  },
  {
    id: "bank_of_ghana",
    publisher: "Bank of Ghana",
    domains: ["bog.gov.gh"],
    tier: 1,
    region: "ghana",
  },
  {
    id: "ghana_stats",
    publisher: "Ghana Statistical Service",
    domains: ["statsghana.gov.gh"],
    tier: 1,
    region: "ghana",
  },
  {
    id: "ghana_health",
    publisher: "Ghana Health Service",
    domains: ["ghs.gov.gh"],
    tier: 1,
    region: "ghana",
  },
  {
    id: "electoral_commission",
    publisher: "Electoral Commission of Ghana",
    domains: ["ec.gov.gh"],
    tier: 1,
    region: "ghana",
  },
  {
    id: "ghana_police",
    publisher: "Ghana Police Service",
    domains: ["police.gov.gh"],
    tier: 1,
    region: "ghana",
  },
  {
    id: "graphic_online",
    publisher: "Graphic Online",
    domains: ["graphic.com.gh"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "myjoyonline",
    publisher: "MyJoyOnline",
    domains: ["myjoyonline.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "citinewsroom",
    publisher: "Citi Newsroom",
    domains: ["citinewsroom.com", "citifmonline.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "3news",
    publisher: "3News",
    domains: ["3news.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "ghanaweb",
    publisher: "GhanaWeb",
    domains: ["ghanaweb.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "ghana_news_agency",
    publisher: "Ghana News Agency",
    domains: ["gna.org.gh"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "tv3",
    publisher: "TV3 Ghana",
    domains: ["tv3network.com", "3news.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "pulse_ghana",
    publisher: "Pulse Ghana",
    domains: ["pulse.com.gh", "pulse.ng"],
    tier: 3,
    region: "ghana",
  },
  {
    id: "bft",
    publisher: "Business & Financial Times",
    domains: ["thebftonline.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "daily_guide",
    publisher: "Daily Guide Network",
    domains: ["dailyguidenetwork.com"],
    tier: 3,
    region: "ghana",
  },
  {
    id: "starr_fm",
    publisher: "Starr FM",
    domains: ["starrfm.com.gh"],
    tier: 3,
    region: "ghana",
  },
  {
    id: "asaase",
    publisher: "Asaase Radio",
    domains: ["asaaseradio.com"],
    tier: 3,
    region: "ghana",
  },
  {
    id: "joynews",
    publisher: "JoyNews",
    domains: ["myjoyonline.com", "joynewsroom.com"],
    tier: 2,
    region: "ghana",
  },
  {
    id: "peace_fm",
    publisher: "Peace FM",
    domains: ["peacefmonline.com"],
    tier: 3,
    region: "ghana",
  },
  {
    id: "google_news_gh",
    publisher: "Google News (Ghana)",
    domains: ["news.google.com"],
    tier: 3,
    region: "ghana",
    notes: "Aggregator — treat as secondary unless article is retrieved.",
  },
] as const;

/** Legacy export used by search bias — derived from registry tier-2+ Ghana domains. */
export const GHANA_NEWS_SOURCE_HINTS = GHANA_NEWS_SOURCE_REGISTRY.filter(
  (entry) => entry.region === "ghana" && entry.tier <= 3
)
  .flatMap((entry) => entry.domains)
  .filter((domain, index, arr) => arr.indexOf(domain) === index);

export function normalizeDomain(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

export function lookupSourceByDomain(domain: string): SourceRegistryEntry | null {
  const normalized = normalizeDomain(domain);
  for (const entry of GHANA_NEWS_SOURCE_REGISTRY) {
    if (entry.domains.some((d) => normalized === d || normalized.endsWith(`.${d}`))) {
      return entry;
    }
  }
  return null;
}

export function publisherForDomain(domain: string): string {
  return lookupSourceByDomain(domain)?.publisher ?? domain;
}

export function tierForDomain(domain: string): SourceTier {
  return lookupSourceByDomain(domain)?.tier ?? 3;
}

export function isOfficialTier(tier: SourceTier): boolean {
  return tier === 1;
}

export function isCredibleNewsTier(tier: SourceTier): boolean {
  return tier <= 2;
}
