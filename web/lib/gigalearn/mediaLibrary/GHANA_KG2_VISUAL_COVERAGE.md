# Ghana KG2 visual coverage report

Generated: 2026-10-09T13:47:52.992Z

## Totals

| Metric | Count |
|--------|------:|
| KG2 catalog items | 96 |
| Items with suitable HQ visuals | 48 |
| Remaining placeholders | 48 |
| HQ WebP files on disk | 41 |
| Manifest assets awaiting educator review | 41 |

## By learning group

| Group | Total | With HQ | Placeholders |
|-------|------:|--------:|-------------:|
| communityOccupations | 27 | 12 | 15 |
| cultureCrafts | 16 | 3 | 13 |
| fruitsFoods | 12 | 10 | 2 |
| animals | 11 | 8 | 3 |
| coloursShapes | 9 | 4 | 5 |
| bodySenses | 7 | 2 | 5 |
| alphabetPhonics | 6 | 4 | 2 |
| schoolHousehold | 5 | 5 | 0 |
| numbersMath | 3 | 0 | 3 |

## Notes

- HQ assets are original fal.ai generations (`fal-ai/flux/schnell`). **Not educator-reviewed.**
- Generated speech (espeak-ng / browser TTS) remains distinct from educator-reviewed native recordings.
- Story posters use storybook illustration style; object cards stay photographic.

## Educator review checklist

All fal-generated assets ship with `licensing.reviewed: false`. Before any certification claims, review:

- [ ] Counting accuracy (exactly 3 oranges, 4 bananas, 5 mangoes)
- [ ] Ghana flag colours and black star accuracy
- [ ] Cultural accuracy for kente, talking drum, potter, market seller, weaver
- [ ] Child-safe body-part photos (hand, eye)
- [ ] Occupation depictions respectful and non-stereotyped
- [ ] Ananse storybook style consistent and age-appropriate
- [ ] No readable brand logos or accidental text inside images
- [ ] No mixing of photographic and storybook styles within one collection card

## Remaining placeholder backlog (priority)

Still emoji/SVG-first after this expansion (see `ghanaKg2VisualCoverageReport.json`):

- Most Phase 2 songs and many rhymes/stories without dedicated posters
- Additional body senses, colours/shapes, alphabet letters C–Z
- Broader maths (add/subtract/money/time) and more occupations

## Regeneration

```bash
FAL_API_KEY=… node scripts/gigalearn-generate-kg2-hq.mjs   # skips existing unless FAL_FORCE=1
node scripts/gigalearn-kg2-hq-coverage.mjs
```
