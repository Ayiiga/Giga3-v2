# GigaEdits Creator Growth — 30-Day Validation Plan

**Status:** Planning materials only. No outreach, payments, merges, or production changes have been executed from this document.  
**Product surface:** `/gigaedit/?tab=templates` — Creator Growth Starter Pack  
**Code branch / PR (implementation):** `cursor/gigaedits-starter-pack-161d` / PR #487 (draft)  
**Verified head (implementation):** `014aeb2a579d07aadf43bae2812c372d65415f87`

---

## 1. One-page Starter Pack description (honest scope)

### What it is

A free, curated set of **three existing** GigaEdits format starters for beginner creators:

| Template | ID | Opens | Aspect |
|----------|-----|-------|--------|
| Hook Reel | `hook-reel` | Video editor | 9:16 |
| YouTube Intro | `yt-intro` | Video editor | 16:9 |
| Promo Poster | `poster-promo` | Photo editor | 4:5 |

**Use template** creates a local draft project with the correct canvas size and a starter title, then opens the matching editor. Creators import their own photo or video, edit with existing tools, and export with the existing export flows.

### What it is not

- Not predesigned CapCut-style layouts with beat markers, transitions packs, or multi-clip stories already placed on a timeline.
- Not an AI layout generator and not a paid template marketplace.
- Not a subscription or membership product (no checkout in this experiment).
- Does not require a paid AI provider call to open a starter.

### Current limitations (disclose in every demo)

1. Creator must supply media (phone camera roll / files).
2. Title/text and filters are available in-editor; advanced “template layout” claims are unsupported.
3. Export quality and device performance vary by browser and hardware.
4. Projects are stored locally (IndexedDB) on the device/browser used.
5. Willingness-to-pay and annual pricing are **unvalidated hypotheses**.

### Who it is for (experiment audiences)

- Beginner / aspiring short-form creators (Reels, TikTok, Shorts).
- YouTube creators needing a quick 16:9 project start.
- Small businesses / creators needing a simple promo graphic (4:5).
- English-speaking creators worldwide, including Ghana and other African markets.

---

## 2. Short mobile demonstration scripts

Record or walk through on a phone-sized viewport. Use **synthetic / disposable** media only. Do **not** publish to real social accounts during the experiment unless the creator chooses to do so with their own accounts.

### Script A — Hook Reel (`hook-reel`) ~90 seconds

1. Open `/gigaedit/?tab=templates`.
2. Point to **Creator Growth Starter Pack** → **Hook Reel** (9:16).
3. Tap **Use template**. Confirm video editor opens with 9:16 and title “Hook Reel”.
4. Import a short disposable vertical clip (5–15s).
5. Optionally edit on-screen text; scrub timeline.
6. Export / save using the existing video export control.
7. Say aloud: “This starts the right canvas. You still import and finish the edit yourself.”

### Script B — YouTube Intro (`yt-intro`) ~90 seconds

1. Return to Templates → **YouTube Intro** (16:9).
2. Tap **Use template**. Confirm landscape video editor.
3. Import a disposable landscape clip.
4. Adjust title overlay if useful.
5. Export with existing flow.
6. Contrast with Hook Reel: same product, different aspect for YouTube-sized work.

### Script C — Promo Poster (`poster-promo`) ~90 seconds

1. Templates → **Promo Poster** (4:5).
2. Tap **Use template**. Confirm photo editor.
3. Import a disposable still image.
4. Adjust title text and/or a simple filter if available.
5. Export PNG with existing photo export.
6. Say aloud: “Poster path for feed/promo graphics — still your image, not a generated design pack.”

---

## 3. Creator interview questionnaire

Use respectfully. Prefer verbal or written answers. **Do not** collect government IDs, exact addresses, or payment card numbers. Use an anonymous participant ID (e.g. `C01`, `C02`).

**Consent line (read first):**  
“This is unpaid product research for Giga3 GigaEdits. You can skip any question. We will not publish your name without separate permission. Answers help us decide whether to improve or stop this offer.”

1. What kind of creator are you today? (short-form / YouTube / small business / other)
2. What tools do you already use for editing? (CapCut, InShot, Canva, phone gallery only, etc.)
3. Did you try at least one Starter Pack template? Which one(s)?
4. Did you successfully import your own media?
5. Did you complete an export (or get stuck before export)?
6. What was the main difficulty, if any?
7. On a scale of 1–5, how useful was the starter for a real piece of content you need?
8. Would you open GigaEdits again next week for a similar task? Why / why not?
9. If a paid creator toolkit existed later (hypothesis — not sold today), what would need to be true for you to consider paying?
10. A **hypothetical** offer under test is about **US$100 / year** for ongoing creator tooling access. Does that feel too high, about right, or too low *for the value you actually got today*? (Hypothesis only — no purchase request in this interview.)
11. Anything we should not build / should fix first?

---

## 4. Feedback tracking

Use `docs/gigaedits-creator-growth-feedback.csv` (spreadsheet-compatible).  
Fields:

| Field | Meaning |
|-------|---------|
| `participant_id` | Anonymous ID (`C01`…) |
| `creator_type` | short_form / youtube / small_business / other |
| `week` | Experiment week 1–5 |
| `outreach_channel` | e.g. community, referral, warm intro — no personal contact data |
| `starter_tried` | hook-reel / yt-intro / poster-promo / none / multiple |
| `imported_media` | yes / no / unknown |
| `export_completed` | yes / no / unknown |
| `main_difficulty` | Free text (short) |
| `perceived_value_1_to_5` | Integer 1–5 or blank |
| `intention_to_reuse` | yes / no / unsure |
| `willingness_to_pay_signal` | none / soft_interest / strong_interest / rejected_price / rejected_product |
| `stated_price_reaction` | too_high / about_right / too_low / n_a |
| `actual_purchase_status` | none / independently_verified_paid — **never invent** |
| `notes` | Short factual notes only |
| `recorded_on` | ISO date |

