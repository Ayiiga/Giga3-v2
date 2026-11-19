import { describe, expect, it } from "vitest";
import { discoverySource, isDiscoveryLanding } from "../../web/lib/analytics/discovery";

describe("discovery source classification", () => {
  it("recognises AI referrals and campaign labels without leaking query data", () => {
    expect(discoverySource("https://chatgpt.com/?secret=private")).toBe("chatgpt");
    expect(discoverySource("", "chatgpt.com")).toBe("chatgpt");
    expect(discoverySource("https://gemini.google.com/app")).toBe("gemini");
    expect(discoverySource("https://www.google.com.gh/search?q=private")).toBe("google");
    expect(discoverySource("https://www.saashub.com/giga3-ai")).toBe("directory");
    expect(discoverySource("https://google.com.attacker.example")).toBe("other");
    expect(discoverySource("https://notgoogle.com")).toBe("other");
    expect(discoverySource("", "unknown@example.com")).toBe("other");
    expect(discoverySource("https://www.giga3ai.com/study-guides/")).toBe("direct");
  });
  it("attributes public guides and exam entries while excluding private and unrelated routes", () => {
    expect(isDiscoveryLanding("/gigalearn/exam/bece/")).toBe(true);
    expect(isDiscoveryLanding("/study-guides/bece-mathematics-fractions-ghana/")).toBe(true);
    expect(isDiscoveryLanding("/chat/")).toBe(false);
    expect(isDiscoveryLanding("/admin/")).toBe(false);
    expect(isDiscoveryLanding("/gigalearn/academy/practice/")).toBe(false);
  });
});
