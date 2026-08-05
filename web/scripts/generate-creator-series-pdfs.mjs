/**
 * Generate official Giga3 Creator Academy PDF series (4 × GHS 150.00).
 * Run: node scripts/generate-creator-series-pdfs.mjs
 */
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public/marketplace/series");
const coverDir = path.join(outDir, "covers");

const PRICE = "GHS 150.00";
const SITE = "https://www.giga3ai.com";

const series = [
  {
    id: "series-1",
    file: "giga3-series-1-platform-foundations.pdf",
    cover: "series-1.svg",
    accent: "#0f766e",
    number: 1,
    title: "Platform Foundations",
    subtitle: "Install, chat, models, credits & offline",
    chapters: [
      {
        h: "1. Welcome to Giga3 AI",
        body: `Giga3 AI is a progressive web app (PWA) for creators in Ghana and beyond. Open ${SITE} in a modern browser (Chrome, Safari, Edge, or Samsung Internet). The product combines AI chat, Media Studio, GigaEdit, GigaSocial, GigaLearn, and a digital marketplace — one shell, multiple creator workspaces.

This Series 1 handbook is the official foundation volume of the Giga3 Creator Academy. Each Academy series is sold separately at ${PRICE}. Complete all four series for the full platform curriculum.`,
      },
      {
        h: "2. Installing the PWA",
        body: `On Android Chrome: open the site → browser menu → Install app / Add to Home screen. On iOS Safari: Share → Add to Home Screen. On desktop Chrome/Edge: use the install icon in the address bar.

Once installed, Giga3 launches in a standalone window with its own icon. The service worker caches the marketing shell and key offline routes so the app opens even when the network is slow. After major releases, hard-refresh or clear the PWA cache so you receive the latest shell (cache names follow giga3-shell-v*). Never rely on a stale service worker when debugging UI issues.`,
      },
      {
        h: "3. Accounts, sessions & navigation",
        body: `Sign in from Chat login. Your session token unlocks chat history, purchases, creator tools, and GigaSocial. The workspace rail surfaces GigaSocial, GigaEdit, GigaLearn, Media, Marketplace, and more. Marketing pages use a stable layout (marketing-stable) designed to avoid mobile GPU tearing; chat uses chat-stable to prevent scroll jitter.

Bookmark ${SITE}/chat/ for conversation, ${SITE}/marketplace/ for digital products, and ${SITE}/gigaedit/ for the editor. Deep links such as /media?source=… open Image Studio in edit mode when a source image is provided.`,
      },
      {
        h: "4. Chat platform & dual backend",
        body: `Default data backend is Convex (NEXT_PUBLIC_GIGA3_DATA_BACKEND=convex): chat history and AI orchestration live there. An optional Supabase mode stores chat history in Supabase while AI send/reply still goes through Convex HTTP (chatMessaging:acceptMessage). Billing, media jobs, and Paystack always remain on Convex.

On slow mobile networks, the client uses shared timings in chatNetwork plus resilient hooks (useChatPlatform / useSupabaseChatPlatform). Prefer stable Wi‑Fi when uploading large media; text chat is optimized for intermittent connections.`,
      },
      {
        h: "5. Model tiers: Fast, Smart, Vision, Creator",
        body: `Giga3 exposes approachable model tiers that map to existing Convex mode IDs (see gigaModels). Fast prioritizes quick replies; Smart balances depth; Vision understands images; Creator is tuned for long-form and production workflows. Choosing a tier changes cost in credits and response style — match the tier to the job (brainstorm vs caption vs script vs lesson plan).

Interest profiling may batch every few messages to personalize suggestions without writing the database on every keystroke. Credits are queried via dedicated chat credit APIs so the composer stays light.`,
      },
      {
        h: "6. Themes, accessibility & voice",
        body: `ThemeProvider applies light/dark via a dark class on <html> — chat does not hardcode a single theme. Prefer readable contrast for long sessions. Voice dictation uses the browser SpeechRecognition API where available; the site headers allow microphone=(self). Speak clearly, pause between sentences, and review dictated text before sending.

Pull-to-refresh is disabled on chat to protect scroll position. Use normal navigation or a hard refresh when you need a clean load.`,
      },
      {
        h: "7. Offline habits that stick",
        body: `The PWA precaches public shell routes (home, offline page, icons, pricing, login, GigaEdit entry). Authenticated surfaces are not blindly cached. When offline, open the installed app → Offline page for guidance. Draft text locally before sending; large media jobs require connectivity.

Creator tip: install the PWA before traveling, keep Series PDFs in My purchases for offline reading after download, and finish GigaEdit exports while online so publish handoff can complete.`,
      },
      {
        h: "8. Workspaces map",
        body: `Giga3 workspaces (typical order): GigaSocial (community), GigaEdit (production), GigaLearn (lessons), Media Studio (generation), Marketplace (sell/buy), Chat (AI companion). Treat Chat as your always-on strategist; treat GigaEdit + GigaSocial as the public stage; treat Marketplace as the storefront.

Render probes (?renderProbe=1) help engineers diagnose chat re-render storms — creators can ignore them unless support asks for console snapshots.`,
      },
      {
        h: "9. Credits, subscriptions & fair use",
        body: `Chat and media jobs consume credits or subscription entitlements configured on Convex. Credit packs and plans are priced in GHS via Paystack. Check balance before batch image/video runs. If a job fails after debit policies differ by product — retry once, then contact support with the approximate time and feature used.

Starter credits may apply for new accounts. Do not share login sessions across devices in ways that confuse purchase ownership.`,
      },
      {
        h: "10. Download this PDF after purchase",
        body: `Buy with Paystack on ${SITE}/marketplace — never pay outside the app. Sign in with the same account, open My purchases, then tap Download PDF (or open the listing and download there). Files unlock only after payment is recorded for your buyer account.`,
      },
      {
        h: "11. Series 1 checklist",
        body: `□ Install Giga3 as a PWA on your primary phone
□ Sign in and send a test chat on Fast and Smart
□ Toggle theme and confirm the shell remains readable
□ Open Marketplace, GigaEdit, and GigaSocial from the workspace
□ Note your credit balance before a long Creator session
□ Hard-refresh after any announced production deploy
□ Confirm My purchases download works for this series after buying

Next: Series 2 — Create & Publish covers Media Studio, GigaEdit, cameras, and export to GigaSocial (${PRICE}).`,
      },
    ],
  },
  {
    id: "series-2",
    file: "giga3-series-2-create-and-publish.pdf",
    cover: "series-2.svg",
    accent: "#047857",
    number: 2,
    title: "Create & Publish",
    subtitle: "Media Studio, GigaEdit, cameras & export",
    chapters: [
      {
        h: "1. The creator production loop",
        body: `Series 2 documents the Giga3 make → refine → publish loop. Generate or capture media, refine in GigaEdit, then hand off to GigaSocial. Official Academy price for this volume: ${PRICE}. Production site: ${SITE}.`,
      },
      {
        h: "2. Media Studio fundamentals",
        body: `Media Studio queues generation jobs and shows recent generations for polling — keep job watching in RecentGenerationsSection while the form lives in MediaGeneratePanel. Root layout uses min-h-full (avoid nested dvh traps). Image generation failover order is fal.ai → Replicate → Google AI Studio (GEMINI_API_KEY). Imagen-style generation and Gemini edit-with-source power backup paths when a source image URL is present (?source=).

Write prompts with subject, setting, lighting, and aspect intent. Save strong outputs immediately; treat Studio as a sketchpad and GigaEdit as the finishing room.`,
      },
      {
        h: "3. GigaEdit workspace",
        body: `GigaEdit is the full editor for photos and video: studio tabs, templates, social seeds, audio attach, teleprompter, and project deep links (?project= / ?aspect=). Photo aspect crop runs through the media pipeline; video bake export produces a publishable file before social handoff.

Workspace shortcut order prioritizes GigaSocial → GigaEdit → GigaLearn so creators reach production tools first. Prefer device-tier camera previews; offline background sync can flush queued work when connectivity returns.`,
      },
      {
        h: "4. Cameras, teleprompter & voice-follow",
        body: `Use the pro-style camera preview for talking-head and product shots. Stabilize the phone, light the face from the front, and keep backgrounds simple. Teleprompter + voice-follow helps scripted videos — rehearse once, then record. Attach Audio Studio takes when narration needs a separate track.

Avoid starting publish until export finishes. If a previous handoff failed, confirm IndexedDB commit completed before navigating away.`,
      },
      {
        h: "5. Export & publish handoff",
        body: `“Post to GigaSocial” stages the handoff then opens the feed composer with your baked media. Video export should complete audio extraction without hanging on seeked events; if a bake stalls, retry export before leaving GigaEdit.

After handoff, review caption, hashtags, and visibility in the composer. You can still edit metadata on GigaSocial before posting. Keep a local copy of hero assets for thumbnails and marketplace covers.`,
      },
      {
        h: "6. Quality bar for professional creators",
        body: `□ Vertical video framed for mobile-first feeds
□ Readable captions burned or attached as text
□ Consistent color grade across a series of posts
□ Export resolution matched to platform norms
□ Cover stills for marketplace and link previews
□ No unfinished drafts published “to test” on main account — use a secondary profile when experimenting (Series 3)`,
      },
      {
        h: "7. Image & video provider reality",
        body: `Providers fail. Giga3’s failover (fal → Replicate → Google AI Studio) exists so a single outage does not stop your shoot day. When output style shifts between providers, re-run with a tighter prompt or finish in GigaEdit. Seedance-class video models may include synced audio — still plan a voiceover pass for brand clarity.

Keep sourceImageUrl / ?source= edit links for iterative design (poster → variant → final).`,
      },
      {
        h: "8. Asset hygiene",
        body: `Name files by campaign (brand_hook_v3.mp4). Store covers at marketplace-friendly 16:9. Export a still frame for link previews. Back up finals outside the browser. Never upload national ID scans into Media Studio or GigaSocial — verification has its own secure path (Series 4).`,
      },
      {
        h: "9. Download this PDF after purchase",
        body: `After Paystack checkout on ${SITE}/marketplace, open My purchases while signed in and tap Download PDF. Delivery is tied to your buyer account — that is how Giga3 keeps marketplace files fraud-free.`,
      },
      {
        h: "10. Series 2 checklist",
        body: `□ Generate one image in Media Studio and save it
□ Open GigaEdit, apply aspect crop, export
□ Record a short clip with teleprompter
□ Complete Post to GigaSocial handoff once
□ Confirm the composer received media

Next: Series 3 — GigaSocial Creator Playbook (${PRICE}).`,
      },
    ],
  },
  {
    id: "series-3",
    file: "giga3-series-3-gigasocial-creator-playbook.pdf",
    cover: "series-3.svg",
    accent: "#0d9488",
    number: 3,
    title: "GigaSocial Creator Playbook",
    subtitle: "Feed, community, tips, gifts & growth",
    chapters: [
      {
        h: "1. Why GigaSocial",
        body: `GigaSocial is the social layer of Giga3 — a place to publish, discover, tip, gift, and grow a creator brand beside AI tools. This Series 3 playbook (Academy price ${PRICE}) focuses on habits that convert attention into community. Live at ${SITE}.`,
      },
      {
        h: "2. Profiles & multi-account",
        body: `Creators may maintain multiple social profiles (up to platform limits) with one main face. Use a main brand account for flagship posts and secondary accounts for experiments, niches, or regional languages. Keep handles clear, bios benefit-focused, and avatars high-contrast at small sizes.

Never confuse marketplace creatorProfiles (sell verification) with socialProfiles (feed identity). Complete both if you sell and post.`,
      },
      {
        h: "3. Composer & media controls",
        body: `The compact composer is optimized for mobile posting. Attach images/video from GigaEdit handoff or device library. Use on-media controls for like and tip where enabled — frictionless reactions increase completion rate on short video.

Write the first line like a hook. Add 3–7 relevant hashtags. Prefer one clear CTA (follow, tip, unlock, visit marketplace). Avoid dumping every link in every post.`,
      },
      {
        h: "4. Tips, gifts & unlocks",
        body: `Tips and gifts let fans support creators in GHS via Paystack-backed flows. Locked or gift-gated content should promise a clear unlock value (lesson, pack, behind-the-scenes). State the price and what buyers receive before they pay.

Treat tipping UX errors as trust events — show calm, specific messages when a tip fails, and never double-charge. Series 4 details payment verification and marketplace delivery.`,
      },
      {
        h: "5. Discovery & community growth",
        body: `Post consistently (quality over spam). Reply to comments within a day. Cross-link from chat replies and marketplace product pages when relevant. Use Creator News / news desk surfaces on the sell dashboard to stay current without leaving creator tools.

Growth loops that work: teach one tip → show the result in GigaEdit → sell the deeper PDF or template on Marketplace → invite buyers into a GigaSocial series.`,
      },
      {
        h: "6. Safety & professionalism",
        body: `Respect copyright on music and stock. Credit collaborators. Do not publish private ID documents. Report abuse through platform channels. Keep verification data only in the creator verification flow — never in public posts.`,
      },
      {
        h: "7. Content calendar for African creators",
        body: `Suggested weekly rhythm: 2 educational carousels/reels, 1 behind-the-scenes GigaEdit process post, 1 marketplace soft sell, 1 community reply thread. Post when your audience is mobile-active (evenings/weekends). Localize examples — prices in GHS, cultural references your followers recognize.

Offline: draft captions in notes; publish when connectivity is stable so media uploads do not stall mid-composer.`,
      },
      {
        h: "8. Measuring what matters",
        body: `Track saves, tips, profile visits, and marketplace clicks — not vanity alone. If a format earns tips, make a series. If a post drives marketplace views but no buys, tighten the product page preview text and cover (Series 4).`,
      },
      {
        h: "9. Download this PDF after purchase",
        body: `Pay on ${SITE}/marketplace with Paystack, then download from My purchases. Do not redistribute Academy PDFs; personal license only.`,
      },
      {
        h: "10. Series 3 checklist",
        body: `□ Set main social profile + one experimental profile
□ Publish three posts with distinct hooks
□ Enable or test tip/gift on a media post
□ Reply to every comment for 48 hours
□ Funnel one post to a marketplace product

Next: Series 4 — Monetize & Marketplace (${PRICE}).`,
      },
    ],
  },
  {
    id: "series-4",
    file: "giga3-series-4-monetize-and-marketplace.pdf",
    cover: "series-4.svg",
    accent: "#115e59",
    number: 4,
    title: "Monetize & Marketplace",
    subtitle: "Paystack, products, verification & payouts",
    chapters: [
      {
        h: "1. Income surfaces on Giga3",
        body: `Creators earn through subscriptions/credits (chat & AI usage), GigaSocial tips/gifts, and Marketplace digital product sales. This Series 4 volume (${PRICE}) is the monetization handbook for the Giga3 AI PWA. Checkout currency is GHS (Ghana Cedi; often written GHC).`,
      },
      {
        h: "2. Paystack checkout basics",
        body: `Payments initialize on Convex (paystack actions) — secrets never ship to the browser. Success redirects to ${SITE}/payment/success/?reference=… Webhooks hit the Convex site paystack/webhook for charge.success. Always verify payment status in-app before granting downloads.

Marketplace purchases call initializeMarketplacePayment, then redirect to Paystack. After success, the purchase row unlocks getDownloadAccess for the file stored in Convex _storage.`,
      },
      {
        h: "3. Creator verification",
        body: `Before listing products, create a creator profile (display name + handle) and submit identity verification: national ID number, ID document upload, and GPS coordinates. Status moves none → pending → approved/rejected. Approved creators see a verified badge on listings.

Keep coordinates accurate at submission time. Rejected creators can correct documents and resubmit. Verification protects buyers and enables payouts.`,
      },
      {
        h: "4. Listing like a professional",
        body: `Required: clear title, benefit-led description, category, product type, price in GHS, license, tags, and a downloadable file. Optional but high-converting: cover image, preview excerpt, copyright notice.

Buyers cannot purchase until a file is attached. Prefer PDF, zip, or well-named source packs. Price the Giga3 Creator Academy model uses ${PRICE} per series — a clean, memorable price point for comprehensive educational resources.`,
      },
      {
        h: "5. Official Creator Academy series",
        body: `Giga3 publishes four official Academy eBooks:

1. Platform Foundations — PWA, chat, models, offline
2. Create & Publish — Media Studio + GigaEdit
3. GigaSocial Creator Playbook — feed & growth
4. Monetize & Marketplace — this volume

Each sells at ${PRICE}. Tags include giga3-official-series plus giga3-series-N. After purchase, download from My purchases. Personal license: use for your learning and business; do not redistribute the PDF files.`,
      },
      {
        h: "6. Fees, reviews & payouts",
        body: `Successful marketplace charges may include a platform fee; creator earnings credit the creator profile balances (totalEarningsGhs / payoutBalanceGhs). Request payout from the creator dashboard when balance meets the minimum (default GHS 50 unless configured higher).

Buyers who purchased can leave star ratings and comments. Respond to feedback on GigaSocial. Archive outdated listings instead of leaving broken files published.`,
      },
      {
        h: "7. Pricing psychology in GHS",
        body: `The Creator Academy anchors comprehensive education at ${PRICE} per series — easy to communicate (“four books, ${PRICE} each”). For your own catalog: price templates lower, deep courses near the Academy anchor, and exclusive packs higher with extended licenses. Always show currency as GHS in-product (Paystack).

Bundle strategically on GigaSocial (“Series 1–2 starter pack”) only if you create a real bundled file — do not promise bundles you cannot deliver.`,
      },
      {
        h: "8. Support & dispute hygiene",
        body: `Keep a purchase → download FAQ in your bio. If a buyer pays but cannot download, verify payment reference and file attachment. Admins can moderate listing status (publish/archive). Never ask buyers to pay outside Paystack for Marketplace SKUs.`,
      },
      {
        h: "9. Buyer download path (fraud-free)",
        body: `Buyers receive files only after Paystack success + signed-in ownership check. Sellers must never collect private payment outside Paystack for Marketplace SKUs. Support buyers by pointing them to My purchases → Download PDF.`,
      },
      {
        h: "10. End-to-end monetization checklist",
        body: `□ Verification approved
□ One flagship product with cover + file
□ Price tested (consider ${PRICE} for premium guides)
□ Buy-flow tested on a second account
□ Confirm Download PDF works for a test purchase
□ Payout method note saved for admins
□ GigaSocial posts linking to your listing
□ Academy series 1–4 completed for full literacy

You now have the complete Giga3 AI PWA Creator Academy curriculum across four series at ${PRICE} each.`,
      },
    ],
  },
];

