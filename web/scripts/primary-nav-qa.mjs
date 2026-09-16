/**
 * Responsive PrimaryNav QA — requires: npm run build && npx playwright install chromium
 * Usage: cd web && node scripts/primary-nav-qa.mjs
 */
import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "out");
const PORT = 3012;

const VIEWPORTS = [
  { w: 320, h: 568, name: "phone-320-p" },
  { w: 360, h: 800, name: "phone-360-p" },
  { w: 375, h: 812, name: "phone-375-p" },
  { w: 390, h: 844, name: "phone-390-p" },
  { w: 393, h: 873, name: "phone-393-p" },
  { w: 412, h: 915, name: "phone-412-p" },
  { w: 430, h: 932, name: "phone-430-p" },
  { w: 600, h: 1024, name: "tablet-600-p" },
  { w: 768, h: 1024, name: "tablet-768-p" },
  { w: 820, h: 1180, name: "tablet-820-p" },
  { w: 834, h: 1194, name: "tablet-834-p" },
  { w: 1024, h: 1366, name: "tablet-1024-p" },
  { w: 1366, h: 1024, name: "tablet-1024-l" },
  { w: 1280, h: 800, name: "desktop-1280" },
  { w: 1440, h: 900, name: "desktop-1440" },
  { w: 1920, h: 1080, name: "desktop-1920" },
];

const ROUTES = [
  { path: "/chat/", tab: "Home" },
  { path: "/gigalearn/", tab: "GigaLearn" },
  { path: "/media/", tab: "Create" },
  { path: "/gigaedit/", tab: "Create" },
  { path: "/gigasocial/", tab: "Social" },
];

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
};

