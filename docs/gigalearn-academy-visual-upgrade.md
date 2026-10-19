# GigaLearn Academy — Visual Design Upgrade

**Branch:** `cursor/gigalearn-academy-visual-upgrade-161d`  
**Base:** `cursor/gigalearn-academy-exam-integrate-161d`  
**Scope:** Presentation only — no schema, grading, credits, or route behaviour changes.

## Colour tokens

`web/lib/gigalearn/academy/visualTheme.ts` + CSS in `web/styles/globals.css`:

| Surface / studio | Background | Foreground |
|------------------|------------|------------|
| Hero | `#4C1D95` → `#312E81` gradient | `#FFFFFF` |
| Dashboard | `#F3E8FF` | `#2E1065` |
| Practice Centre | `#1E3A8A` gradient | `#FFFFFF` |
| Performance tiles | `#DCFCE7` | `#14532D` |
| Certificates | `#FEF3C7` | `#78350F` |
| Catalogue | `#FFFFFF` | `#0F172A` |
| GigaAI | `#312E81` | `#FFFFFF` |
| GigaWeb | `#DBEAFE` | `#172554` |
| GigaPWA | `#CCFBF1` | `#134E4A` |
| GigaApp | `#FFEDD5` | `#7C2D12` |
| GigaCoding | `#EDE9FE` | `#4C1D95` |
| GigaRobotics | `#CFFAFE` | `#164E63` |
| GigaInnovation | `#FFE4E6` | `#881337` |

## Accessibility

- Status still uses text labels (“Available” / “Coming soon”), not colour alone.
- Focus-visible outlines on CTAs.
- `prefers-reduced-motion` gates decorative transitions.
- Catalogue / long course text stays on white.

## Unchanged

Enrolments, assessments, certificates logic, deep links, BECE/Exam separation.
