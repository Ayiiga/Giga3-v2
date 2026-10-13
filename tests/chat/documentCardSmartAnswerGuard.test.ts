import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isSmartAnswerShapedContent,
  looksLikeDocumentContent,
} from "../../web/lib/documents/model";

const EDUCATIONAL = `# Photosynthesis

## ⚡ Quick Answer
**Photosynthesis** turns light into food for a plant.

## 📘 Simple Definition
It is the process plants use to make **glucose** from light, water, and carbon dioxide.

## 🧠 More Complete Explanation
Chloroplasts capture light. The plant stores energy in sugar and releases oxygen.

## 🚀 Next Step
Ask how farmers in Ghana use shade nets.
`;

describe("Document Studio must not cover Smart Answers", () => {
  it("classifies Smart Answers as non-documents", () => {
    expect(isSmartAnswerShapedContent(EDUCATIONAL)).toBe(true);
    expect(looksLikeDocumentContent(EDUCATIONAL)).toBe(false);
  });

  it("keeps real CVs as documents", () => {
    const cv = `# Professional CV

## Contact
- Ama Mensah · ama@example.com · Accra

## Professional summary
Experienced basic school teacher with BECE preparation expertise across literacy and science clubs.

## Experience
### Classroom Teacher — Accra Academy Basic (2020 – Present)
- Improved literacy outcomes for P4 learners
- Led after-school reading club
- Mentored newly posted teachers each term
`;
    expect(looksLikeDocumentContent(cv)).toBe(true);
  });

  it("MessageBubble skips DocumentResultCard when Smart Answer is rendered", () => {
    const bubble = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageBubble.tsx"),
      "utf8"
    );
    expect(bubble).toContain("!smartAnswer");
    expect(bubble).toContain("looksLikeDocumentContent(content)");
  });

  it("DocumentStudio actions are not sticky in compact chat mode", () => {
    const studio = readFileSync(
      resolve(__dirname, "../../web/components/documents/DocumentStudio.tsx"),
      "utf8"
    );
    expect(studio).toContain("document-studio-actions");
    expect(studio).toMatch(/fullscreen\s*\?\s*"sticky bottom-0/);
    expect(studio).toMatch(/:\s*"relative z-0 pb-2"/);
    expect(studio).not.toMatch(
      /document-studio-actions sticky bottom-0 z-10 flex flex-wrap/
    );
  });
});
