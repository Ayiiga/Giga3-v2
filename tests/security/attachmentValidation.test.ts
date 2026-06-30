import { describe, expect, it, beforeAll } from "vitest";
import {
  parseDataUrl,
  sanitizeAttachmentName,
  sanitizeFeedbackNote,
  validateAttachment,
  validateAttachments,
} from "../../convex/attachmentValidation";
import { ValidationError } from "../../convex/securityErrors";

describe("attachmentValidation", () => {
  it("rejects under-reported attachment sizes", () => {
    expect(() =>
      validateAttachment(
        {
          kind: "text",
          name: "notes.txt",
          sizeBytes: 10,
          text: "this text is definitely longer than ten bytes",
        },
        1024 * 1024
      )
    ).toThrow(ValidationError);
  });

  it("accepts document metadata when extracted text is smaller than file size", () => {
    const validated = validateAttachment(
      {
        kind: "document",
        name: "report.docx",
        sizeBytes: 50_000,
        text: "Extracted summary only",
      },
      1024 * 1024
    );
    expect(validated.measuredPayloadBytes).toBeGreaterThan(0);
    expect(validated.measuredPayloadBytes).toBeLessThan(validated.sizeBytes);
  });

  it("validates image data URLs and MIME types", () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const base64 = btoa(String.fromCharCode(...pngBytes));
    const dataUrl = `data:image/png;base64,${base64}`;
    const validated = validateAttachment(
      {
        kind: "image",
        name: "scan.png",
        mimeType: "image/png",
        sizeBytes: pngBytes.length,
        dataUrl,
      },
      1024 * 1024
    );
    expect(validated.measuredPayloadBytes).toBe(pngBytes.length);
  });

  it("rejects malformed base64 image payloads", () => {
    expect(() =>
      validateAttachment(
        {
          kind: "image",
          name: "bad.png",
          mimeType: "image/png",
          sizeBytes: 100,
          dataUrl: "data:image/png;base64,%%%",
        },
        1024 * 1024
      )
    ).toThrow(ValidationError);
  });

  it("sanitizes unsafe attachment names", () => {
    expect(sanitizeAttachmentName("../../evil.exe")).not.toContain("/");
    expect(() =>
      validateAttachment(
        {
          kind: "text",
          name: "payload.exe",
          sizeBytes: 4,
          text: "test",
        },
        1024
      )
    ).toThrow(ValidationError);
  });

  it("sanitizes feedback notes", () => {
    expect(sanitizeFeedbackNote("<script>alert(1)</script>hello")).toBe("hello");
  });
});

describe("parseDataUrl", () => {
  it("parses valid base64 image data", () => {
    const parsed = parseDataUrl("data:image/png;base64,QUJDRA==");
    expect(parsed?.mimeType).toBe("image/png");
    expect(parsed?.decodedBytes.length).toBe(4);
  });
});
