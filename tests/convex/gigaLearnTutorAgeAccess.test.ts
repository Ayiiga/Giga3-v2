/** @vitest-environment edge-runtime */
/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { createSessionToken } from "../../convex/sessionAuth";

const modules = import.meta.glob("../../convex/**/*.*s");
afterEach(() => vi.unstubAllEnvs());

it.each([
  { label: "under 13", age: 10, reason: "Use the guided activities" },
  { label: "teen", age: 16, reason: "Use the guided activities" },
  { label: "unknown age", age: undefined, reason: "Use the guided activities" },
  { label: "adult", age: 28, reason: "Tell the tutor what you want" },
])("applies the server tutor restriction for an account with $label", async ({ age, reason }) => {
  vi.stubEnv("SESSION_SIGNING_SECRET", "gigalearn-tutor-age-test");
  const t = convexTest(schema, modules);
  const email = "tutor-learner@example.com";
  const sessionToken = await createSessionToken(email);
  await t.run(async ({ db }) => {
    await db.insert("users", {
      email, tokens: 0, plan: "free", tier: "free", credits: 0, starterCreditsGranted: true,
      subscriptionPlan: "free",
      ...(age === undefined ? {} : {
        birthMonth: 1,
        birthYear: new Date().getUTCFullYear() - age,
        ageAttestedAt: Date.now(),
      }),
    });
  });
  await expect(t.action(api.adaptiveLearning.tutorTurn, {
    sessionToken,
    mode: "ask",
    context: { levelId: "basic-12" },
    studentInput: "",
  })).rejects.toThrow(reason);
});
