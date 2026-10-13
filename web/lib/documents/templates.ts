import type { DocumentTemplateKind, GigaDocument } from "@/lib/documents/types";
import { documentFromMarkdown } from "@/lib/documents/model";

type Seed = {
  kind: DocumentTemplateKind;
  title: string;
  description: string;
  markdown: string;
  paperSize?: "A4" | "A5";
  onePageFit?: boolean;
};

export const DOCUMENT_STUDIO_TEMPLATES: Seed[] = [
  {
    kind: "cv",
    title: "Professional CV (A4)",
    description: "One-page A4 CV for teaching and professional roles",
    paperSize: "A4",
    onePageFit: true,
    markdown: `# Professional CV

## Contact
- Full name:
- Email · Phone · Location
- LinkedIn / Portfolio:

## Professional summary
Two to three sentences tailored to the target role.

## Core skills
- Skill one · Skill two · Skill three

## Experience
### Role — Organisation (Year – Present)
- Achievement with measurable impact
- Achievement with measurable impact

## Education
### Qualification — Institution (Year)

## Certifications
- Certification name (Year)
`,
  },
  {
    kind: "cv",
    title: "Compact CV (A5)",
    description: "A5 one-page fit mode for shorter CVs",
    paperSize: "A5",
    onePageFit: true,
    markdown: `# CV

**Name** · Email · Phone · City

## Summary
One tight paragraph for the target role.

## Skills
- Skill · Skill · Skill

## Experience
**Role — Org (Year)**  
Key achievement.

## Education
Qualification — Institution (Year)
`,
  },
  {
    kind: "application-letter",
    title: "Application letter",
    description: "Formal letter for a job application",
    markdown: `# Application Letter

[Date]

[Hiring Manager Name]  
[Organisation]  

Dear Hiring Manager,

I am writing to apply for the [Role] position at [Organisation].

In my recent role at [Organisation], I [achievement]. I am drawn to your team because [reason].

I would welcome the opportunity to discuss how my experience supports your goals.

Yours sincerely,  
[Your Name]
`,
  },
  {
    kind: "business-plan",
    title: "Business plan",
    description: "Executive summary and core plan sections",
    markdown: `# Business Plan

## Executive summary
## Problem
## Solution
## Market
## Traction
## Business model
## Team
## Ask / funding
`,
  },
  {
    kind: "report",
    title: "Report",
    description: "Structured multi-page report",
    markdown: `# Report Title

## Introduction
## Findings
## Analysis
## Recommendations
## Conclusion
`,
  },
  {
    kind: "proposal",
    title: "Proposal",
    description: "Client or project proposal",
    markdown: `# Proposal

## Overview
## Scope of work
## Timeline
## Investment
## Next steps
`,
  },
  {
    kind: "lesson-notes",
    title: "Lesson notes",
    description: "Ghana classroom lesson note outline",
    markdown: `# Lesson Notes

**Subject:**  
**Class / Level:**  
**Topic:**  
**Duration:**  

## Objectives
- Learners will be able to…

## Teaching / learning materials
## Introduction
## Main activities
## Assessment
## Conclusion / homework
`,
  },
  {
    kind: "meeting-minutes",
    title: "Meeting minutes",
    description: "Attendance, agenda, actions",
    markdown: `# Meeting Minutes

**Date:**  
**Attendees:**  

## Agenda
## Discussion
## Decisions
## Action items
- [ ] Owner — task — due date
`,
  },
  {
    kind: "invoice",
    title: "Invoice",
    description: "Simple invoice layout",
    markdown: `# Invoice

**From:**  
**To:**  
**Invoice #:**  
**Date:**  

| Item | Qty | Amount (GHS) |
| --- | --- | --- |
| Service | 1 | 0 |

**Total (GHS):**  
**Payment details:**
`,
  },
  {
    kind: "memo",
    title: "Memo",
    description: "Internal memorandum",
    markdown: `# Memorandum

**To:**  
**From:**  
**Date:**  
**Subject:**  

## Body
`,
  },
];

export function createDocumentFromTemplate(kind: DocumentTemplateKind, variantTitle?: string): GigaDocument {
  const seed =
    DOCUMENT_STUDIO_TEMPLATES.find(
      (t) => t.kind === kind && (!variantTitle || t.title === variantTitle)
    ) ?? DOCUMENT_STUDIO_TEMPLATES.find((t) => t.kind === kind) ?? DOCUMENT_STUDIO_TEMPLATES[0]!;
  return documentFromMarkdown(seed.markdown, {
    title: seed.title,
    templateKind: seed.kind,
    paperSize: seed.paperSize,
    onePageFit: seed.onePageFit,
  });
}
