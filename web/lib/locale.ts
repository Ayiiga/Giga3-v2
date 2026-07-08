/**
 * Single source for regional defaults — extend here when adding full i18n.
 * English (Ghana) remains the product default; helpers accept overrides per call.
 */

export const DEFAULT_LOCALE = "en-GH";
export const DEFAULT_HTML_LANG = "en";
export const DEFAULT_OG_LOCALE = "en_US";
export const DEFAULT_TIME_ZONE = "Africa/Accra";
export const DEFAULT_CURRENCY = "GHS";

/** @deprecated Use DEFAULT_LOCALE — kept for backward compatibility. */
export const PRODUCT_LOCALE = DEFAULT_LOCALE;

export function formatCurrency(
  amount: number,
  locale = DEFAULT_LOCALE,
  currency = DEFAULT_CURRENCY
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatNumber(
  value: number,
  locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

export function formatDateTime(
  date: Date | number,
  locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
  timeZone = DEFAULT_TIME_ZONE
): string {
  const d = typeof date === "number" ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(d);
  } catch {
    return d.toISOString();
  }
}
