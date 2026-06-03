import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutTemplate,
  Megaphone,
  PenLine,
  Presentation,
  ScrollText,
} from "lucide-react";

export type DocumentTemplateId =
  | "resume"
  | "cover-letter"
  | "book-writing"
  | "thesis"
  | "research-paper"
  | "business-plan"
  | "proposal"
  | "report"
  | "essay"
  | "presentation"
  | "content-creation";

export interface DocumentTemplate {
  id: DocumentTemplateId;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Uses {{DATE}}, {{DATETIME}}, {{YEAR}}, {{TIME}} — resolved at insert time. */
  body: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: "resume",
    title: "Resume / CV",
    description: "ATS-friendly professional summary and experience",
    icon: FileText,
    body: `# Resume / CV — {{DATE}}

## Contact
- Full name:
- Email:
- Phone:
- Location:
- LinkedIn / Portfolio:

## Professional summary
Write a 2–3 sentence summary tailored to the target role.

## Core skills
- Skill 1 · Skill 2 · Skill 3

## Experience
### Job title — Company ({{YEAR}} – Present)
- Achievement with measurable impact
- Achievement with measurable impact

## Education
### Degree — Institution (Year)

## Certifications (optional)

---
Instructions for AI: Improve clarity, use strong action verbs, and keep formatting ATS-friendly. Ask me for my target role if missing.`,
  },
  {
    id: "cover-letter",
    title: "Cover Letter",
    description: "Tailored letter for a specific role and company",
    icon: ScrollText,
    body: `{{DATE}}

[Hiring Manager Name]
[Company Name]
[Company Address — optional]

Dear Hiring Manager,

I am writing to apply for the [Job Title] position at [Company Name]. With [X years] of experience in [field], I am excited to contribute [specific value].

In my recent role at [Company], I [key achievement with metric]. I am particularly drawn to [Company] because [specific reason].

I would welcome the opportunity to discuss how my background in [skills] aligns with your team's goals.

Sincerely,
[Your Name]

---
Instructions for AI: Personalize tone, tighten prose, and match the job description I provide.`,
  },
  {
    id: "book-writing",
    title: "Book Writing",
    description: "Outline, chapters, and narrative development",
    icon: BookOpen,
    body: `# Book project — started {{DATETIME}}

## Working title

## Genre & audience

## Premise (1 paragraph)

## Themes

## Main characters
| Name | Role | Goal | Conflict |
|------|------|------|----------|

## Three-act outline
1. **Act I — Setup:**
2. **Act II — Confrontation:**
3. **Act III — Resolution:**

## Chapter plan
- Chapter 1:
- Chapter 2:

## Tone & style notes

---
Instructions for AI: Help expand the outline, suggest chapter beats, and maintain consistent voice.`,
  },
  {
    id: "thesis",
    title: "Thesis",
    description: "Graduate thesis structure and chapter guidance",
    icon: GraduationCap,
    body: `# Thesis — {{DATE}}

## Title (working)

## Degree program / Department

## Abstract (draft)
Summarize problem, method, findings, and contribution in 250 words.

## Research questions
1.
2.

## Literature review themes
-

## Methodology

## Expected chapters
1. Introduction
2. Literature Review
3. Methodology
4. Results
5. Discussion
6. Conclusion

## Timeline ({{YEAR}})

---
Instructions for AI: Strengthen academic tone, suggest citations to search for, and flag gaps in argument.`,
  },
  {
    id: "research-paper",
    title: "Research Paper",
    description: "IMRaD-style academic paper draft",
    icon: FileBarChart,
    body: `# Research paper — {{DATE}}

## Title

## Authors

## Abstract
Background · Methods · Results · Conclusion (150–250 words)

## Keywords

## 1. Introduction
Problem statement and research gap.

## 2. Related work

## 3. Methods
Data, participants, analysis.

## 4. Results
Key findings with figures/tables noted.

## 5. Discussion
Interpretation, limitations, future work.

## 6. Conclusion

## References (placeholder)

---
Instructions for AI: Improve clarity, suggest section transitions, and highlight where evidence is needed.`,
  },
  {
    id: "business-plan",
    title: "Business Plan",
    description: "Executive summary through financial outlook",
    icon: Briefcase,
    body: `# Business plan — {{DATE}}

## Executive summary

## Company overview
- Mission:
- Vision:
- Legal structure:

## Market analysis
- Target market:
- Competitors:
- Differentiation:

## Products & services

## Marketing & sales strategy

## Operations plan

## Management team

## Financial projections ({{YEAR}}–{{YEAR}}+3)
- Revenue assumptions:
- Key costs:
- Break-even timeline:

## Funding ask (if applicable)

---
Instructions for AI: Make the plan investor-ready, challenge weak assumptions, and suggest metrics.`,
  },
  {
    id: "proposal",
    title: "Proposal",
    description: "Project or grant proposal with scope and deliverables",
    icon: LayoutTemplate,
    body: `# Proposal — {{DATE}}

## Project title

## Client / Sponsor

## Problem statement

## Objectives
1.
2.

## Scope of work & deliverables
| Phase | Deliverable | Timeline |
|-------|-------------|----------|

## Methodology / approach

## Team & roles

## Budget summary

## Success criteria

## Risks & mitigations

---
Instructions for AI: Tighten scope, improve persuasion, and align deliverables with objectives.`,
  },
  {
    id: "report",
    title: "Report",
    description: "Structured business or technical report",
    icon: FileBarChart,
    body: `# Report — {{DATE}}

## Report title

## Prepared for

## Prepared by

## Executive summary

## Background

## Findings
### Finding 1

### Finding 2

## Analysis

## Recommendations
1.
2.

## Next steps

## Appendices (optional)

---
Instructions for AI: Improve structure, use clear headings, and make recommendations actionable.`,
  },
  {
    id: "essay",
    title: "Essay",
    description: "Argumentative or analytical essay scaffold",
    icon: PenLine,
    body: `# Essay — {{DATE}}

## Title

## Prompt / Question

## Thesis statement
One clear claim answering the prompt.

## Outline
### Introduction
- Hook:
- Context:
- Thesis:

### Body paragraph 1
- Topic sentence:
- Evidence:
- Analysis:

### Body paragraph 2

### Conclusion
- Restate thesis:
- Broader implication:

## Word target:

---
Instructions for AI: Strengthen thesis, improve flow, and suggest evidence. Match academic level I specify.`,
  },
  {
    id: "presentation",
    title: "Presentation",
    description: "Slide deck outline with speaker notes",
    icon: Presentation,
    body: `# Presentation — {{DATETIME}}

## Title

## Audience

## Goal (what should they do/remember?)

## Duration

## Slide outline
1. **Title slide** — hook
2. **Problem / context**
3. **Key insight 1** — speaker notes:
4. **Key insight 2** — speaker notes:
5. **Data / proof**
6. **Solution / recommendation**
7. **Call to action**
8. **Q&A**

## Visual notes (charts, icons, demos)

---
Instructions for AI: Suggest slide titles, bullet points, and concise speaker notes.`,
  },
  {
    id: "content-creation",
    title: "Content Creation",
    description: "Blog, social, and campaign content brief",
    icon: Megaphone,
    body: `# Content brief — {{DATE}}

## Brand / Channel

## Campaign goal

## Target audience

## Key message

## Tone (e.g. professional, playful, authoritative)

## Content formats
- [ ] Blog post
- [ ] Social thread
- [ ] Newsletter
- [ ] Video script

## Outline / draft
### Hook

### Body points
1.
2.
3.

### CTA

## SEO keywords (optional)

## Publishing date target: {{DATE}}

---
Instructions for AI: Draft on-brand copy, propose hooks, and adapt length per platform.`,
  },
];

export function getDocumentTemplate(id: DocumentTemplateId): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.id === id);
}
