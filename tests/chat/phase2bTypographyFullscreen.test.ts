import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");

describe("Phase 2B typography tokens", () => {
  it("defines a chat type scale with ≥16px body and comfortable conversation size", () => {
    const globals = read("web/styles/globals.css");
    expect(globals).toContain("--chat-font-body: 1rem");
    expect(globals).toContain("--chat-font-conversation: 1.0625rem");
    expect(globals).toContain("--chat-font-conversation-lg: 1.125rem");
    expect(globals).toContain("--chat-font-secondary: 0.875rem");
    expect(globals).toContain("--chat-line-height: 1.7");
    expect(globals).toMatch(
      /\.chat-markdown\s*\{[\s\S]*?font-size:\s*var\(--chat-font-conversation\)/
    );
    expect(globals).toMatch(
      /\.chat-assistant-body[\s\S]*?font-size:\s*var\(--chat-font-conversation\)/
    );
  });

  it("keeps composer textarea at body size (≥16px) to avoid mobile zoom", () => {
    const input = read("web/components/chat/ChatInput.tsx");
    expect(input).toMatch(/chat-composer-textarea[\s\S]*?text-base/);
    const mobile = read("web/styles/chat-mobile-app.css");
    expect(mobile).toMatch(
      /\.chat-composer-textarea\s*\{[\s\S]*?font-size:\s*var\(--chat-font-body\)/
    );
  });
});

describe("Phase 2B fullscreen + distraction-free invariants", () => {
  it("compacts typing bar to 2rem and hides upsell while composing", () => {
    const css = read("web/styles/chat-mobile-app.css");
    expect(css).toMatch(
      /html\.chat-route\s+\.chat-typing-bar\s*\{[\s\S]*?min-height:\s*2rem/
    );
    expect(css).toContain("chat-composer-active");
    expect(css).toContain(".chat-banner-upsell");
    expect(css).not.toContain("5.15rem");
  });

  it("does not double safe-area under composer while the tab bar is visible", () => {
    const css = read("web/styles/chat-mobile-app.css");
    expect(css).toMatch(
      /html\.chat-route\s+\.chat-composer-dock\s*\{[\s\S]*?padding-bottom:\s*8px/
    );
    expect(css).toMatch(
      /chat-keyboard-open\s+\.chat-composer-dock\s*\{[\s\S]*?safe-area-inset-bottom/
    );
  });

  it("hides free-image quota line while the composer is active", () => {
    const input = read("web/components/chat/ChatInput.tsx");
    expect(input).toContain("!composerFocused");
    expect(input).toContain("!value.trim()");
    expect(input).toContain("Free AI images today");
  });

  it("keeps empty-credit banner but soft low-credit upsell off once messages exist", () => {
    const banners = read("web/components/chat/ChatBanners.tsx");
    expect(banners).toContain('balancePrompt === "empty" || !hasMessages');
    expect(banners).toContain("chat-banner-upsell");
  });

  it("resolves mobile header title without conflicting text-sm", () => {
    const chrome = read("web/components/chat/ChatChrome.tsx");
    expect(chrome).toContain("chat-header-title-mobile");
    expect(chrome).not.toMatch(/chat-header-title-mobile[^"]*text-sm/);
    const css = read("web/styles/chat-mobile-app.css");
    expect(css).toMatch(/\.chat-header-title-mobile\s*\{[\s\S]*?font-size:\s*1rem/);
  });

  it("PushPrompt respects chat suppression helper", () => {
    const push = read("web/components/pwa/PushPrompt.tsx");
    expect(push).toContain("shouldSuppressPushPrompt");
    expect(push).toContain("usePathname");
  });

  it("guest browse shell uses ≥16px body/input and ≥14px secondary", () => {
    const guest = read("web/components/chat/ChatGuestBrowseView.tsx");
    expect(guest).toContain('text-sm text-muted">Guest browse');
    expect(guest).toMatch(/max-w-md text-base leading-relaxed text-muted/);
    expect(guest).toMatch(
      /id="guest-chat-open-app"[\s\S]*?className="[^"]*\btext-base\b[^"]*"/
    );
    expect(guest).not.toMatch(
      /id="guest-chat-open-app"[\s\S]*?className="[^"]*\btext-sm\b[^"]*"/
    );
    expect(guest).toMatch(
      /className="mt-2 w-full min-h-11 text-base font-medium text-accent"/
    );
  });
});
