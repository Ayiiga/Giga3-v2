# Staging smoke checklist — Document Studio & Marketplace (PR #478)

Use **Paystack test keys** (`sk_test_…` / `pk_test_…`) and **synthetic** seller/buyer accounts.  
Do **not** use production live keys or real national ID images of real people.

Legend for each step:

- **Code review** — verified by reading source / unit tests only  
- **Executed** — actually run in this environment / staging  
- **Deferred** — accepted risk until staging owner runs it  

---

## A. Paystack marketplace

| # | Step | Expected | Status |
|---|------|----------|--------|
| A1 | Buyer opens published, file-approved listing | Checkout enabled | Code review PASS (`purchaseReady` / `initializeMarketplacePayment`) |
| A2 | Start checkout with Paystack **test** card success | Redirect / popup success; payment `success` | **Deferred** (no Paystack test credentials in Cloud Agent) |
| A3 | Webhook / client verify with HMAC | `fulfillPayment` → `fulfillMarketplacePurchaseInternal` | Code review PASS; live webhook **Deferred** |
| A4 | Failed / cancelled charge | No purchase row; download locked | Code review PASS (`charge.failed` / amount mismatch → failed); live **Deferred** |
| A5 | Duplicate callback / double webhook | Idempotent; one purchase | Code review PASS (by_reference + buyer+listing) |
| A6 | My purchases shows download after A2 | `hasDownload` true when file approved | Code review PASS; live **Deferred** |

## B. Approved-file download & cross-user denial

| # | Step | Expected | Status |
|---|------|----------|--------|
| B1 | Buyer of approved listing calls download | Storage URL returned | Code review PASS (`getDownloadAccess`) |
| B2 | Buyer of pending-review file | No URL; `file_pending_review` / UI pending | Code review + unit tests PASS |
| B3 | User without purchase opens another user’s listing download | `allowed: false` | Code review PASS; live probe **Deferred** |
| B4 | Seller downloads own pending file | Allowed (creator bypass) | Code review PASS |

## C. Identity verification

| # | Step | Expected | Status |
|---|------|----------|--------|
| C1 | Submit valid synthetic ID + Ghana GPS (test policy) | Status `approved` | Code review PASS (`evaluateCreatorVerification` → approve); live GPS **Deferred** |
| C2 | Submit invalid ID / outside Ghana | Error; **not** marked verified | Code review + `creatorVerificationPolicy` tests PASS |
| C3 | Incomplete / pending UI | “Incomplete — resubmit” + support@giga3ai.com | Code review + UI source tests PASS |
| C4 | Rejected by admin | Needs resubmission + reason | Code review PASS |

## D. Document Studio PDF Unicode

| # | Step | Expected | Status |
|---|------|----------|--------|
| D1 | CV with only Latin text → PDF | No Unicode warning; file opens | Unit tests PASS; UI smoke **Executed** (static) |
| D2 | Document with CJK → Export PDF | Confirm dialog; no silent export | Unit + UI confirm path **Executed** (code); interactive click **Deferred** if no GUI agent |
| D3 | Same → Export Word | Full Unicode in DOCX | Unit tests PASS |

## E. Mobile keyboard + bottom nav

| # | Step | Expected | Status |
|---|------|----------|--------|
| E1 | `/documents/` at 390px; actions pad with `--primary-nav-offset` | Export bar not under nav | **Executed** (Playwright viewport + layout assert) |
| E2 | Focus editor; shrink viewport height (keyboard sim) | Export PDF still scrollable into view | **Executed** (Playwright) |
| E3 | Chat `DocumentResultCard` with real soft keyboard on device | Composer + export usable | **Deferred** (needs physical/device lab) |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Staging runner | | | |
| Release approver | | | Accept Deferred rows? Y/N |

**Cloud Agent note:** As of the PR #478 prep commits, live Paystack (A2–A6), live cross-user (B3), live GPS verify (C1), and physical soft keyboard (E3) remain **Deferred**. Code-review and automated tests are **not** substitutes for those rows.
