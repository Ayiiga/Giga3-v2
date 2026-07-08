/** Locale-aware date/time helpers — no hardcoded calendar values in UI copy. */

import { DEFAULT_LOCALE, PRODUCT_LOCALE } from "@/lib/locale";

export { PRODUCT_LOCALE };

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const DATE_SHORT_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  ...DATE_SHORT_OPTS,
  ...TIME_OPTS,
};

function formatWith(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = PRODUCT_LOCALE
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function formatTimestamp(
  ms: number,
  locale = PRODUCT_LOCALE
): string {
  return formatWith(new Date(ms), DATE_SHORT_OPTS, locale);
}

export function formatTimestampDateTime(
  ms: number,
  locale = PRODUCT_LOCALE
): string {
  return formatWith(new Date(ms), DATETIME_OPTS, locale);
}

export function formatRelativeTime(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatTimestamp(ms);
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