**Rules:** Views, likes, compliments, and “sounds cool” ≠ paid demand. Only mark `actual_purchase_status` if payment is independently verified through an **already approved** channel (none is implemented for this pack).

---

## 5. 30-day schedule (solo founder, full-time job)

Assume ~5–7 focused hours/week outside work.

| Week | Focus | Activity targets |
|------|--------|------------------|
| **0 (prep)** | Materials ready | Rehearse 3 demo scripts on mobile; confirm Templates tab copy is honest; print/questionnaire ready |
| **1** | Soft outreach | 3–5 respectful outreach attempts; aim for 2–3 conversations; log rows in CSV |
| **2** | Observed tries | 3–5 outreach attempts; prioritize live or screen-share tries of one starter; note export completion |
| **3** | Depth + price hypothesis | Continue to ≥10 cumulative meaningful conversations; ask willingness-to-pay questions **without** collecting payment |
| **4** | Synthesis | Tally CSV; apply decision criteria (below); write go / iterate / stop recommendation |
| **Buffer** | Catch-up | Only if weeks 1–2 slipped; do not extend forever without a decision |

**Weekly cadence example (evenings):**

- Mon: 30–45 min — 1–2 outreach messages (warm/community only; no spam).
- Wed: 45–60 min — 1 demo or interview.
- Sat: 60–90 min — 1–2 demos/interviews + CSV update.
- Sun: 30 min — note patterns (understanding / usability / reuse / price).

**Experiment aims (learning targets, not guarantees):**

- 3–5 meaningful outreach attempts per week.
- ≥10 meaningful creator conversations in 30 days.
- Real attempts to use existing starters (not only watching a demo).
- Honest feedback on ease, usefulness, gaps, reuse intent.
- Stated reactions to a **hypothetical** paid offer (US$100/year is unvalidated).

**Stretch (only if a legitimate, separately approved payment path already exists):** up to 3 independently verified paying creators. Do **not** build checkout for this experiment. Do **not** invent purchases.

---

## 6. Decision criteria

These are **initial learning thresholds**, not statistical significance claims.

| Signal | Interpretation | Next move |
|--------|----------------|-----------|
| Creators do not understand the starters | Messaging / demo gap | Improve descriptions and demo scripts only |
| Creators try but cannot finish import→export | Usability / product gap in **existing** editors | Investigate smallest existing UX fix; do not add new template engines yet |
| Creators export once but will not return | Low recurring value | Question whether format starters alone justify a paid offer |
| Interest but reject offer / price | Offer, trust, or audience mismatch | Revisit price hypothesis, packaging, and who is targeted — still no billing build |
| Reject product even free | Wrong problem | Stop or pivot audience; do not expand template library |
| Repeated use + credible willingness to pay | Promising | Recommend **smallest** evidence-backed improvement only |

**Continue** if: ≥10 conversations completed, several successful exports, and reuse intent or strong willingness-to-pay signals appear without fabricating data.  
**Improve the offer** if: usability is OK but value/price messaging fails.  
**Stop** if: creators consistently cannot complete the flow, or free users see no reason to return, or price interest is near-zero after clear demos.

---

## 7. Proposed paid offer (hypothesis only — not implemented)

- **Hypothesis to test in conversation:** ~US$100 / year for ongoing access to creator editing tooling / future curated value.
- **Not established market price.** Test perceived value before treating as proven.
- **This experiment does not** implement Paystack/checkout, entitlements, or paywalls for the Starter Pack.
- Free Starter Pack remains the acquisition / learning surface.

---

## 8. Evidence required before claiming the offer is worth pursuing

Minimum evidence package:

1. CSV with ≥10 meaningful conversation rows (anonymous).
2. Count of starters tried and exports completed (factual).
3. Top 3 difficulties (quoted or paraphrased without PII).
4. Distribution of intention_to_reuse and willingness_to_pay_signal.
5. Explicit note that `actual_purchase_status` is `none` unless independently verified.
6. A written founder decision: continue / improve offer / stop — dated.

---

## 9. Smallest next action for the founder

1. Rehearse Script A on a phone against the live Templates tab (or local `/gigaedit/?tab=templates`).
2. Identify **warm** outreach list of 5 creators/communities (no cold spam).
3. Run Week 1: 3–5 outreach attempts; log every conversation in the CSV.
4. Do **not** merge PR #487, deploy, or enable payments until you explicitly approve those steps after reviewing learning.

---

## Verified facts vs assumptions vs recommendations

| Kind | Statement |
|------|-----------|
| **Verified** | Starter Pack IDs are `hook-reel`, `yt-intro`, `poster-promo` from shared `GIGAEDIT_TEMPLATES`. |
| **Verified** | Behavior is format seed (aspect + title) into empty project; editors/export are existing. |
| **Verified** | Vitest for starter pack + related modules passed on this branch (see report). |
| **Assumption** | Creators will care enough to try if outreach is warm and demos are honest. |
| **Assumption** | US$100/year might be acceptable to some — unvalidated. |
| **Recommendation** | Run the 30-day learning loop with docs/CSV only before building layouts, AI packs, or billing. |
