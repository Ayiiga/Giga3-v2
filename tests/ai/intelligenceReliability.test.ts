import { describe, expect, it } from "vitest";
import {
  buildChatRoutePlan,
  visionFailoverOrder,
  VISION_CAPABLE_PROVIDERS,
} from "../../convex/providerRouter";
import {
  inferResponseDetailFromQuery,
  responseDetailStyleAddon,
  isValidResponseDetail,
} from "../../convex/assistantIdentity";
import { buildMultimodalPrompt } from "../../convex/multimodalPrompt";
import { formatPdfAttachmentText } from "../../web/lib/chat/pdfTextExtract";

describe("vision-capable routing", () => {
  it("keeps free Smart text on fal first", () => {
    const plan = buildChatRoutePlan({
      tier: "free",
      mode: "research",
      query: "Explain quantum computing",
      chatSystem: "smart",
    });
    expect(plan.primaryProvider).toBe("fal_ai");
  });

  it("routes free Smart image analysis to vision providers only", () => {
    const plan = buildChatRoutePlan({
      tier: "free",
      mode: "research",
      query: "What is written on this board?",
      chatSystem: "smart",
      hasImageAttachment: true,
    });
    expect(plan.failoverOrder).toEqual(visionFailoverOrder("free"));
    expect(plan.failoverOrder.every((p) => VISION_CAPABLE_PROVIDERS.includes(p))).toBe(
      true
    );
    expect(plan.failoverOrder).not.toContain("fal_ai");
  });

  it("routes premium image analysis to OpenAI then Gemini", () => {
    const plan = buildChatRoutePlan({
      tier: "premium",
      mode: "general",
      query: "Describe this diagram",
      hasImageAttachment: true,
    });
    expect(plan.failoverOrder).toEqual(["openai_primary", "gemini"]);
  });
});

describe("response detail preference", () => {
  it("validates known ids", () => {
    expect(isValidResponseDetail("quick")).toBe(true);
    expect(isValidResponseDetail("detailed")).toBe(true);
    expect(isValidResponseDetail("expert")).toBe(true);
    expect(isValidResponseDetail("verbose")).toBe(false);
  });

  it("infers detail from explicit user phrasing", () => {
    expect(inferResponseDetailFromQuery("Give a quick answer please")).toBe("quick");
    expect(inferResponseDetailFromQuery("Explain photosynthesis in detail")).toBe(
      "detailed"
    );
    expect(inferResponseDetailFromQuery("Provide an expert analysis of this plan")).toBe(
      "expert"
    );
  });

  it("adds a concise system addon for selected detail", () => {
    const addon = responseDetailStyleAddon("quick");
    expect(addon).toContain("Quick Answer");
    expect(responseDetailStyleAddon(undefined, "Hello")).toBe("");
  });
});

describe("document grounding prompts", () => {
  it("instructs the model not to invent PDF content when extraction is empty", () => {
    const prompt = buildMultimodalPrompt("Summarize chapter 3", [
      {
        kind: "pdf",
        name: "notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: 12000,
        text: formatPdfAttachmentText("notes.pdf", {
          text: "",
          pageCount: 12,
          pagesWithText: 0,
          truncated: false,
        }),
      },
    ]);
    expect(prompt).toContain("No extractable text layer was found");
    expect(prompt).toContain("Do not invent");
    expect(prompt).toContain("ground answers only in the");
  });

  it("includes extracted PDF page markers when text is present", () => {
    const text = formatPdfAttachmentText("lesson.pdf", {
      text: "--- Page 1 ---\nPhotosynthesis converts light energy.",
      pageCount: 3,
      pagesWithText: 1,
      truncated: false,
    });
    expect(text).toContain("Extracted PDF text");
    expect(text).toContain("Page 1");
    expect(text).toContain("Photosynthesis");
  });
});