function coverSvg({ number, title, subtitle, accent }) {
  const n = String(number).padStart(2, "0");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="55%" stop-color="#0b1220"/>
      <stop offset="100%" stop-color="#042f2e"/>
    </linearGradient>
    <linearGradient id="band" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1600" fill="url(#bg)"/>
  <rect x="0" y="0" width="18" height="1600" fill="url(#band)"/>
  <text x="72" y="120" fill="#99f6e4" font-family="Georgia, serif" font-size="30" letter-spacing="4">GIGA3 CREATOR ACADEMY</text>
  <text x="72" y="280" fill="#ffffff" font-family="Georgia, serif" font-size="120" font-weight="700">Series</text>
  <text x="72" y="420" fill="#fbbf24" font-family="Georgia, serif" font-size="140" font-weight="700">${n}</text>
  <text x="72" y="560" fill="#ffffff" font-family="Georgia, serif" font-size="64" font-weight="700">${escapeXml(title)}</text>
  <text x="72" y="640" fill="#cbd5e1" font-family="sans-serif" font-size="32">${escapeXml(subtitle)}</text>
  <rect x="72" y="720" width="220" height="8" rx="4" fill="url(#band)"/>
  <rect x="72" y="1080" width="420" height="96" rx="24" fill="${accent}"/>
  <text x="100" y="1142" fill="#042f2e" font-family="Georgia, serif" font-size="42" font-weight="700">${PRICE}</text>
  <text x="72" y="1280" fill="#94a3b8" font-family="sans-serif" font-size="24">www.giga3ai.com/marketplace</text>
  <text x="72" y="1480" fill="#64748b" font-family="sans-serif" font-size="22">Digital delivery after verified purchase</text>
</svg>`;
}

function escapeXml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlDoc(s) {
  const chapters = s.chapters
    .map(
      (c) => `
      <section class="chapter">
        <h2>${escapeXml(c.h)}</h2>
        ${c.body
          .split(/\n\n+/)
          .map((p) => `<p>${escapeXml(p).replaceAll("\n", "<br/>")}</p>`)
          .join("\n")}
      </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Giga3 AI PWA — Series ${s.number}: ${escapeXml(s.title)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm 20mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    color: #134e4a;
    line-height: 1.55;
    font-size: 11.5pt;
  }
  .cover {
    page-break-after: always;
    min-height: 240mm;
    padding: 28mm 10mm 20mm;
    background: linear-gradient(145deg, ${s.accent} 0%, #042f2e 100%);
    color: #ecfdf5;
    border-radius: 4px;
  }
  .cover .eyebrow { letter-spacing: 0.08em; text-transform: uppercase; font-size: 11pt; color: #99f6e4; }
  .cover h1 { font-size: 34pt; margin: 18px 0 8px; line-height: 1.15; color: #fff; }
  .cover .sub { font-size: 16pt; color: #a7f3d0; margin-bottom: 36px; }
  .cover .price { font-size: 20pt; font-weight: 700; color: #fff; margin-top: 48px; }
  .cover .meta { margin-top: 12px; font-size: 11pt; color: #ccfbf1; }
  h2 { color: ${s.accent}; font-size: 16pt; margin: 0 0 10px; page-break-after: avoid; }
  .chapter { margin-bottom: 22px; page-break-inside: avoid; }
  p { margin: 0 0 10px; }
  .toc { page-break-after: always; }
  .toc h2 { margin-bottom: 16px; }
  .toc li { margin: 8px 0; }
  footer.note { margin-top: 28px; font-size: 9.5pt; color: #5f7a76; border-top: 1px solid #d1e5e1; padding-top: 10px; }
</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">Giga3 Creator Academy · Official eBook</div>
    <h1>Series ${s.number}<br/>${escapeXml(s.title)}</h1>
    <div class="sub">${escapeXml(s.subtitle)}</div>
    <p>Everything creators need to know for this pillar of the Giga3 AI progressive web app.</p>
    <div class="price">${PRICE}</div>
    <div class="meta">Personal license · ${SITE}/marketplace<br/>© Giga3 AI · Digital delivery after Paystack purchase</div>
  </section>
  <section class="toc">
    <h2>Contents</h2>
    <ol>
      ${s.chapters.map((c) => `<li>${escapeXml(c.h)}</li>`).join("\n")}
    </ol>
    <p class="meta" style="margin-top:24px">Part of the four-volume Giga3 Creator Academy. Each series is sold separately at ${PRICE}.</p>
  </section>
  ${chapters}
  <footer class="note">
    Giga3 AI PWA Creator Academy — Series ${s.number}: ${escapeXml(s.title)}.
    Sold at ${PRICE}. Unauthorized redistribution of this PDF is prohibited.
    Support: ${SITE}
  </footer>
</body>
</html>`;
}

await mkdir(coverDir, { recursive: true });

for (const s of series) {
  await writeFile(path.join(coverDir, s.cover), coverSvg(s), "utf8");
}

const browser = await chromium.launch({ headless: true });
try {
  for (const s of series) {
    const page = await browser.newPage();
    await page.setContent(htmlDoc(s), { waitUntil: "load" });
    const outPath = path.join(outDir, s.file);
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    await page.close();
    console.log("Wrote", outPath);
  }
} finally {
  await browser.close();
}

console.log("Done — 4 Creator Academy PDFs at", PRICE);
