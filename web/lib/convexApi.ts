// Client-safe bridge to Convex generated API references.
// Uses runtime require to avoid TypeScript traversing backend source files.
type ConvexApiModule = {
  api: Record<string, any>;
  internal: Record<string, any>;
  components: Record<string, any>;
};

declare const require: (id: string) => unknown;

const generated = require("../../convex/_generated/api") as ConvexApiModule;

export const api = generated.api;
export const internal = generated.internal;
export const components = generated.components;
