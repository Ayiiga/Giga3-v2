# Ghana KG2 visual coverage report

Generated: 2026-10-09T14:15:19.266Z

## Totals

| Metric | Count |
|--------|------:|
| KG2 catalog items | 96 |
| Items with suitable HQ visuals | 48 |
| Remaining placeholders | 48 |
| HQ WebP files on disk | 41 |
| Manifest assets awaiting educator review | 41 |

Unique HQ WebP files are counted once in `hqWebpFilesOnDisk`. Catalog items that reuse a shared poster (e.g. mango fruit + mango rhyme) each count in `withSuitableHqVisuals` but do not inflate the unique asset total.

## By learning group

| Group | Total | With HQ | Placeholders |
|-------|------:|--------:|-------------:|
| cultureCrafts | 35 | 5 | 30 |
| communityOccupations | 13 | 11 | 2 |
| fruitsFoods | 11 | 9 | 2 |
| animals | 10 | 7 | 3 |
| coloursShapes | 9 | 4 | 5 |
| alphabetPhonics | 6 | 4 | 2 |
| schoolHousehold | 5 | 5 | 0 |
| bodySenses | 3 | 2 | 1 |
| numbersMath | 2 | 1 | 1 |
| other | 1 | 0 | 1 |
| environments | 1 | 0 | 1 |

## Notes

- HQ assets are original fal.ai generations (`fal-ai/flux/schnell`). **Not educator-reviewed.**
- Generated speech (espeak-ng / browser TTS) remains distinct from educator-reviewed native recordings.
- Story posters use storybook illustration style; object cards stay photographic.

## Educator review checklist

All fal-generated assets ship with `licensing.reviewed: false`. Before certification claims, review:

- [ ] Counting accuracy (exactly 3 oranges, 4 bananas, 5 mangoes)
- [ ] Ghana flag colours and black star accuracy
- [ ] Cultural accuracy for kente, talking drum, potter, market seller, weaver
- [ ] Child-safe body-part photos (hand, eye)
- [ ] Occupation depictions respectful and non-stereotyped
- [ ] Ananse storybook style consistent and age-appropriate
- [ ] No readable brand logos or accidental text inside images
- [ ] No mixing of photographic and storybook styles within one collection card

## Regeneration

```bash
FAL_API_KEY=… node scripts/gigalearn-generate-kg2-hq.mjs   # skips existing unless FAL_FORCE=1
node scripts/gigalearn-kg2-hq-coverage.mjs
```
