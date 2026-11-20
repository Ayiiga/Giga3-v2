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

  it("remembers a request for details when they arrive before the photo", () => {
    const initialQuery = "Make a missing person poster";
    const ask = planChatPoster({ query: initialQuery, history: [] });
    if (ask?.kind !== "ask") throw new Error("Expected a question about the details");
    const details = brief.slice(brief.indexOf("Name:"));
    const pending = [{ role: "user", content: initialQuery }, { role: "assistant", content: ask.content }];
    const photoAsk = planChatPoster({ query: details, history: pending });
    expect(photoAsk).toMatchObject({ kind: "ask", content: expect.stringContaining("one original photo") });
    if (photoAsk?.kind !== "ask") throw new Error("Expected a question about the photo");
    expect(planChatPoster({
      query: "Analyze this image.",
      history: [...pending, { role: "user", content: details }, { role: "assistant", content: photoAsk.content }],
      images: [{ dataUrl: photo }],
    })).toMatchObject({ kind: "missing_person" });
    expect(planChatPoster({
      query: `Create a missing person poster\n${brief.replace("2020 at Example Town", "")}`,
      history: [], images: [{ dataUrl: photo }],
    })).toMatchObject({ kind: "ask" });
  });

  it("retains a complete brief that begins with a request for delivery", () => {
    const direct = `I need a missing person poster\n${brief}`;
    const ask = planChatPoster({ query: direct, history: [] });
    expect(ask).toMatchObject({ kind: "ask", content: expect.stringContaining("one original photo") });
    if (ask?.kind !== "ask") throw new Error("Expected a question about the photo");
    expect(planChatPoster({
      query: "Analyze this image.",
      history: [{ role: "user", content: direct }, { role: "assistant", content: ask.content }],
      images: [{ dataUrl: photo }],
    })).toMatchObject({ kind: "missing_person", details: { name: "Example Person" } });
  });

  it("resumes the actual mobile prompt and recovers a previously selected photo after the old analysis reply", () => {
    const ask = planChatPoster({ query, history });
    if (ask?.kind !== "ask") throw new Error("Expected a photo request");
    const preview = "data:image/jpeg;base64,cHJldmlldw==";
    const reply = `Use this\n\n![portrait.jpg](${preview})\n\n[Please respond in Twi where possible.]`;
    const pending = [...history, { role: "user", content: query, createdAt: 200 }, { role: "assistant", content: ask.content, createdAt: 300 }];
    expect(planChatPoster({ query: reply, history: pending, images: [{ dataUrl: photo }] }))
      .toMatchObject({ kind: "missing_person", photo, details: { name: "Example Person" } });
    const oldThread = [
      ...pending,
      { role: "user", content: reply, createdAt: 400 },
      { role: "assistant", content: "Would you like me to create a missing person poster with the details you provided earlier?", createdAt: 500 },
    ];
    const followUp = "create a missing person poster with the details you provided earlier";
    expect(planChatPoster({ query: followUp, history: oldThread, images: [{ dataUrl: photo }], historicalImages: true, uploadAt: 400 }))
      .toMatchObject({ kind: "missing_person", photo, usedSavedPreview: false });
    expect(planChatPoster({ query: followUp, history: oldThread }))
      .toMatchObject({ kind: "missing_person", photo: preview, usedSavedPreview: true });
    expect(planChatPoster({ query: brief, history: oldThread }))
      .toMatchObject({ kind: "missing_person", photo: preview });
    expect(planChatPoster({ query: brief.replace("Example Person", "Another Person"), history: oldThread }))
      .toMatchObject({ kind: "ask", content: ask.content });
    expect(planChatPoster({ query: "Use this", history: [distractor], images: [{ dataUrl: photo }] })).toBeUndefined();
    for (const reply of ["I have already sent", "I've already sent the photo", "I’ve already sent the photo"]) {
      expect(planChatPoster({ query: reply, history: [...oldThread, { role: "assistant", content: ask.content }] }))
        .toMatchObject({ kind: "missing_person", photo: preview });
    }
  });

  it("delivers an image poster without a portrait when asked and no selected photo is available", () => {
    const ask = planChatPoster({ query, history });
    if (ask?.kind !== "ask") throw new Error("Expected a photo request");
    const plan = planChatPoster({ query: "I can't send you any image", history: [...history, { role: "assistant", content: ask.content }] });
    expect(plan?.kind).toBe("missing_person");
    if (plan?.kind !== "missing_person") throw new Error("Expected a poster");
    expect(plan.photo).toBeUndefined();
    expect(renderMissingPersonPoster(plan)).toContain("Example Person");
    expect(renderMissingPersonPoster(plan)).not.toContain("<image ");
    expect(planChatPoster({ query: "I can't send you any image", history: [distractor] })).toBeUndefined();
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

it("keeps the brief and photo when switching poster layouts", () => {
  const selected = planChatPoster({
    query: `Create a missing-person poster\nPoster design: Bulletin\n${brief}`,
    history: [],
    images: [{ dataUrl: photo }],
  });
  expect(selected?.kind).toBe("missing_person");
  if (selected?.kind !== "missing_person") throw new Error("Expected a poster");
  const bulletin = renderMissingPersonPoster(selected);
  const alert = renderMissingPersonPoster({ ...selected, design: "alert" });
  expect(bulletin).toContain('data-poster-design="bulletin"');
  expect(alert).toContain('data-poster-design="alert"');
  for (const svg of [bulletin, alert]) {
    expect(svg).toContain(`href="${photo}" preserveAspectRatio="xMidYMid meet"`);
    expect(svg).toContain("Last seen: 2020 at Example Town");
    expect(svg).toContain("Second Contact: 0200000456");
  }
  expect(alert).not.toBe(bulletin);
});


it("redesigns the current poster with saved details and the same photo", () => {
  const source = [
    { role: "user", content: `${brief}\n![photo](${photo})` },
    { role: "assistant", content: "Here is your missing-person poster:\n\nhttps://example.com/old.svg" },
    { role: "user", content: "Please redesign the missing-person poster" },
    { role: "assistant", content: "What would you like to change?" },
  ];
  const expected = { kind: "missing_person", photo, details: { name: "Example Person" }, design: "bulletin" };
  expect(planChatPoster({ query: "Please redesign the poster", history: source })).toMatchObject(expected);
  expect(planChatPoster({ query: "Could you redesign the poster in the Alert layout?", history: source }))
    .toMatchObject({ ...expected, design: "alert" });
  expect(planChatPoster({ query: "Please redesign the poster and add a reward", history: source }))
    .toMatchObject({ kind: "ask" });
  expect(planChatPoster({ query: "How can I redesign the poster in Canva?", history: source })).toBeUndefined();
  expect(planChatPoster({ query: "Please redesign the poster", history: [
    ...source, { role: "user", content: "Create a poster announcing our school open day" },
  ] })).toMatchObject({ kind: "ask" });
});

it("alternates the rendered layout and preserves a text-only poster", () => {
  expect(planChatPoster({ query: "Please redesign the poster again", history: [
    { role: "user", content: `Create a missing-person poster without a photo\n${brief}` },
    { role: "assistant", content: "Here is your missing-person poster:\n\nPoster design: Bulletin.\n\nThis poster has no photo.\n\nhttps://example.com/text.svg" },
  ] })).toMatchObject({ kind: "missing_person", design: "alert", details: { name: "Example Person" } });
});
