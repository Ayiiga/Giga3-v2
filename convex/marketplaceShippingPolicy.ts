/** Physical shipping information only; not a paid shipping service. */
export const PHYSICAL_SHIPPING_METHODS = ["pickup", "seller_delivery", "courier"] as const;
export type PhysicalShippingMethod = (typeof PHYSICAL_SHIPPING_METHODS)[number];
export function validatePhysicalShipping(input: {
  methods?: PhysicalShippingMethod[];
  feeGhs?: number;
  days?: number;
  returnWindowDays?: number;
  returnTerms?: string;
}): void {
  const methods = input.methods ?? ["pickup"];
  if (!methods.length || methods.length > 3 || new Set(methods).size !== methods.length ||
      methods.some(m => !PHYSICAL_SHIPPING_METHODS.includes(m))) {
    throw new Error("Choose a valid delivery or collection method.");
  }
  if (input.feeGhs !== undefined &&
      (!Number.isInteger(input.feeGhs) || input.feeGhs < 0 || input.feeGhs > 10000)) {
    throw new Error("Shipping fee must be between GHS 0 and 10,000.");
  }
  if (input.days !== undefined &&
      (!Number.isInteger(input.days) || input.days < 1 || input.days > 60)) {
    throw new Error("Delivery estimate must be between 1 and 60 days.");
  }
  if (input.returnWindowDays !== undefined &&
      (!Number.isInteger(input.returnWindowDays) || input.returnWindowDays < 0 || input.returnWindowDays > 90)) {
    throw new Error("Seller return window must be between 0 and 90 days.");
  }
  if ((input.returnTerms ?? "").length > 500) {
    throw new Error("Return conditions must be 500 characters or fewer.");
  }
}
export const SHIPPING_LABELS: Record<PhysicalShippingMethod, string> = {
  pickup: "Collection / pickup",
  seller_delivery: "Seller-arranged local delivery",
  courier: "Courier shipping",
};