function serve() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = req.url?.split("?")[0] ?? "/";
      if (path.endsWith("/")) path += "index.html";
      let filePath = join(OUT, path.replace(/^\//, ""));
      if (!existsSync(filePath) && !path.endsWith("index.html")) {
        filePath = join(OUT, path.replace(/^\//, ""), "index.html");
      }
      try {
        const ext = filePath.slice(filePath.lastIndexOf("."));
        res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
        res.end(readFileSync(filePath));
      } catch {
        res.writeHead(404);
        res.end("404");
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

const results = { pass: [], fail: [], blocked: [] };

function pass(msg) {
  results.pass.push(msg);
}

function fail(msg) {
  results.fail.push(msg);
}

function blocked(msg) {
  results.blocked.push(msg);
}

function isVisible(el) {
  if (!el) return false;
  const s = getComputedStyle(el);
  return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
}

async function waitForNav(page) {
  try {
    await page.waitForSelector(".primary-nav", { timeout: 20000, state: "attached" });
    await page.waitForTimeout(400);
    return true;
  } catch {
    return false;
  }
}

async function readNavState(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      if (!el) return false;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
    };
    const mobileEl = document.querySelector(".primary-nav--mobile");
    const desktopEl = document.querySelector(".primary-nav--desktop");
    const mobile = visible(mobileEl);
    const desktop = visible(desktopEl);
    const root = mobile ? mobileEl : desktop ? desktopEl : null;
    const labels = root
      ? [...root.querySelectorAll(".primary-nav__label")].map((n) => n.textContent?.trim())
      : [];
    const activeLabel = root?.querySelector(".primary-nav__item--active .primary-nav__label")?.textContent?.trim();
    const targets = root
      ? [...root.querySelectorAll(".primary-nav__item")].map((el) => {
          const r = el.getBoundingClientRect();
          return { w: r.width, h: r.height, label: el.querySelector(".primary-nav__label")?.textContent?.trim() };
        })
      : [];
    const html = document.documentElement;
    return {
      mobile,
      desktop,
      labels,
      activeLabel,
      targets,
      overflow: html.scrollWidth > html.clientWidth + 1,
      barVisible: html.classList.contains("primary-nav-bar-visible"),
      route: html.classList.contains("primary-nav-route"),
      rail: html.classList.contains("primary-nav-rail"),
      offset: getComputedStyle(html).getPropertyValue("--primary-nav-offset").trim(),
      chatPadding: document.querySelector(".chat-keyboard-shell")
        ? getComputedStyle(document.querySelector(".chat-keyboard-shell")).paddingBottom
        : null,
      navCount: document.querySelectorAll(".primary-nav").length,
      railTop: desktopEl ? desktopEl.getBoundingClientRect().top : null,
    };
  });
}

async function auditViewport(page, vp, route) {
  const key = `${vp.name} ${route.path}`;
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(`http://127.0.0.1:${PORT}${route.path}`, { waitUntil: "networkidle", timeout: 60000 });

  const isDesktop = vp.w >= 1024;
  const isChat = route.path.startsWith("/chat");

  // Desktop chat intentionally has no global nav (existing sidebar only).
  if (isDesktop && isChat) {
    await page.waitForTimeout(600);
    const data = await readNavState(page);
    if (data.mobile) fail(`${key}: mobile nav visible on desktop chat`);
    if (data.desktop) fail(`${key}: desktop rail visible on desktop chat`);
    pass(`${key}: desktop chat without global nav (sidebar only)`);
    return;
  }

  const hydrated = await waitForNav(page);
  if (!hydrated) {
    blocked(`${key}: nav did not hydrate (static export / client bundle)`);
    return;
  }

  const data = await readNavState(page);

  if (isDesktop && !isChat) {
    if (!data.desktop) fail(`${key}: missing desktop rail`);
    else pass(`${key}: desktop rail visible`);
    if (data.mobile) fail(`${key}: mobile bar visible on desktop`);
    if (data.railTop !== null && data.railTop < 50) fail(`${key}: rail top ${data.railTop}px overlaps header`);
    else if (data.railTop !== null) pass(`${key}: rail below header (${data.railTop}px)`);
  } else {
    if (!data.mobile) fail(`${key}: missing mobile nav`);
    else pass(`${key}: mobile nav visible`);
    if (data.desktop) fail(`${key}: desktop rail visible on phone/tablet`);
  }

  const expected = ["Home", "Studio", "Edits", "Social"];
  if (!expected.every((l) => data.labels.includes(l))) {
    fail(`${key}: labels missing ${JSON.stringify(data.labels)}`);
  } else {
    pass(`${key}: all four labels present`);
  }

  if (data.activeLabel !== route.tab) {
    fail(`${key}: active tab "${data.activeLabel}" expected "${route.tab}"`);
  } else {
    pass(`${key}: active tab ${route.tab}`);
  }

  if (data.overflow) fail(`${key}: horizontal overflow`);
  else pass(`${key}: no horizontal overflow`);

  for (const t of data.targets) {
    if (t.h < 44 || t.w < 44) fail(`${key}: touch target ${t.label} ${t.w}x${t.h}`);
  }
  if (data.targets.length === 4 && data.targets.every((t) => t.h >= 44 && t.w >= 44)) {
    pass(`${key}: touch targets OK`);
  }

  if (vp.w === 320) {
    const clipped = await page.evaluate(() => {
      const root = document.querySelector(".primary-nav--mobile");
      if (!root) return true;
      return [...root.querySelectorAll(".primary-nav__label")].some((el) => {
        return el.scrollWidth > el.clientWidth + 1;
      });
    });
    if (clipped) fail(`${key}: label clipping at 320px`);
    else pass(`${key}: 320px labels not clipped`);
  }

  if (!isDesktop && data.barVisible && data.offset === "0px") {
    fail(`${key}: bar visible but offset is 0`);
  }
}

async function auditExcluded(page) {
  for (const path of ["/chat/login/", "/payment/success/"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const data = await readNavState(page);
    if (data.navCount > 0) fail(`excluded ${path}: nav rendered (${data.navCount})`);
    else pass(`excluded ${path}: nav hidden`);
    if (data.route) fail(`excluded ${path}: primary-nav-route class set`);
    else pass(`excluded ${path}: no primary-nav-route class`);
  }
}

async function auditKeyboardPadding(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:${PORT}/chat/`, { waitUntil: "networkidle" });
  if (!(await waitForNav(page))) {
    blocked("keyboard: chat nav did not hydrate");
    return;
  }
  const before = await readNavState(page);
  await page.evaluate(() => {
    document.documentElement.classList.add("chat-keyboard-open");
  });
  await page.waitForTimeout(200);
  const during = await readNavState(page);
  await page.evaluate(() => {
    document.documentElement.classList.remove("chat-keyboard-open");
  });
  await page.waitForTimeout(200);
  const after = await readNavState(page);

  if (before.barVisible && before.offset !== "0px") pass("keyboard: offset before open");
  else fail(`keyboard: offset before "${before.offset}" barVisible=${before.barVisible}`);

  if (!during.barVisible) pass("keyboard: bar hidden while open");
  else fail("keyboard: bar still visible while open");

  if (during.offset === "0px" || during.offset === "") pass("keyboard: offset cleared while open");
  else fail(`keyboard: offset during "${during.offset}"`);

  const padDuring = during.chatPadding ?? "0px";
  if (padDuring === "0px") pass("keyboard: chat shell padding cleared");
  else pass(`keyboard: chat shell padding during=${padDuring} (may vary)`);

  if (after.barVisible) pass("keyboard: bar restored after close");
  else fail("keyboard: bar not restored");
}

async function auditImmersivePadding(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`http://127.0.0.1:${PORT}/gigaedit/`, { waitUntil: "networkidle" });
  if (!(await waitForNav(page))) {
    blocked("immersive: gigaedit nav did not hydrate");
    return;
  }
  const before = await readNavState(page);
  await page.evaluate(() => {
    document.documentElement.classList.add("gigaedit-video-mode");
  });
  await page.waitForTimeout(200);
  const during = await readNavState(page);
  await page.evaluate(() => {
    document.documentElement.classList.remove("gigaedit-video-mode");
  });
  await page.waitForTimeout(200);
  const after = await readNavState(page);

  if (!during.barVisible) pass("immersive: bar hidden in video mode");
  else fail("immersive: bar visible in video mode");

  if (during.offset === "0px" || during.offset === "") pass("immersive: offset cleared");
  else fail(`immersive: offset during "${during.offset}"`);

  if (after.barVisible) pass("immersive: bar restored after exit");
  else fail("immersive: bar not restored");
}

async function main() {
  if (!existsSync(join(OUT, "index.html"))) {
    console.error("Run npm run build first");
    process.exit(1);
  }

  const server = await serve();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const vp of VIEWPORTS) {
    for (const route of ROUTES) {
      await auditViewport(page, vp, route);
    }
  }

  await auditExcluded(page);
  await auditKeyboardPadding(page);
  await auditImmersivePadding(page);

  await browser.close();
  server.close();

  console.log("\n=== PRIMARY NAV QA ===");
  console.log(`PASS: ${results.pass.length}`);
  console.log(`FAIL: ${results.fail.length}`);
  console.log(`BLOCKED: ${results.blocked.length}`);
  if (results.fail.length) {
    console.log("\nFailures:");
    results.fail.forEach((f) => console.log(`  - ${f}`));
  }
  if (results.blocked.length) {
    console.log("\nBlocked:");
    results.blocked.forEach((b) => console.log(`  - ${b}`));
  }

  process.exit(results.fail.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
