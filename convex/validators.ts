import { v } from "convex/values";

/** Standard session-only auth argument for public Convex APIs. */
export const sessionArgs = {
  sessionToken: v.string(),
};
