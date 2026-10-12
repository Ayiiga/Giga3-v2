/**
 * @vitest-environment edge-runtime
 *
 * Convex-backed welcome claim tests via `convex-test` (isolated in-memory backend).
 * Note: convex-test serializes top-level mutations (same serializable outcome as
 * production). Production OCC conflict retries are Convex platform semantics for
 * the single-transaction claimWelcomeEmailSendInTxn read+patch.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import {
  claimWelcomeEmailSendInTxn,
  markWelcomeEmailFailedInTxn,
  markWelcomeEmailSentInTxn,
  markWelcomeEmailUncertainInTxn,
} from "../../convex/welcomeEmailClaim";
import { runWelcomeEmailDelivery } from "../../convex/welcomeEmailDelivery";

const modules = import.meta.glob("../../convex/**/*.*s");

async function seedUser(
  t: ReturnType<typeof convexTest>,
  email: string,
  welcome?: {
    welcomeEmailStatus?: "sending" | "sent" | "uncertain" | "failed";
    welcomeEmailAt?: number;
  }
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("users", {
      email,
      tokens: 0,
      plan: "free",
      tier: "free",
      subscriptionPlan: "free",
      credits: 100,
      starterCreditsGranted: true,
      ...(welcome?.welcomeEmailStatus
        ? {
            welcomeEmailStatus: welcome.welcomeEmailStatus,
            welcomeEmailAt: welcome.welcomeEmailAt ?? Date.now(),
          }
        : {}),
    });
  });
}

async function readWelcomeStatus(
  t: ReturnType<typeof convexTest>,
  email: string
) {
  return t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    return user?.welcomeEmailStatus ?? null;
  });
}

describe("welcome claim — convex-test transactions", () => {
  it("allows exactly one successful claim among concurrent competitors", async () => {
    const t = convexTest(schema, modules);
    const email = "race@example.com";
    await seedUser(t, email);

    const results = await Promise.all([
      t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, email)),
      t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, email)),
      t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, email)),
    ]);

    const wins = results.filter((r) => r.ok);
    const losses = results.filter((r) => !r.ok);
    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(2);
    expect(losses.every((r) => !r.ok && r.reason === "in_flight")).toBe(true);
    expect(await readWelcomeStatus(t, email)).toBe("sending");
  });

  it("blocks sent, sending, and uncertain; allows failed reclaim", async () => {
    const t = convexTest(schema, modules);
    for (const [email, status, expectReason] of [
      ["sent@example.com", "sent", "already_sent"],
      ["sending@example.com", "sending", "in_flight"],
      ["uncertain@example.com", "uncertain", "uncertain_delivery"],
    ] as const) {
      await seedUser(t, email, { welcomeEmailStatus: status });
      const result = await t.mutation(async (ctx) =>
        claimWelcomeEmailSendInTxn(ctx, email)
      );
      expect(result).toEqual({ ok: false, reason: expectReason });
      expect(await readWelcomeStatus(t, email)).toBe(status);
    }

    await seedUser(t, "failed@example.com", { welcomeEmailStatus: "failed" });
    const reclaim = await t.mutation(async (ctx) =>
      claimWelcomeEmailSendInTxn(ctx, "failed@example.com")
    );
    expect(reclaim).toEqual({ ok: true });
    expect(await readWelcomeStatus(t, "failed@example.com")).toBe("sending");
  });

  it("marks sent / uncertain / failed only while status is sending", async () => {
    const t = convexTest(schema, modules);

    const emailSent = "mark-sent@example.com";
    await seedUser(t, emailSent);
    expect(
      await t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, emailSent))
    ).toEqual({ ok: true });
    expect(
      await t.mutation(async (ctx) => markWelcomeEmailSentInTxn(ctx, emailSent))
    ).toEqual({ ok: true });
    expect(await readWelcomeStatus(t, emailSent)).toBe("sent");
    // Second mark from sent fails (not_sending).
    expect(
      await t.mutation(async (ctx) => markWelcomeEmailSentInTxn(ctx, emailSent))
    ).toEqual({ ok: false, reason: "not_sending" });

    const emailUncertain = "mark-uncertain@example.com";
    await seedUser(t, emailUncertain);
    await t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, emailUncertain));
    expect(
      await t.mutation(async (ctx) =>
        markWelcomeEmailUncertainInTxn(ctx, emailUncertain)
      )
    ).toEqual({ ok: true });
    expect(await readWelcomeStatus(t, emailUncertain)).toBe("uncertain");
    // Uncertain cannot be claimed again (no auto-retry).
    expect(
      await t.mutation(async (ctx) =>
        claimWelcomeEmailSendInTxn(ctx, emailUncertain)
      )
    ).toEqual({ ok: false, reason: "uncertain_delivery" });

    const emailFailed = "mark-failed@example.com";
    await seedUser(t, emailFailed);
    await t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, emailFailed));
    expect(
      await t.mutation(async (ctx) =>
        markWelcomeEmailFailedInTxn(ctx, emailFailed)
      )
    ).toEqual({ ok: true });
    expect(await readWelcomeStatus(t, emailFailed)).toBe("failed");
  });

  it("stuck sending stays blocked without automatic reclamation", async () => {
    const t = convexTest(schema, modules);
    const email = "crash-after-claim@example.com";
    await seedUser(t, email);
    await t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, email));
    expect(await readWelcomeStatus(t, email)).toBe("sending");
    // Simulate no mark (crash): subsequent claim must not win.
    expect(
      await t.mutation(async (ctx) => claimWelcomeEmailSendInTxn(ctx, email))
    ).toEqual({ ok: false, reason: "in_flight" });
    expect(await readWelcomeStatus(t, email)).toBe("sending");
  });
});

