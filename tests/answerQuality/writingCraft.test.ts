import { describe, expect, it } from "vitest";
import { prepareAnswerQualityContext } from "../../convex/answerQuality";
import {
  hasDocumentDeliverableIntent,
  hasMemorialOrSpeechIntent,
  hasRewritePolishIntent,
  hasWritingCraftIntent,
  hasWritingFollowUpIntent,
  WRITING_CRAFT_SYSTEM_ADDON,
} from "../../convex/writingCraft";
import {
  isDocumentCreationRequest,
  isDocumentExportRequest,
  isDocumentFollowUpRequest,
} from "../../web/lib/documents/intent";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TRIBUTE =
  "Write a heartfelt tribute to my late grandmother. She was a retired headmistress, a mentor, a prayer warrior, and a kind person. Include our cherished memories and a respectful farewell.";

const PAYMENT_REWRITE =
  "Humanize and professionalize this payment follow-up message.\n\nHi, just checking if you have paid the invoice yet. Thanks.";

const BUSINESS_PDF =
  "Prepare a professional business report and export it as PDF.";

const FOLLOW_UP = "Make it shorter and more professional.";

describe("writing craft intents", () => {
  it("detects tribute / memorial writing", () => {
    expect(hasMemorialOrSpeechIntent(TRIBUTE)).toBe(true);
    expect(hasWritingCraftIntent(TRIBUTE)).toBe(true);
  });

  it("detects rewrite / humanize / polish", () => {
    expect(hasRewritePolishIntent(PAYMENT_REWRITE)).toBe(true);
    expect(hasWritingCraftIntent(PAYMENT_REWRITE)).toBe(true);
  });

  it("detects document + PDF export requests", () => {
    expect(hasDocumentDeliverableIntent(BUSINESS_PDF)).toBe(true);
    expect(isDocumentCreationRequest(BUSINESS_PDF)).toBe(true);
    expect(isDocumentExportRequest(BUSINESS_PDF)).toBe(true);
    expect(isDocumentFollowUpRequest("export as PDF")).toBe(true);
  });

  it("detects in-thread writing follow-ups", () => {
    expect(hasWritingFollowUpIntent(FOLLOW_UP)).toBe(true);
    expect(hasWritingCraftIntent(FOLLOW_UP)).toBe(true);
  });
});

describe("writing craft response modes (A–F)", () => {
  it("A: tribute receives creative writing treatment without Smart Answers or research panels", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: TRIBUTE,
    });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.queryClass).toBe("creative");
    expect(ctx.systemPromptAddon).toContain("Writing Quality Standard");
    expect(ctx.systemPromptAddon).toContain("tributes");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
    expect(ctx.systemPromptAddon).not.toContain("GigaResearch");
    expect(ctx.showVerificationByDefault).toBe(false);
    expect(ctx.requiresCitation).toBe(false);
    expect(WRITING_CRAFT_SYSTEM_ADDON).toContain("Preserve every supplied name");
  });

  it("B: professional rewriting stays craft mode without Smart Answers", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: PAYMENT_REWRITE,
    });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.systemPromptAddon).toContain("rewrites/humanize/polish");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
    expect(ctx.systemPromptAddon).toContain("ready to send");
  });

  it("C: business report + PDF uses document export hint and not research panels", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: BUSINESS_PDF,
    });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.systemPromptAddon).toContain("Writing Quality Standard");
    expect(ctx.systemPromptAddon).toContain("PDF/Word export");
    expect(ctx.systemPromptAddon).toContain("Never claim a PDF or Word file was created");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
    expect(ctx.systemPromptAddon).not.toContain("GigaResearch");
  });

  it("D: follow-up revises the draft without Smart Answers restart", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: FOLLOW_UP,
      history: [
        { role: "user", content: PAYMENT_REWRITE },
        {
          role: "assistant",
          content:
            "Dear Ama,\n\nI hope you are well. I am writing to kindly follow up on invoice INV-204, which remains outstanding.\n\nPlease confirm payment at your earliest convenience.\n\nKind regards,\nKwesi",
        },
      ],
    });
    expect(ctx.responseMode).toBe("conversational");
    expect(ctx.systemPromptAddon).toContain("make it shorter/more professional");
    expect(ctx.systemPromptAddon).not.toContain("## ⚡ Quick Answer");
  });

  it("E: ordinary factual questions stay direct (Smart Answers allowed)", () => {
    const ctx = prepareAnswerQualityContext({
      mode: "general",
      query: "What is the capital of Ghana?",
    });
    expect(ctx.responseMode).toBe("educational");
    expect(ctx.queryClass).toBe("factual");
    expect(ctx.systemPromptAddon).toContain("## ⚡ Quick Answer");
    expect(ctx.systemPromptAddon).not.toContain("Writing Quality Standard");
  });

  it("F: education and research-backed writing keep specialized behavior", () => {
    const edu = prepareAnswerQualityContext({
      mode: "gigalearn",
      query: "Explain photosynthesis for a junior high student in Accra",
    });
    expect(edu.responseMode).toBe("educational");
    expect(edu.systemPromptAddon).toContain("## ⚡ Quick Answer");

    const research = prepareAnswerQualityContext({
      mode: "research",
      query: "Write a research report about Ghana's AI industry with citations",
    });
    expect(research.responseMode).toBe("educational");
    expect(research.systemPromptAddon).toContain("GigaResearch");
  });
});

describe("writing craft pipeline wiring (G–H)", () => {
  it("G: identity and workers suppress provider/stack exposure for writing craft", () => {
    const identity = readFileSync(
      resolve(__dirname, "../../convex/assistantIdentity.ts"),
      "utf8"
    );
    expect(identity).toContain("Writing craft");
    expect(identity).toContain("Do not invent facts or claim a PDF/Word file");

    const worker = readFileSync(
      resolve(__dirname, "../../convex/chatReplyWorker.ts"),
      "utf8"
    );
    expect(worker).toContain("hasWritingCraftIntent");
    expect(worker).toContain("!writingCraft");

    const errors = readFileSync(
      resolve(__dirname, "../../web/lib/errors/userMessage.ts"),
      "utf8"
    );
    expect(errors).toContain("toUserFacingError");
  });

  it("H: chat typography tokens keep long replies readable on narrow screens", () => {
    const globals = readFileSync(
      resolve(__dirname, "../../web/styles/globals.css"),
      "utf8"
    );
    expect(globals).toContain("--chat-font-body: 1rem");
    expect(globals).toContain("--chat-font-conversation");
    expect(globals).toMatch(/\.chat-assistant-body[\s\S]*font-size:\s*var\(--chat-font-conversation\)/);

    const mobile = readFileSync(
      resolve(__dirname, "../../web/styles/chat-mobile-app.css"),
      "utf8"
    );
    expect(mobile).toMatch(
      /html\.chat-route \.chat-footer-chips[\s\S]*display:\s*none\s*!important/
    );
  });
});
