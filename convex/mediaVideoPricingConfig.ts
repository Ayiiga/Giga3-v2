/**
 * Margin, FX, and credit-value configuration for Media Studio video pricing.
 * All money uses integer pesewas (1 GHS = 100) or micro-USD (1 USD = 1_000_000).
 */

import { SUBSCRIPTION_PLANS } from "./subscriptionPlans";

/** Basis points — 10_000 = 100%. */
export const MIN_TARGET_MARGIN_BPS = 2000;
export const MAX_TARGET_MARGIN_BPS = 6000;
export const DEFAULT_TARGET_MARGIN_BPS = 4000;

/** Extra provider-cost buffer for retries, storage, bandwidth, processing. */
export const OPERATIONAL_BUFFER_BPS = 800;

/** Default USD → GHS in pesewas (15.00 GHS per USD). Override via env in production. */
export function usdToGhsPesewas(): number {
  const raw = process.env.USD_TO_GHS_RATE ?? process.env.USD_TO_GHS_PESEWAS;
  if (!raw) return 1500;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 1500;
  // Env may be whole GHS (15) or pesewas (1500).
  return n < 100 ? Math.round(n * 100) : Math.round(n);
}

/**
 * Conservative revenue per credit in pesewas — uses the lowest paid rate so
 * required credits are never under-estimated (margin protection).
 */
export function conservativeCreditValuePesewas(): number {
  const subscriptionRates = Object.values(SUBSCRIPTION_PLANS).map((plan) =>
    Math.round((plan.priceGhs * 100) / plan.credits)
  );
  // Credit top-ups are 1 GHS = 1 credit (100 pesewas/credit).
  const packRate = 100;
  return Math.min(packRate, ...subscriptionRates);
}

export function clampMarginBps(value: number | undefined): number {
  const n = Math.round(value ?? DEFAULT_TARGET_MARGIN_BPS);
  return Math.min(MAX_TARGET_MARGIN_BPS, Math.max(MIN_TARGET_MARGIN_BPS, n));
}

/** Convert micro-USD to pesewas using configured FX. */
export function microUsdToPesewas(microUsd: number): number {
  const fx = usdToGhsPesewas();
  return Math.round((microUsd * fx) / 1_000_000);
}

/** Apply operational buffer on top of provider cost (both in same unit). */
export function applyOperationalBuffer(amount: number, bufferBps = OPERATIONAL_BUFFER_BPS): number {
  return Math.round((amount * (10_000 + bufferBps)) / 10_000);
}

/**
 * Revenue required to achieve target margin on a buffered provider cost.
 * marginBps = (revenue - cost) / revenue
 */
export function revenueForMarginPesewas(
  bufferedCostPesewas: number,
  marginBps: number
): number {
  const safeMargin = clampMarginBps(marginBps);
  if (safeMargin >= 10_000) return bufferedCostPesewas;
  return Math.ceil((bufferedCostPesewas * 10_000) / (10_000 - safeMargin));
}

/** Credits from pesewas revenue using conservative credit value. */
export function creditsFromRevenuePesewas(revenuePesewas: number): number {
  const perCredit = conservativeCreditValuePesewas();
  return Math.max(1, Math.ceil(revenuePesewas / perCredit));
}

/** Gross margin in basis points given revenue and provider cost (pre-buffer). */
export function grossMarginBps(revenuePesewas: number, providerCostPesewas: number): number {
  if (revenuePesewas <= 0) return 0;
  return Math.round(((revenuePesewas - providerCostPesewas) * 10_000) / revenuePesewas);
}
