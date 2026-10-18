import { describe, expect, it } from "vitest";
import {
  normalizeSiteUrl,
  safeMoodleConnectErrorMessage,
  validateMoodleSiteUrl,
  validateMoodleToken,
} from "../../convex/connectors/moodleUrl";

describe("Moodle site URL validation", () => {
  it("accepts valid HTTPS Moodle URLs", () => {
    expect(validateMoodleSiteUrl("https://learn.example.edu")).toEqual({
      ok: true,
      normalized: "https://learn.example.edu",
    });
    expect(validateMoodleSiteUrl("https://school.edu/moodle")).toEqual({
      ok: true,
      normalized: "https://school.edu/moodle",
    });
  });

  it("strips trailing slashes and surrounding whitespace", () => {
    expect(normalizeSiteUrl("  https://learn.example.edu/moodle///  ")).toBe(
      "https://learn.example.edu/moodle"
    );
  });

  it("assumes https for bare host / path inputs", () => {
    expect(normalizeSiteUrl("learn.myschool.edu")).toBe("https://learn.myschool.edu");
    expect(normalizeSiteUrl("learn.myschool.edu/lms")).toBe(
      "https://learn.myschool.edu/lms"
    );
  });

  it("rejects malformed URLs", () => {
    expect(validateMoodleSiteUrl("https://").ok).toBe(false);
    expect(validateMoodleSiteUrl("not a url!!").ok).toBe(false);
  });

  it("rejects HTTP production URLs", () => {
    const result = validateMoodleSiteUrl("http://moodle.example.edu");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/https/i);
  });

  it("rejects URLs containing credentials", () => {
    const result = validateMoodleSiteUrl("https://user:secret@moodle.example.edu");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/username|password/i);
  });

  it("rejects localhost, private, link-local, and metadata hosts", () => {
    for (const url of [
      "https://localhost/moodle",
      "https://127.0.0.1/moodle",
      "https://10.0.0.5/moodle",
      "https://192.168.1.1/moodle",
      "https://172.16.0.1/moodle",
      "https://169.254.169.254/moodle",
      "https://100.64.1.1/moodle",
      "https://metadata.google.internal/moodle",
    ]) {
      const result = validateMoodleSiteUrl(url);
      expect(result.ok, url).toBe(false);
    }
  });

  it("rejects unsupported schemes and fragments", () => {
    expect(validateMoodleSiteUrl("ftp://moodle.example.edu").ok).toBe(false);
    expect(validateMoodleSiteUrl("https://moodle.example.edu/path#frag").ok).toBe(
      false
    );
  });

  it("validates Moodle tokens", () => {
    expect(validateMoodleToken("").ok).toBe(false);
    expect(validateMoodleToken("short").ok).toBe(false);
    expect(validateMoodleToken("a".repeat(16)).ok).toBe(true);
  });

  it("maps server errors to safe UI messages without leaking tokens", () => {
    const msg = safeMoodleConnectErrorMessage(
      new Error("Moodle web service error for token super-secret-token")
    );
    expect(msg.toLowerCase()).not.toContain("super-secret-token");
    expect(msg.length).toBeGreaterThan(10);
  });
});
