import { describe, expect, it } from "vitest";
import {
  continueChatCreation,
  startChatCreation,
  type ChatCreationState,
} from "../../web/lib/gigalearn/creation/chatIntake";
import {
  brainstormBookTitles,
  classifyBookIntakeMessage,
  isNumericChapterCountAnswer,
} from "../../web/lib/gigalearn/creation/bookIntakeActions";
import { normalizeAnswer } from "../../web/lib/gigalearn/creation/intake";
import { getCreationTemplate, stagesFor } from "../../web/lib/gigalearn/creation/templates";
import { parseCreationLink } from "../../web/lib/gigalearn/creation/links";

function answer(state: ChatCreationState | null, text: string) {
  if (!state) throw new Error("Intake ended unexpectedly");
  return continueChatCreation(state, text);
}

describe("book writing workflow — seven-turn scenario", () => {
  it("brainstorms titles, accepts subject change, and never numeric-loops on content questions", () => {
    let turn = startChatCreation("I want to write a book.")!;
    expect(turn.state?.templateId).toBe("book");
    expect(turn.state?.pendingFieldId).toBe("title");
    expect(turn.reply).toMatch(/title/i);

    turn = answer(
      turn.state,
      "Brainstorm and investigate a title likely to go viral on the internet about AI."
    );
    expect(turn.state?.pendingFieldId).toBe("title");
    expect(turn.state?.inputs.title).toBeUndefined();
    expect(turn.state?.titleSuggestions?.length).toBeGreaterThanOrEqual(5);
    expect(turn.state?.titleSuggestions?.length).toBeLessThanOrEqual(10);
    expect(turn.reply).toMatch(/Recommended:/i);
    expect(turn.reply).not.toMatch(/guaranteed to go viral/i);
    expect(turn.reply).toMatch(/not a guarantee of going viral/i);

    turn = answer(turn.state, "List your suggested title for me.");
    expect(turn.state?.pendingFieldId).toBe("title");
    expect(turn.state?.inputs.title).toBeUndefined();
    expect(turn.state?.titleSuggestions?.length).toBeGreaterThanOrEqual(5);
    expect(turn.reply).toMatch(/1\./);

    turn = answer(turn.state, "Global, Africa.");
    expect(turn.state?.inputs.audience).toMatch(/Global|Africa/i);
    expect(turn.state?.inputs.title).toBeUndefined();
    expect(turn.state?.pendingFieldId).toBe("title");

    turn = answer(
      turn.state,
      "Give me details about separation of mixtures for JHS 2 students."
    );
    expect(turn.state?.inputs.subject).toMatch(/separation of mixtures/i);
    expect(turn.state?.inputs.audience).toMatch(/JHS 2/i);
    expect(String(turn.state?.inputs.title ?? "")).not.toMatch(/Give me details/i);

    turn = answer(turn.state, "Formal.");
    expect(turn.state?.inputs.tone).toBe("Formal");
    expect(turn.state?.inputs.subject).toMatch(/separation of mixtures/i);
    expect(turn.state?.inputs.audience).toMatch(/JHS 2|Global|Africa/i);

    turn = answer(turn.state, "What are the methods of separation of mixtures?");
    expect(turn.reply).not.toMatch(/Please enter a number/i);
    expect(turn.reply).toMatch(/Filtration|Magnetic|Sedimentation|Handpicking/i);
    expect(turn.reply).toMatch(/Suggested chapter outline/i);
    expect(turn.state?.inputs.chapterPlan).toBeTruthy();
    expect(String(turn.state?.inputs.chapterPlan)).toMatch(/filtration/i);

    // Pick a title and accept outline → ready for preview/generation inputs
    turn = answer(turn.state, "1");
    expect(turn.state?.inputs.title).toBeTruthy();
    turn = answer(turn.state, "use this outline");
    expect(turn.state?.inputs.chapterCount).toBeTruthy();
    expect(Number(turn.state?.inputs.chapterCount)).toBeGreaterThanOrEqual(3);

    const stages = stagesFor(getCreationTemplate("book")!, turn.state!.inputs);
    expect(stages.some((s) => s.id === "chapter-1")).toBe(true);
    expect(turn.state?.inputs.subject).toMatch(/separation of mixtures/i);
    expect(turn.state?.inputs.tone).toBe("Formal");
  });

  it("persists a chosen or edited suggested title", () => {
    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Brainstorm titles about AI for Africa");
    const first = turn.state!.titleSuggestions![0]!;
    turn = answer(turn.state, "1");
    expect(turn.state?.inputs.title).toBe(first);

    turn = startChatCreation("Help me write a book")!;
    turn = answer(turn.state, "Suggest book titles about AI");
    turn = answer(turn.state, "My Custom AI Title");
    expect(turn.state?.inputs.title).toBe("My Custom AI Title");
  });

  it("treats more options as another title brainstorm, not a title value", () => {
    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Brainstorm titles about AI");
    expect(turn.state?.titleSuggestions?.length).toBeGreaterThanOrEqual(5);
    turn = answer(turn.state, "more options");
    expect(turn.state?.inputs.title).toBeUndefined();
    expect(String(turn.state?.inputs.title ?? "")).not.toMatch(/more options/i);
    expect(turn.state?.pendingFieldId).toBe("title");
    expect(turn.state?.titleSuggestions?.length).toBeGreaterThanOrEqual(5);
    expect(turn.reply).toMatch(/Recommended:/i);
  });

  it("suggest an outline fills chapter plan instead of numeric validation", () => {
    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Separating Mixtures");
    turn = answer(turn.state, "Separation of mixtures");
    turn = answer(turn.state, "JHS 2 students");
    turn = answer(turn.state, "Teach the topic clearly");
    turn = answer(turn.state, "Formal");
    expect(turn.state?.pendingFieldId).toBe("chapterCount");
    turn = answer(turn.state, "suggest an outline");
    expect(turn.reply).not.toMatch(/Please enter a (chapter count as a )?number/i);
    expect(turn.state?.inputs.chapterPlan).toMatch(/filtration|Handpicking|mixtures/i);
    expect(Number(turn.state?.inputs.chapterCount)).toBeGreaterThanOrEqual(3);
  });

  it("does not attach mixtures outline to an unrelated subject", () => {
    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Green Leaves");
    turn = answer(turn.state, "Photosynthesis");
    turn = answer(turn.state, "JHS 2 students");
    turn = answer(turn.state, "Teach clearly");
    turn = answer(turn.state, "Formal");
    turn = answer(turn.state, "What are the methods of separation of mixtures?");
    expect(turn.state?.inputs.subject).toMatch(/Photosynthesis/i);
    expect(String(turn.state?.inputs.chapterPlan ?? "")).not.toMatch(/Handpicking/i);
    expect(turn.reply).not.toMatch(/Please enter a number/i);
  });

  it("accepts natural-language chapter plans and validates numeric counts", () => {
    const book = getCreationTemplate("book")!;
    const chapterField = book.fields.find((f) => f.id === "chapterCount")!;
    expect(normalizeAnswer(chapterField, "What are the methods?").ok).toBe(false);
    expect(normalizeAnswer(chapterField, "8").ok).toBe(true);
    expect(normalizeAnswer(chapterField, "99").ok).toBe(false);
    expect(isNumericChapterCountAnswer("8 chapters")).toBe(true);
    expect(isNumericChapterCountAnswer("What are the methods of separation of mixtures?")).toBe(
      false
    );

    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Separating Mixtures for JHS");
    turn = answer(turn.state, "Separation of mixtures");
    turn = answer(turn.state, "JHS 2 students");
    turn = answer(turn.state, "Teach the topic clearly");
    turn = answer(turn.state, "Formal");
    turn = answer(
      turn.state,
      "Handpicking\nSieving\nFiltration\nEvaporation\nDistillation\nSafety and revision"
    );
    expect(turn.state?.inputs.chapterPlan).toMatch(/Filtration/i);
    expect(turn.state?.inputs.chapterCount).toBeTruthy();
    expect(turn.reply).not.toMatch(/Please enter a number/i);
  });

  it("allows skipping optional-friendly fields without wiping prior answers", () => {
    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Clean Water Science");
    turn = answer(turn.state, "Water treatment");
    turn = answer(turn.state, "Basic 7 learners");
    const before = { ...turn.state!.inputs };
    turn = answer(turn.state, "skip"); // purpose
    expect(turn.state?.inputs.title).toBe(before.title);
    expect(turn.state?.inputs.subject).toBe(before.subject);
    expect(turn.state?.inputs.purpose).toBeTruthy();
  });

  it("confirmation hands off to builder with final inputs intact", () => {
    let turn = startChatCreation("I want to write a book.")!;
    turn = answer(turn.state, "Separating Mixtures");
    turn = answer(turn.state, "Separation of mixtures");
    turn = answer(turn.state, "JHS 2 students");
    turn = answer(turn.state, "Teach methods clearly");
    turn = answer(turn.state, "Formal");
    turn = answer(turn.state, "8");
    turn = answer(turn.state, "Educational");
    expect(turn.state?.awaitingConfirmation).toBe(true);
    expect(turn.reply).toContain("Generation Preview");
    expect(turn.reply).toMatch(/Separation of mixtures/i);

    const confirmed = answer(turn.state, "yes");
    expect(confirmed.autostart).toBe(true);
    const parsed = parseCreationLink(
      new URL(confirmed.navigateTo!, "https://www.giga3ai.com").searchParams
    );
    expect(parsed?.templateId).toBe("book");
    expect(parsed?.inputs).toMatchObject({
      title: "Separating Mixtures",
      subject: "Separation of mixtures",
      audience: "JHS 2 students",
      tone: "Formal",
      chapterCount: "8",
    });
  });
});

describe("bookIntakeActions classifiers", () => {
  it("classifies brainstorm and educational intents", () => {
    expect(
      classifyBookIntakeMessage({
        text: "Brainstorm a viral title about AI",
        pendingFieldId: "title",
        inputs: {},
      }).type
    ).toBe("title_brainstorm");
    expect(
      classifyBookIntakeMessage({
        text: "What are the methods of separation of mixtures?",
        pendingFieldId: "chapterCount",
        inputs: { subject: "Separation of mixtures" },
      }).type
    ).toBe("educational");
    expect(brainstormBookTitles("AI Africa", {}).length).toBeGreaterThanOrEqual(5);
  });
});
