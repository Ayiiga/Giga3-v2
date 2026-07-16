import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(join(process.cwd(), "web/styles/globals.css"), "utf8");
const gigasocialCss = readFileSync(join(process.cwd(), "web/styles/gigasocial-pro.css"), "utf8");

describe("mobile stability CSS", () => {
  it("defines discover-stable column-first grids", () => {
    expect(globalsCss).toContain(".discover-stable .discover-card-grid");
    expect(globalsCss).toContain("flex-direction: column");
  });

  it("defines dashboard column-first quick links", () => {
    expect(globalsCss).toContain(".dashboard-stable .dashboard-quick-grid");
  });

  it("flattens marketing cards on mobile", () => {
    expect(globalsCss).toContain(".marketing-stable .saas-card");
    expect(globalsCss).toContain("background-image: none !important");
    expect(globalsCss).toContain("overflow: visible");
  });

  it("avoids vh sizing on gigasocial feed media for mobile", () => {
    expect(gigasocialCss).toContain("@media (max-width: 1023px)");
    expect(gigasocialCss).toContain(".gigasocial-feed-media img");
    expect(gigasocialCss).toContain("max-height: none");
  });

  it("uses gallery modifier without fixed aspect on media region", () => {
    expect(gigasocialCss).toContain(".gigasocial-post-card--gallery .gigasocial-post-card__media-region");
    expect(gigasocialCss).toContain("aspect-ratio: auto");
  });

  it("uses solid post footer and feed item paint containment on mobile", () => {
    expect(gigasocialCss).toContain(".gigasocial-post-card__footer");
    expect(gigasocialCss).toContain(".gigasocial-feed-item");
    expect(gigasocialCss).toContain("contain: paint");
  });

  it("defines creator-studio-stable column tool grid", () => {
    expect(globalsCss).toContain(".creator-studio-stable .creator-tool-grid");
  });

  it("keeps discover grids single-column until desktop breakpoint", () => {
    expect(globalsCss).toContain("@media (min-width: 1024px)");
    expect(globalsCss).toContain(".discover-stable .discover-card-grid {");
    expect(globalsCss).not.toMatch(/@media \(min-width: 640px\)[\s\S]*\.discover-stable \.discover-card-grid/);
  });

  it("disables document momentum scroll on marketing routes for mobile", () => {
    expect(globalsCss).toContain("html.marketing-route");
    expect(globalsCss).toContain("overflow-anchor: none");
    expect(globalsCss).toContain("-webkit-font-smoothing: auto");
  });

  it("removes media-stable card contain on mobile", () => {
    expect(globalsCss).toContain(".media-stable .saas-card");
    expect(globalsCss).toContain("contain: none !important");
  });

  it("defines discover four-column and panel grids", () => {
    expect(globalsCss).toContain(".discover-stable .discover-card-grid--4");
    expect(globalsCss).toContain(".discover-stable .discover-card-grid--panels");
  });

  it("flattens semi-transparent marketing backgrounds on mobile", () => {
    expect(globalsCss).toContain('.marketing-stable [class*="bg-accent/"]');
    expect(globalsCss).toContain("isolation: auto !important");
  });

  it("defines dashboard panel column-first grid", () => {
    expect(globalsCss).toContain(".dashboard-stable .dashboard-panel-grid");
  });

  it("defines gigasocial feed shell without nested saas-card contain", () => {
    expect(gigasocialCss).toContain(".gigasocial-pro .gigasocial-feed-shell");
    expect(gigasocialCss).toContain("overflow: visible");
  });
});
