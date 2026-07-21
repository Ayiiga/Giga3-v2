import { afterEach, describe, expect, it, vi } from "vitest";
import {
  reportClientError,
  reportClientTelemetry,
} from "../../web/lib/observability/clientTelemetry";

describe("clientTelemetry", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is a no-op when disabled (default)", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    reportClientTelemetry({ name: "test.event" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs sanitized events when enabled via env", () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_CLIENT_TELEMETRY", "1");
    // Re-import after env stub is not needed — module reads env at call time.
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    // Provide a window stub so typeof window !== "undefined"
    vi.stubGlobal("window", { localStorage: { getItem: () => null } });
    reportClientTelemetry({
      name: "upload.ok",
      data: { bytes: 12, sessionToken: "secret", email: "a@b.c" },
    });
    expect(spy).toHaveBeenCalledOnce();
    const payload = spy.mock.calls[0]?.[1] as {
      data?: Record<string, unknown>;
    };
    expect(payload.data).toEqual({ bytes: 12 });
    vi.unstubAllGlobals();
  });

  it("reportClientError strips long messages", () => {
    vi.stubEnv("NEXT_PUBLIC_GIGA3_CLIENT_TELEMETRY", "1");
    vi.stubGlobal("window", { localStorage: { getItem: () => null } });
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    reportClientError("chat", new Error("x".repeat(300)));
    const payload = spy.mock.calls[0]?.[1] as {
      data?: { message?: string };
    };
    expect(payload.data?.message?.length).toBeLessThanOrEqual(180);
    vi.unstubAllGlobals();
  });
});
