import { isStandalonePwa } from "@/lib/pwa/pwaPlatform";

export type DeviceContextSnapshot = {
  now: Date;
  locale: string;
  timeZone: string;
  utcOffsetMinutes: number;
  online: boolean;
  theme: "light" | "dark" | "system";
  language: string;
  languages: string[];
  platform: string;
  userAgent: string;
  viewportWidth: number;
  viewportHeight: number;
  orientation: string;
  pwaInstalled: boolean;
  batteryPercent: number | null;
  batteryCharging: boolean | null;
};

function detectTheme(): "light" | "dark" | "system" {
  if (typeof document === "undefined") return "system";
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function detectOrientation(): string {
  if (typeof window === "undefined") return "unknown";
  const type = window.screen?.orientation?.type;
  if (type) return type;
  return window.innerWidth >= window.innerHeight ? "landscape" : "portrait";
}

async function readBattery(): Promise<{ percent: number | null; charging: boolean | null }> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (typeof nav.getBattery !== "function") {
      return { percent: null, charging: null };
    }
    const battery = await nav.getBattery();
    return {
      percent: Math.round(battery.level * 100),
      charging: Boolean(battery.charging),
    };
  } catch {
    return { percent: null, charging: null };
  }
}

/** Safe, ephemeral device snapshot for local answers — never persisted. */
export async function getDeviceContextSnapshot(
  now = new Date()
): Promise<DeviceContextSnapshot> {
  const locale =
    typeof navigator !== "undefined"
      ? navigator.language || Intl.DateTimeFormat().resolvedOptions().locale || "en"
      : "en";
  const resolved = Intl.DateTimeFormat(locale).resolvedOptions();
  const timeZone = resolved.timeZone || "UTC";
  const utcOffsetMinutes = -now.getTimezoneOffset();
  const battery = typeof navigator !== "undefined" ? await readBattery() : { percent: null, charging: null };

  return {
    now,
    locale,
    timeZone,
    utcOffsetMinutes,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    theme: detectTheme(),
    language: locale,
    languages:
      typeof navigator !== "undefined" && Array.isArray(navigator.languages)
        ? [...navigator.languages]
        : [locale],
    platform: typeof navigator !== "undefined" ? navigator.platform || "unknown" : "unknown",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : 0,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
    orientation: detectOrientation(),
    pwaInstalled: typeof window !== "undefined" ? isStandalonePwa() : false,
    batteryPercent: battery.percent,
    batteryCharging: battery.charging,
  };
}

export function formatLocalDateLong(ctx: DeviceContextSnapshot): string {
  return new Intl.DateTimeFormat(ctx.locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: ctx.timeZone,
  }).format(ctx.now);
}

export function formatLocalTime(ctx: DeviceContextSnapshot): string {
  return new Intl.DateTimeFormat(ctx.locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: ctx.timeZone,
  }).format(ctx.now);
}

export function formatUtcOffset(ctx: DeviceContextSnapshot): string {
  const sign = ctx.utcOffsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(ctx.utcOffsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function formatBrowserSummary(ctx: DeviceContextSnapshot): string {
  const ua = ctx.userAgent;
  if (/Edg\//i.test(ua)) return "Microsoft Edge";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Google Chrome";
  if (/Firefox\//i.test(ua)) return "Mozilla Firefox";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  return "your current browser";
}

export function formatOsSummary(ctx: DeviceContextSnapshot): string {
  const ua = ctx.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return ctx.platform || "your device";
}
