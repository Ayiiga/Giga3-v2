import { describe, expect, it, vi, afterEach } from "vitest";

describe("createSupabaseRestClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw when NEXT_PUBLIC_SUPABASE_URL contains invisible chars", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://test-project.supabase.co\u200b"
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { createSupabaseRestClient } = await import("../../web/lib/supabase");
    expect(() => createSupabaseRestClient()).not.toThrow();
    const client = createSupabaseRestClient();
    expect(client?.url).toBe("https://test-project.supabase.co");
  });
});
