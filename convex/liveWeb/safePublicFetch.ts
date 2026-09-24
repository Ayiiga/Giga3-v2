import { lookup } from "node:dns/promises";
import {
  BROWSE_MAX_REDIRECTS,
  BROWSE_USER_AGENT,
  BrowseError,
  classifyBrowseUrl,
  isBlockedIpAddress,
  logSafeUrl,
} from "./browsePolicy";

export type AddressResolver = (hostname: string) => Promise<string[]>;

async function defaultResolver(hostname: string): Promise<string[]> {
  if (isBlockedIpAddress(hostname) || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return [hostname];
  }
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

let resolver: AddressResolver = defaultResolver;

/** Tests replace DNS. Production uses Node's resolver. */
export function setAddressResolverForTests(next: AddressResolver | null): void {
  resolver = next ?? defaultResolver;
}

export async function assertResolvedAddresses(hostname: string): Promise<void> {
  let addresses: string[];
  try {
    addresses = await resolver(hostname);
  } catch {
    throw new BrowseError("unavailable");
  }
  if (!addresses.length) throw new BrowseError("unavailable");
  for (const address of addresses) {
    if (isBlockedIpAddress(address)) throw new BrowseError("blocked_destination");
  }
}

type FetchInit = {
  timeoutMs: number;
  maxBytes: number;
  signal?: AbortSignal;
};

function redirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function readLimited(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new BrowseError("response_too_large");
  }
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (text.length > maxBytes) throw new BrowseError("response_too_large");
    return text;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BrowseError("response_too_large");
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

/**
 * Fetch one public document. Each redirect is checked again before it is followed.
 * No cookies, authorization, or caller-supplied headers are sent.
 */
export async function fetchPublicDocument(
  rawUrl: string,
  options: FetchInit
): Promise<{ finalUrl: string; status: number; contentType: string; body: string }> {
  let current = rawUrl;
  const started = Date.now();
  for (let hop = 0; hop <= BROWSE_MAX_REDIRECTS; hop += 1) {
    const classified = classifyBrowseUrl(current);
    if (!classified.ok) {
      throw new BrowseError(hop === 0 ? classified.code : "blocked_redirect");
    }
    try {
      await assertResolvedAddresses(classified.url.hostname);
    } catch (err) {
      if (err instanceof BrowseError && hop > 0 && err.code === "blocked_destination") {
        throw new BrowseError("blocked_redirect");
      }
      throw err;
    }

    const remaining = options.timeoutMs - (Date.now() - started);
    if (remaining <= 0) throw new BrowseError("timeout");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    const onParentAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onParentAbort);
    try {
      const res = await fetch(classified.url.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "User-Agent": BROWSE_USER_AGENT,
        },
        signal: controller.signal,
      });
      const status = typeof res.status === "number" ? res.status : res.ok ? 200 : 0;
      if (redirectStatus(status)) {
        const location = res.headers.get("location");
        if (!location) throw new BrowseError("blocked_redirect");
        current = new URL(location, classified.url).toString();
        continue;
      }
      if (status < 200 || status >= 300) throw new BrowseError("unavailable");
      const body = await readLimited(res, options.maxBytes);
      return {
        finalUrl: classified.url.toString(),
        status,
        contentType: res.headers.get("content-type") ?? "",
        body,
      };
    } catch (err) {
      if (err instanceof BrowseError) throw err;
      if (controller.signal.aborted || options.signal?.aborted) throw new BrowseError("timeout");
      console.error("[browse] fetch failed", logSafeUrl(classified.url.toString()));
      throw new BrowseError("unavailable");
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onParentAbort);
    }
  }
  throw new BrowseError("blocked_redirect");
}
