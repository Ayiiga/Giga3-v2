/** Live Web configuration — reads server env only. */

export function isLiveWebEnabled(): boolean {
  return process.env.GIGA3_LIVE_WEB_ENABLED !== "false";
}

export function liveWebSearchTimeoutMs(): number {
  return Number(process.env.LIVE_WEB_SEARCH_TIMEOUT_MS) || 10_000;
}

export function liveWebFetchTimeoutMs(): number {
  return Number(process.env.LIVE_WEB_FETCH_TIMEOUT_MS) || 12_000;
}

export function liveWebMaxPageBytes(): number {
  return Number(process.env.LIVE_WEB_MAX_PAGE_BYTES) || 512_000;
}

export function liveWebMaxSearchResults(): number {
  return Number(process.env.LIVE_WEB_MAX_SEARCH_RESULTS) || 5;
}

export function liveWebMaxPagesToRead(): number {
  return Number(process.env.LIVE_WEB_MAX_PAGES_TO_READ) || 3;
}

export function liveWebRateLimitPerHour(): number {
  return Number(process.env.LIVE_WEB_RATE_LIMIT_PER_HOUR) || 30;
}

export function serperApiKey(): string | undefined {
  const key = process.env.SERPER_API_KEY?.trim();
  return key || undefined;
}

export function braveSearchApiKey(): string | undefined {
  const key = process.env.BRAVE_SEARCH_API_KEY?.trim();
  return key || undefined;
}
