/** Locale-aware date/time helpers — no hardcoded calendar values in UI copy. */

const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE?.trim() || "Africa/Accra";

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
};

const DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
};

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: APP_TIME_ZONE,
  timeZoneName: "short",
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTS,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZoneName: "short",
};

function formatWith(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = "en-US"
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatCurrentDate(now = new Date()): string {
  return formatWith(now, DATE_OPTS);
}

export function formatCurrentDateShort(now = new Date()): string {
  return formatWith(now, DATE_SHORT_OPTS);
}

export function formatCurrentTime(now = new Date()): string {
  return formatWith(now, TIME_OPTS);
}

export function formatCurrentDateTime(now = new Date()): string {
  return formatWith(now, DATETIME_OPTS);
}

export function toIsoDateTime(now = new Date()): string {
  return now.toISOString();
}

export function getCurrentYear(now = new Date()): number {
  return now.getFullYear();
}

/** Replace {{DATE}}, {{DATETIME}}, {{YEAR}}, {{TIME}} in template bodies. */
export function resolveTemplatePlaceholders(
  text: string,
  now = new Date()
): string {
  if (!text) return "";
  return text
    .replaceAll("{{DATE}}", formatCurrentDateShort(now))
    .replaceAll("{{DATETIME}}", formatCurrentDateTime(now))
    .replaceAll("{{TIME}}", formatCurrentTime(now))
    .replaceAll("{{YEAR}}", String(getCurrentYear(now)));
}
