#!/usr/bin/env node
/**
 * Playwright viewport audit: chat fixture must not cause horizontal page overflow.
 * Viewports: 320, 375, 768, 1024, 1440
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(root, "../styles/chat-overflow.css"), "utf8");

const VIEWPORTS = [
  { name: "mobile-320", width: 320, height: 640 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

const FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 100%; max-width: 100%; overflow-x: hidden; font-family: system-ui, sans-serif; }
    ${css}
    .chat-message-turn-user { display: flex; justify-content: flex-end; }
    .chat-message-turn-assistant { display: flex; justify-content: flex-start; }
    .user-bubble { background: #ede9fe; border-radius: 1.25rem; padding: 0.625rem 1rem; }
    .assistant-bubble { background: #f4f4f5; border-radius: 1rem; padding: 0.75rem 1rem; }
    .chat-md-pre { background: #0a0a0a; color: #f4f4f5; border-radius: 0.75rem; padding: 0.75rem 1rem; }
    .chat-md-code { background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-family: monospace; }
    img { display: block; }
  </style>
</head>
<body>
  <div class="chat-stable" style="height:100vh;display:flex;flex-direction:column;">
    <div class="chat-message-scroll-region" style="flex:1;">
      <div class="chat-thread chat-message-stack" style="display:flex;flex-direction:column;gap:1rem;">
        <article class="chat-message-turn chat-message-turn-user">
          <div class="chat-message-bubble chat-message-bubble-user">
            <div class="chat-message-bubble-inner user-bubble">
              <p style="margin:0;white-space:pre-wrap;word-break:break-word;">Thanks! This is a very long user message without spaces: ${"A".repeat(120)}</p>
            </div>
          </div>
        </article>
        <article class="chat-message-turn chat-message-turn-assistant">
          <div class="chat-message-bubble" style="width:100%;">
            <div class="chat-message-bubble-inner assistant-bubble chat-markdown">
              <p class="chat-md-p">Assistant reply with inline <code class="chat-md-code">${"code".repeat(40)}</code> token.</p>
              <pre class="chat-md-pre"><code>const veryLongLine = "${"x".repeat(200)}";</code></pre>
              <div class="chat-md-table-wrap">
                <table class="chat-md-table">
                  <thead><tr><th>Column A</th><th>Column B</th><th>Column C</th><th>Column D</th></tr></thead>
                  <tbody><tr><td>Alpha</td><td>Bravo</td><td>Charlie</td><td>Delta</td></tr></tbody>
                </table>
              </div>
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='400'%3E%3Crect fill='%23ddd' width='100%25' height='100%25'/%3E%3C/svg%3E" alt="wide" width="900" height="400" />
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</body>
</html>`;

async function assertNoHorizontalOverflow(page, viewport) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const scroll = document.querySelector(".chat-message-scroll-region");
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      scrollOverflow: scroll
        ? scroll.scrollWidth - scroll.clientWidth
        : 0,
      docScrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });

  if (metrics.docOverflow > 1) {
    throw new Error(
      `${viewport.name}: document horizontal overflow ${metrics.docOverflow}px (scrollWidth=${metrics.docScrollWidth}, clientWidth=${metrics.clientWidth})`
    );
  }
  if (metrics.scrollOverflow > 1) {
    throw new Error(
      `${viewport.name}: chat scroll region horizontal overflow ${metrics.scrollOverflow}px`
    );
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.setContent(FIXTURE_HTML, { waitUntil: "domcontentloaded" });
    await assertNoHorizontalOverflow(page, viewport);
    console.log(`ok: ${viewport.name} (${viewport.width}px)`);
  }

  await browser.close();
  console.log("chat-overflow-viewport-test: all viewports passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
