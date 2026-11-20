import { describe, expect, it } from "vitest";
import { planChatPoster, renderMissingPersonPoster } from "../../convex/chatPoster";

const brief = `MISSING PERSON

Please help find them.
Name: Example Person
Last seen: 2020 at Example Town
Age: 29 – 30 years
Height: Approximately 5 ft
Complexion: Chocolate
Build: Slim
Contact:
Example Contact: 0200000123
Second Contact: 0200000456`;
const photo = "data:image/jpeg;base64,ZmFrZQ==";
const distractor = { role: "assistant", content: "Here is your generated image:\n\nhttps://example.com/sample.png" };
const history = [{ role: "user", content: brief, createdAt: 100 }, distractor];
const query = "Use the information above and design beautiful poster for the missing person";

describe("chat poster request and original-photo continuity", () => {
  it("asks about the purpose of a generic poster instead of making up a theme", () => {
    expect(planChatPoster({ query: "Can you design a poster?\n\n[Please respond in Twi where possible.]", history: [] }))
      .toMatchObject({ kind: "ask", content: expect.stringContaining("What is the design for") });
  });

  it("uses only the user brief when an ordinary poster refers to information above", () => {
    const plan = planChatPoster({ query: "Use the information above and design a poster", history: [
      { role: "user", content: "School open day\nDate: 15 March\nLocation: Main Hall" }, distractor,
    ] });
    expect(plan).toMatchObject({ kind: "image", prompt: expect.stringContaining("15 March") });
    expect(plan).not.toMatchObject({ prompt: expect.stringContaining("sample.png") });
  });

  it("does not render a fictional person or borrow a previously generated image", () => {
    expect(planChatPoster({ query, history })).toMatchObject({ kind: "ask", content: expect.stringContaining("one original photo") });
    expect(planChatPoster({ query, history: [distractor] })).toMatchObject({ kind: "ask", content: expect.stringContaining("confirmed details") });
  });

  it("asks which photo to use and completes the pending design after a single attachment", () => {
    const ask = planChatPoster({ query, history });
    if (ask?.kind !== "ask") throw new Error("Expected a photo request");
    const followup = "Analyze this image.\n\n![upload](data:image/jpeg;base64,ZmFrZQ==)\n\n[Please respond in Twi where possible.]";
    const followupHistory = [...history, { role: "user", content: query }, { role: "assistant", content: ask.content }];
    expect(planChatPoster({ query: followup, history, images: [{ dataUrl: photo }] })).toBeUndefined();
    expect(planChatPoster({ query: followup, history: followupHistory, images: [{ dataUrl: photo }, { dataUrl: photo }] }))
      .toMatchObject({ kind: "ask", content: expect.stringContaining("only the one photo") });
    const plan = planChatPoster({ query: followup, history: followupHistory, images: [{ dataUrl: photo }] });
    expect(plan?.kind).toBe("missing_person");
    if (plan?.kind !== "missing_person") throw new Error("Expected a poster");
    const rendered = renderMissingPersonPoster(plan);
    for (const text of ["Example Person", "2020 at Example Town", "0200000123", "0200000456", photo]) {
      expect(rendered).toContain(text);
    }
    expect(rendered).not.toMatch(/sample\.png|2025|as of/i);
  });

  it("refuses a stale or unrelated cached portrait and a partial correction", () => {
    expect(planChatPoster({ query, history, images: [{ dataUrl: photo }], historicalImages: true, uploadAt: 99 }))
      .toMatchObject({ kind: "ask" });
    expect(planChatPoster({ query, history, images: [{ dataUrl: photo }], historicalImages: true, uploadAt: 300 }))
      .toMatchObject({ kind: "ask" });
    expect(planChatPoster({ query, history, images: [{ dataUrl: photo }], historicalImages: true, uploadAt: 100 }))
      .toMatchObject({ kind: "missing_person" });
    expect(planChatPoster({ query: "Correct the missing person poster above.\nName: Someone Else", history, images: [{ dataUrl: photo }] }))
      .toMatchObject({ kind: "ask" });
    expect(planChatPoster({ query, history: [...history, { role: "user", content: "A different missing person.\nName: New Person" }], images: [{ dataUrl: photo }] }))
      .toMatchObject({ kind: "ask" });
  });

  it("renders explicit text literally and requires JPEG, PNG or WebP bytes", () => {
    const direct = `Create a missing-person poster\n${brief.replace("Example Person", "<script>Test</script> & Name")}`;
    const plan = planChatPoster({ query: direct, history: [], images: [{ dataUrl: photo }] });
    expect(plan?.kind).toBe("missing_person");
    if (plan?.kind !== "missing_person") throw new Error("Expected a poster");
    const rendered = renderMissingPersonPoster(plan);
    expect(rendered).toContain("&lt;script&gt;Test&lt;/script&gt; &amp; Name");
    expect(rendered).not.toContain("<script>");
    expect(planChatPoster({ query: direct, history: [], images: [{ dataUrl: "data:image/svg+xml;base64,Zg==" }] }))
      .toMatchObject({ kind: "ask" });
  });
});