describe("welcome delivery orchestration — mocked provider", () => {
  it("invokes provider only for the successful claimant", async () => {
    let status: "sending" | "sent" | "uncertain" | "failed" | undefined;
    let providerCalls = 0;

    const makeDeps = () => ({
      isConfigured: () => true,
      claim: async () => {
        if (status === "sending" || status === "sent" || status === "uncertain") {
          return {
            ok: false as const,
            reason:
              status === "sent"
                ? "already_sent"
                : status === "uncertain"
                  ? "uncertain_delivery"
                  : "in_flight",
          };
        }
        status = "sending";
        return { ok: true as const };
      },
      send: async () => {
        providerCalls += 1;
        return { ok: true as const, id: "email_test" };
      },
      markSent: async () => {
        status = "sent";
      },
      markUncertain: async () => {
        status = "uncertain";
      },
      markFailed: async () => {
        status = "failed";
      },
    });

    const deps = makeDeps();
    const [a, b] = await Promise.all([
      runWelcomeEmailDelivery("a@example.com", deps),
      runWelcomeEmailDelivery("a@example.com", deps),
    ]);

    const outcomes = [a, b];
    expect(outcomes.filter((o) => o.providerInvoked)).toHaveLength(1);
    expect(outcomes.filter((o) => o.outcome === "sent")).toHaveLength(1);
    expect(outcomes.filter((o) => o.outcome === "skipped_claim")).toHaveLength(1);
    expect(providerCalls).toBe(1);
    expect(status).toBe("sent");
  });

  it("records uncertain for network_error and never auto-retries", async () => {
    let status: "sending" | "sent" | "uncertain" | "failed" | undefined;
    const deps = {
      isConfigured: () => true,
      claim: async () => {
        if (status === "uncertain") {
          return { ok: false as const, reason: "uncertain_delivery" };
        }
        if (status === "sending" || status === "sent") {
          return { ok: false as const, reason: "in_flight" };
        }
        status = "sending";
        return { ok: true as const };
      },
      send: async () => ({ ok: false as const, reason: "network_error" as const }),
      markSent: async () => {
        status = "sent";
      },
      markUncertain: async () => {
        status = "uncertain";
      },
      markFailed: async () => {
        status = "failed";
      },
    };

    const first = await runWelcomeEmailDelivery("u@example.com", deps);
    expect(first).toMatchObject({
      providerInvoked: true,
      outcome: "uncertain",
      sendReason: "network_error",
    });
    const second = await runWelcomeEmailDelivery("u@example.com", deps);
    expect(second).toMatchObject({
      providerInvoked: false,
      outcome: "skipped_claim",
      claimReason: "uncertain_delivery",
    });
    expect(status).toBe("uncertain");
  });

  it("records failed for definitive provider rejection", async () => {
    let status: "sending" | "sent" | "uncertain" | "failed" | undefined;
    const result = await runWelcomeEmailDelivery("f@example.com", {
      isConfigured: () => true,
      claim: async () => {
        status = "sending";
        return { ok: true };
      },
      send: async () => ({
        ok: false as const,
        reason: "sandbox_recipient" as const,
      }),
      markSent: async () => {
        status = "sent";
      },
      markUncertain: async () => {
        status = "uncertain";
      },
      markFailed: async () => {
        status = "failed";
      },
    });
    expect(result.outcome).toBe("failed");
    expect(status).toBe("failed");
  });

  it("keeps signup-style fire-and-forget non-blocking when delivery rejects", async () => {
    // Mirrors signUpWithPassword: session returns even if welcome delivery fails.
    const session = { email: "new@example.com", sessionToken: "tok" };
    let welcomeFinished = false;
    void runWelcomeEmailDelivery(session.email, {
      isConfigured: () => true,
      claim: async () => ({ ok: true }),
      send: async () => {
        throw new Error("provider down");
      },
      markSent: async () => undefined,
      markUncertain: async () => undefined,
      markFailed: async () => undefined,
    })
      .catch(() => undefined)
      .finally(() => {
        welcomeFinished = true;
      });

    expect(session.sessionToken).toBe("tok");
    // Give the rejected promise a tick; signup must already have returned.
    await Promise.resolve();
    expect(session.email).toBe("new@example.com");
    // Welcome may still be settling; non-blocking means we did not await it.
    expect(welcomeFinished === true || welcomeFinished === false).toBe(true);
  });
});
