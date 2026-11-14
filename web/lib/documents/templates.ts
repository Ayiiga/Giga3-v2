import type { DocumentTemplateKind, GigaDocument } from "@/lib/documents/types";
import { documentFromMarkdown } from "@/lib/documents/model";

type Seed = {
  kind: DocumentTemplateKind;
  title: string;
  description: string;
  markdown: string;
  paperSize?: "A4" | "A5";
  onePageFit?: boolean;
  pageTarget?: 1 | 2;
};

export const DOCUMENT_STUDIO_TEMPLATES: Seed[] = [
  {
    kind: "cv",
    title: "Professional CV (A4)",
    description: "One-page A4 CV for teaching and professional roles",
    paperSize: "A4",
    onePageFit: true,
    pageTarget: 1,
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
    pageTarget: 1,
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
    kind: "cv",
    title: "Experienced CV (2 pages)",
    description: "Professional A4 CV for experienced candidates; two-page target without cutting content",
    paperSize: "A4",
    onePageFit: false,
    pageTarget: 2,
    markdown: `# Full Name

Professional title · City, Country · Email · Phone · Portfolio

## Professional profile
Three to four natural, role-specific sentences with a clear professional focus. Use only confirmed experience.

## Key skills
- Relevant skill · Relevant skill · Relevant skill

## Professional experience
### Current role — Organisation (Year–Present)
- Relevant accomplishment with evidence; include measurable outcomes only if verified
- Scope of responsibilities and contribution

### Previous role — Organisation (Year–Year)
- Relevant accomplishment with evidence

## Education
### Qualification — Institution (Year)

## Professional development
- Relevant certification or training (if applicable)

## Leadership and projects
- Relevant leadership position or project (if applicable)

## References
Available upon request, unless names are specifically requested.
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
    kind: "book",
    title: "Book manuscript",
    description: "Full-length manuscript with chapters, front matter and end matter",
    markdown: `# Book title

## Subtitle

## Author

## Preface

## Table of contents

## Chapter 1 — Introduction

## Chapter 2

## Conclusion

## References and further reading (when applicable)

## About the author
`,
  },
  {
    kind: "research-paper",
    title: "Research paper",
    description: "Academic structure, methods, findings and verifiable references",
    markdown: `# Research title

## Author and affiliation

## Abstract

## Keywords

## Introduction

## Literature review

## Methods

## Results

## Discussion and limitations

## Conclusion

## References (only verified sources)
`,
  },
  {
    kind: "thesis",
    title: "Thesis / dissertation",
    description: "Long-form academic work with chapters, ethics and references",
    markdown: `# Thesis title

## Candidate, institution and degree

## Declaration and acknowledgements

## Abstract

## Table of contents

## Chapter 1: Introduction

## Chapter 2: Literature review

## Chapter 3: Methodology

## Chapter 4: Results

## Chapter 5: Discussion

## Chapter 6: Conclusions and recommendations

## References (verified only)

## Appendices
`,
  },
  {
    kind: "presentation",
    title: "Professional presentation",
    description: "Slide headings and concise speaker-ready bullet points",
    markdown: `# Presentation title

## Opening / overview
- Main message
- Audience and objective

## Problem / context
- Key point
- Evidence or example

## Findings
- Finding one
- Finding two

## Recommendations
- Action one
- Action two

## Questions
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
    pageTarget: seed.pageTarget,
  });
}
