/**
 * Ops-only production cleanup — remove ephemeral test credential rows.
 * Does not touch legacy accountProfiles* tables (none in this schema).
 */

import { internalMutation, internalQuery } from "./_generated/server";

const PROTECTED_EMAIL = "ayiiga3@gmail.com";

const INCLUDES_PATTERNS = ["example.com", "giga3-e2e.test", "mailinator.com"] as const;

const STARTS_WITH_PATTERNS = [
  "cursor-",
  "pr412",
  "audit412",
  "security-probe-",
  "wait-",
  "acc-",
  "async-",
  "debug-",
  "chat-regress-",
  "chattest",
  "cloud-agent-",
  "mk-creator",
  "mk-demo",
  "lat-",
] as const;

const INCLUDES_SUBSTRINGS = [
  "starter-check",
  "starter-verify",
  "e2e-test",
  "test-qa",
] as const;

const EXACT_MATCHES = new Set([
  "test@example.com",
  "probe@example.com",
  "giga3test2024@example.com",
]);

/** Exported for unit tests — determines whether a credential email is safe to delete. */
export function isTestUserEmail(rawEmail: string): boolean {
  const email = rawEmail.trim().toLowerCase();
  if (!email || email === PROTECTED_EMAIL) return false;

  const matchesPattern =
    INCLUDES_PATTERNS.some((part) => email.includes(part)) ||
    STARTS_WITH_PATTERNS.some((prefix) => email.startsWith(prefix)) ||
    INCLUDES_SUBSTRINGS.some((part) => email.includes(part)) ||
    EXACT_MATCHES.has(email);

  if (!matchesPattern) return false;

  // Never delete real Gmail accounts unless they explicitly matched a test pattern above.
  if (email.endsWith("@gmail.com") && email !== PROTECTED_EMAIL) {
    return matchesPattern;
  }

  return true;
}

/** Ops preview — list user/credential emails still matching test patterns. */
export const previewTestUsersRemaining = internalQuery({
  args: {},
  handler: async (ctx) => {
    const creds = await ctx.db.query("userCredentials").collect();
    const users = await ctx.db.query("users").collect();
    const testCredEmails = creds
      .filter((row) => isTestUserEmail(row.email))
      .map((row) => row.email);
    const testUserEmails = users
      .filter((row) => isTestUserEmail(row.email))
      .map((row) => row.email);
    return {
      credentialTestEmails: testCredEmails.sort(),
      userTestEmails: testUserEmails.sort(),
      totalUsers: users.length,
      totalCredentials: creds.length,
    };
  },
});

export const cleanTestUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allCredentials = await ctx.db.query("userCredentials").collect();
    const allUsers = await ctx.db.query("users").collect();
    const totalBefore = allCredentials.length;
    const usersBefore = allUsers.length;

    const testEmails = new Set<string>();
    for (const row of allCredentials) {
      if (isTestUserEmail(row.email)) {
        testEmails.add(row.email.trim().toLowerCase());
      }
    }
    // Also remove test rows in users that never received a credential record.
    for (const user of allUsers) {
      if (isTestUserEmail(user.email)) {
        testEmails.add(user.email.trim().toLowerCase());
      }
    }

    const deleted: string[] = [];

    for (const row of allCredentials) {
      const email = row.email.trim().toLowerCase();
      if (!testEmails.has(email)) continue;
      await ctx.db.delete(row._id);
      deleted.push(email);
    }

    // Drop matching rows from users so Admin "Total users" reflects cleanup.
    // Does not touch accountProfiles* or other legacy tables.
    for (const user of allUsers) {
      const email = user.email.trim().toLowerCase();
      if (!testEmails.has(email)) continue;
      await ctx.db.delete(user._id);
    }

    const totalAfter = (await ctx.db.query("userCredentials").collect()).length;
    const usersAfter = (await ctx.db.query("users").collect()).length;

    deleted.sort();

    return {
      deleted,
      totalBefore,
      totalAfter,
      usersBefore,
      usersAfter,
    };
  },
});
