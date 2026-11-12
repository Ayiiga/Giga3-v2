import { SUBSCRIPTION_PLANS } from "./subscriptionPlans";

export const MONITORING_PLANS = [
  { ...SUBSCRIPTION_PLANS.basic, slots: 1, calendars: false },
  { ...SUBSCRIPTION_PLANS.premium, slots: 5, calendars: true },
] as const;

export function getMonitoringPlan(id: string) {
  return MONITORING_PLANS.find((plan) => plan.id === id);
}
