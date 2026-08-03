import {
  addDays,
  formatBrowserSummary,
  formatLocalDateLong,
  formatLocalTime,
  formatOsSummary,
  formatUtcOffset,
  getDeviceContextSnapshot,
  isLeapYear,
  type DeviceContextSnapshot,
} from "@/lib/chat/deviceContext";

export type DeviceContextIntent =
  | "date_today"
  | "date_tomorrow"
  | "date_yesterday"
  | "day_of_week"
  | "month_year"
  | "leap_year"
  | "time_now"
  | "timezone"
  | "connectivity"
  | "theme"
  | "language"
  | "battery"
  | "screen"
  | "pwa"
  | "device_info"
  | "news_offline"
  | "weather_offline"
  | null;

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when the message is primarily asking for device/calendar/clock facts. */
export function matchDeviceContextIntent(raw: string): DeviceContextIntent {
  const text = normalize(raw);
  if (!text || text.length > 180) return null;

  // Prefer not to intercept complex multi-part prompts.
  if (/\b(and then|also write|draft|essay|code|explain how)\b/i.test(text)) {
    return null;
  }

  if (
    /\b(am i|are we|are you)\s+(online|offline)\b/.test(text) ||
    /\b(network|connection|internet)\s+(status|state)\b/.test(text) ||
    /^(online|offline)\??$/.test(text)
  ) {
    return "connectivity";
  }

  if (
    /\b(news|headlines)\b/.test(text) &&
    /\b(today|latest|recent|current|now)\b/.test(text)
  ) {
    return typeof navigator !== "undefined" && !navigator.onLine ? "news_offline" : null;
  }

  if (
    /\bweather\b/.test(text) &&
    /\b(today|now|current|outside|forecast)\b/.test(text)
  ) {
    return typeof navigator !== "undefined" && !navigator.onLine ? "weather_offline" : null;
  }

  if (
    /\b(battery|charge level|charging)\b/.test(text) &&
    /\b(what|how|status|level|percent|% )\b/.test(text)
  ) {
    return "battery";
  }

  if (
    /\b(dark mode|light mode|theme|appearance)\b/.test(text) &&
    /\b(what|which|am i|using|enabled)\b/.test(text)
  ) {
    return "theme";
  }

  if (
    /\b(language|locale)\b/.test(text) &&
    /\b(what|which|preferred|browser|device)\b/.test(text)
  ) {
    return "language";
  }

  if (
    /\b(screen size|viewport|resolution|orientation)\b/.test(text) ||
    (/^\b(what('s| is) my )?(screen|viewport)\b/.test(text) && text.length < 80)
  ) {
    return "screen";
  }

  if (
    /\b(installed (as )?(an? )?pwa|progressive web app|home screen|standalone)\b/.test(text) ||
    /\bam i using the (installed )?app\b/.test(text)
  ) {
    return "pwa";
  }

  if (
    /\b(browser|operating system|os|platform|device)\b/.test(text) &&
    /\b(what|which|am i using|my)\b/.test(text) &&
    !/\b(fix|buy|repair)\b/.test(text)
  ) {
    return "device_info";
  }

  if (
    /\bleap year\b/.test(text) ||
    /\bis (this|current) year a leap year\b/.test(text)
  ) {
    return "leap_year";
  }

  if (
    /\b(what('s| is)|tell me)\b.*\b(time zone|timezone)\b/.test(text) ||
    /\b(my|current)\s+time\s*zone\b/.test(text) ||
    /\butc offset\b/.test(text)
  ) {
    return "timezone";
  }

  if (
    /^(what('s| is)|tell me)\s+(the\s+)?(current\s+)?time\??$/.test(text) ||
    /\bwhat time is it\b/.test(text) ||
    /\b(current|local)\s+time\b/.test(text)
  ) {
    return "time_now";
  }

  if (
    /\bwhat day (is it|of the week)\b/.test(text) ||
    /\b(day of (the )?week)\b/.test(text)
  ) {
    return "day_of_week";
  }

  if (
    /\bwhat month\b/.test(text) ||
    /\bwhat year\b/.test(text) ||
    /\b(current|this)\s+(month|year)\b/.test(text)
  ) {
    return "month_year";
  }

  if (/\btomorrow('s)?\s+(date|day)\b/.test(text) || /\bdate tomorrow\b/.test(text)) {
    return "date_tomorrow";
  }

  if (/\byesterday('s)?\s+(date|day)\b/.test(text) || /\bdate yesterday\b/.test(text)) {
    return "date_yesterday";
  }

  if (
    /\b(what('s| is)|tell me)\b.*\b(today('s)?\s+)?date\b/.test(text) ||
    /\btoday('s)? date\b/.test(text) ||
    /^what day is today\??$/.test(text) ||
    /^what is today\??$/.test(text)
  ) {
    return "date_today";
  }

  return null;
}

export function needsLocationEnrichment(raw: string): boolean {
  const text = normalize(raw);
  if (!text) return false;
  return (
    /\b(weather|forecast|temperature|rain|humidity)\b/.test(text) ||
    /\b(near me|nearby|around me|local places|closest)\b/.test(text)
  );
}

export function isNewsOrWeatherIntent(raw: string): boolean {
  const text = normalize(raw);
  return (
    (/\b(news|headlines)\b/.test(text) &&
      /\b(today|latest|recent|current|now)\b/.test(text)) ||
    (/\bweather\b/.test(text) && /\b(today|now|current|outside|forecast)\b/.test(text))
  );
}

function formatDateFor(ctx: DeviceContextSnapshot, date: Date): string {
  return new Intl.DateTimeFormat(ctx.locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: ctx.timeZone,
  }).format(date);
}

export function answerDeviceContextIntent(
  intent: Exclude<DeviceContextIntent, null>,
  ctx: DeviceContextSnapshot
): string {
  switch (intent) {
    case "date_today":
      return `Today is ${formatLocalDateLong(ctx)} (${ctx.timeZone}).`;
    case "date_tomorrow":
      return `Tomorrow is ${formatDateFor(ctx, addDays(ctx.now, 1))} (${ctx.timeZone}).`;
    case "date_yesterday":
      return `Yesterday was ${formatDateFor(ctx, addDays(ctx.now, -1))} (${ctx.timeZone}).`;
    case "day_of_week":
      return `Today is ${new Intl.DateTimeFormat(ctx.locale, {
        weekday: "long",
        timeZone: ctx.timeZone,
      }).format(ctx.now)}.`;
    case "month_year": {
      const month = new Intl.DateTimeFormat(ctx.locale, {
        month: "long",
        timeZone: ctx.timeZone,
      }).format(ctx.now);
      const year = new Intl.DateTimeFormat(ctx.locale, {
        year: "numeric",
        timeZone: ctx.timeZone,
      }).format(ctx.now);
      return `It is currently ${month} ${year}.`;
    }
    case "leap_year": {
      const year = Number(
        new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          timeZone: ctx.timeZone,
        }).format(ctx.now)
      );
      return isLeapYear(year)
        ? `${year} is a leap year.`
        : `${year} is not a leap year.`;
    }
    case "time_now":
      return `Your local time is ${formatLocalTime(ctx)} (${ctx.timeZone}, ${formatUtcOffset(ctx)}).`;
    case "timezone":
      return `Your timezone is ${ctx.timeZone} (${formatUtcOffset(ctx)}).`;
    case "connectivity":
      return ctx.online
        ? "You are online — Giga3 can use live web information when needed."
        : "You appear to be offline. I can still answer from your device clock and cached knowledge, but live news and weather need a connection.";
    case "theme":
      return ctx.theme === "dark"
        ? "Your app/device theme is currently Dark."
        : ctx.theme === "light"
          ? "Your app/device theme is currently Light."
          : "Your theme follows the system preference.";
    case "language":
      return `Your preferred language is ${ctx.language}${
        ctx.languages.length > 1 ? ` (also: ${ctx.languages.slice(0, 3).join(", ")})` : ""
      }.`;
    case "battery":
      if (ctx.batteryPercent == null) {
        return "Battery status isn’t available in this browser. I can still help with date, time, and other device details.";
      }
      return `Your battery is at about ${ctx.batteryPercent}%${
        ctx.batteryCharging == null
          ? "."
          : ctx.batteryCharging
            ? " and charging."
            : " and not charging."
      }`;
    case "screen":
      return `Your viewport is ${ctx.viewportWidth}×${ctx.viewportHeight}px in ${ctx.orientation} orientation.`;
    case "pwa":
      return ctx.pwaInstalled
        ? "Yes — you’re using Giga3 as an installed PWA (standalone)."
        : "You’re browsing in the regular browser tab. You can install Giga3 to your home screen for an app-like experience.";
    case "device_info":
      return `You’re on ${formatOsSummary(ctx)} using ${formatBrowserSummary(ctx)}. Language: ${ctx.language}. Viewport: ${ctx.viewportWidth}×${ctx.viewportHeight}px.`;
    case "news_offline":
      return "Recent news needs an internet connection. You’re offline right now — reconnect and ask again for the latest headlines.";
    case "weather_offline":
      return "Current weather needs an internet connection. You’re offline right now — reconnect and ask again for an updated forecast.";
    default:
      return "I can share local date, time, timezone, and basic device details from your browser when available.";
  }
}

export async function resolveLocalDeviceAnswer(
  userText: string
): Promise<{ intent: Exclude<DeviceContextIntent, null>; answer: string } | null> {
  const intent = matchDeviceContextIntent(userText);
  if (!intent) return null;
  const ctx = await getDeviceContextSnapshot();
  return { intent, answer: answerDeviceContextIntent(intent, ctx) };
}

/** Compact ephemeral context for weather/nearby AI turns — never stored separately. */
export function buildLocationContextLine(lat: number, lng: number): string {
  return `[Device context — approximate location with user permission: ${lat.toFixed(3)}, ${lng.toFixed(3)}. Do not store this.]`;
}
