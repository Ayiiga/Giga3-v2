#!/usr/bin/env node
/**
 * Validates chat footer sits flush above primary nav (no double clearance gap).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.dirname(fileURLToPath(import.meta.url));
const styles = [
  "globals.css",
  "primary-nav.css",
  "chat-premium.css",
  "chat-overflow.css",
  "chat-mobile-app.css",
]
  .map((name) => fs.readFileSync(path.join(root, `../styles/${name}`), "utf8"))
  .join("\n");

const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en" class="chat-route primary-nav-route primary-nav-bar-visible">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 240 10% 3.9%;
      --border: 240 5.9% 90%;
      --card: 0 0% 100%;
      --muted: 240 3.8% 46.1%;
      --accent: 262 83% 58%;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; font-family: system-ui, sans-serif; background: hsl(var(--background)); color: hsl(var(--foreground)); }
    ${styles}
  </style>
</head>
<body>
  <div class="chat-stable chat-keyboard-shell flex h-full w-full flex-col overflow-hidden">
    <div class="chat-conversation-grid min-h-0 flex-1 overflow-hidden">
      <div class="chat-message-list">
        <div class="chat-message-scroll-region message-list-scroll py-3">
          <div class="chat-thread chat-message-stack">
            <article class="chat-message-turn chat-message-turn-assistant">
              <div class="chat-message-bubble" style="width:100%;padding:0.75rem 1rem;background:#f4f4f5;border-radius:1rem;">
                Assistant reply area should grow to fill available height above the footer.
              </div>
            </article>
          </div>
        </div>
      </div>
      <div class="chat-composer-stack chat-footer shrink-0 border-t border-border bg-background">
        <div id="footer-chips" class="chat-footer-chips px-3 pt-0.5">
          <div class="chat-suggested-chips">
            <div class="chat-suggested-chips__row">
              <button type="button" style="border:1px solid #e5e7eb;border-radius:999px;padding:0.35rem 0.75rem;font-size:12px;">Draft an email</button>
              <button type="button" style="border:1px solid #e5e7eb;border-radius:999px;padding:0.35rem 0.75rem;font-size:12px;">Summarize notes</button>
            </div>
          </div>
        </div>
        <div class="chat-composer-dock">
          <form class="chat-composer px-2 py-1.5">
            <div class="chat-composer-surface" style="display:flex;align-items:end;gap:0.5rem;border:1px solid #e5e7eb;border-radius:24px;padding:0.5rem;background:#fff;">
              <textarea id="composer" class="chat-composer-textarea" rows="1" placeholder="Message Giga3 AI…" style="flex:1;border:0;outline:none;resize:none;min-height:2.5rem;font-size:16px;"></textarea>
              <button type="button" style="width:2.5rem;height:2.5rem;border-radius:999px;border:0;background:#7c3aed;color:#fff;">Send</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  <nav class="primary-nav primary-nav--mobile" aria-label="Giga3 primary navigation">
    <div class="primary-nav__inner">
      <a class="primary-nav__item primary-nav__item--active" href="#"><span class="primary-nav__label">Home</span></a>
      <a class="primary-nav__item" href="#"><span class="primary-nav__label">Learn</span></a>
      <a class="primary-nav__item" href="#"><span class="primary-nav__label">Create</span></a>
      <a class="primary-nav__item" href="#"><span class="primary-nav__label">Social</span></a>
    </div>
  </nav>
  <script>
    const textarea = document.getElementById("composer");
    const chips = document.getElementById("footer-chips");
    function syncChips() {
      const active = document.activeElement === textarea || textarea.value.trim().length > 0;
      chips.style.display = active ? "none" : "block";
    }
    textarea.addEventListener("focus", syncChips);
    textarea.addEventListener("blur", syncChips);
    textarea.addEventListener("input", syncChips);
  </script>
</body>
</html>`;

async function main() {
  const artifactsDir = "/opt/cursor/artifacts";
  fs.mkdirSync(artifactsDir, { recursive: true });
  const fixturePath = path.join(root, ".chat-footer-fixture.html");
  fs.writeFileSync(fixturePath, FIXTURE_HTML);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`file://${fixturePath}`);

  const beforeFocus = await page.evaluate(() => {
    const composer = document.querySelector(".chat-composer");
    const nav = document.querySelector(".primary-nav--mobile");
    const scroll = document.querySelector(".chat-message-scroll-region");
    const chipButton = document.querySelector(".chat-suggested-chips__row button");
    const composerSurface = document.querySelector(".chat-composer-surface");
    const composerRect = composer.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const chipRect = chipButton?.getBoundingClientRect();
    const surfaceRect = composerSurface?.getBoundingClientRect();
    const chipsVisible = getComputedStyle(document.getElementById("footer-chips")).display !== "none";
    return {
      gapPx: Math.round(navRect.top - composerRect.bottom),
      chipsToComposerGapPx:
        chipRect && surfaceRect ? Math.round(surfaceRect.top - chipRect.bottom) : null,
      composerPaddingTop: getComputedStyle(composer).paddingTop,
      composerMarginBottom: getComputedStyle(composer).marginBottom,
      shellPaddingBottom: getComputedStyle(document.querySelector(".chat-keyboard-shell")).paddingBottom,
      scrollFlexGrow: getComputedStyle(scroll).flexGrow,
      chipsVisible,
    };
  });

  await page.screenshot({
    path: path.join(artifactsDir, "chat-footer-chips-visible.png"),
    fullPage: false,
  });

  await page.focus("#composer");
  await page.keyboard.type("Hello");

  const whileTyping = await page.evaluate(() => ({
    chipsVisible: getComputedStyle(document.getElementById("footer-chips")).display !== "none",
  }));

  await page.screenshot({
    path: path.join(artifactsDir, "chat-footer-chips-hidden-on-type.png"),
    fullPage: false,
  });

  await browser.close();
  fs.unlinkSync(fixturePath);

  console.log("chat-footer-layout-test metrics:", JSON.stringify({ beforeFocus, whileTyping }, null, 2));

  if (beforeFocus.gapPx > 12) {
    throw new Error(`Composer/nav gap too large: ${beforeFocus.gapPx}px`);
  }
  if (beforeFocus.chipsToComposerGapPx == null || beforeFocus.chipsToComposerGapPx > 6) {
    throw new Error(
      `Chips/composer gap too large: ${beforeFocus.chipsToComposerGapPx ?? "unknown"}px`
    );
  }
  if (beforeFocus.composerPaddingTop !== "0px") {
    throw new Error(`Expected zero composer padding-top with chips: ${beforeFocus.composerPaddingTop}`);
  }
  if (beforeFocus.composerMarginBottom !== "0px") {
    throw new Error(`Unexpected composer margin-bottom: ${beforeFocus.composerMarginBottom}`);
  }
  if (beforeFocus.scrollFlexGrow !== "1") {
    throw new Error(`Message scroll region should flex-grow: ${beforeFocus.scrollFlexGrow}`);
  }
  if (!beforeFocus.chipsVisible || whileTyping.chipsVisible) {
    throw new Error("Footer chips visibility toggle failed");
  }

  console.log("chat-footer-layout-test: passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
