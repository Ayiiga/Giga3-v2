import { describe, expect, it } from "vitest";
import {
  continueChatCreation,
  detectCreationIntent,
  startChatCreation,
  type ChatCreationState,
} from "../../web/lib/gigalearn/creation/chatIntake";
import { parseCreationLink } from "../../web/lib/gigalearn/creation/links";

function answer(state: ChatCreationState | null, text: string) {
  if (!state) throw new Error("Intake ended unexpectedly");
  return continueChatCreation(state, text);
}

describe("detectCreationIntent", () => {
  it("prefills details from the request", () => {
    expect(detectCreationIntent("Help me create a Basic 8 science lesson.")).toEqual({
      templateId: "lesson",
      inputs: { subject: "Science", level: "Basic 8" },
    });
    expect(detectCreationIntent("Write lesson notes on photosynthesis for JHS 2 for 60 minutes")?.inputs).toMatchObject({
      level: "Basic 8",
      topic: "Photosynthesis",
      duration: "60 minutes",
      documentKind: "Lesson note",
    });
    expect(detectCreationIntent("Create a counting rhyme")?.inputs).toEqual({ category: "Numbers & Counting" });
  });

  it("ignores questions, media requests and other document types", () => {
    expect(detectCreationIntent("What is a lesson plan?")).toBeNull();
    expect(detectCreationIntent("Create an image of a book")).toBeNull();
    expect(detectCreationIntent("Make a book cover for my novel")).toBeNull();
    expect(detectCreationIntent("Write a summary of this book")).toBeNull();
    expect(detectCreationIntent("Write an essay on research methods")).toBeNull();
    expect(detectCreationIntent("Tell me a joke")).toBeNull();
  });
});

describe("chat creation flow", () => {
  it("asks progressive questions, previews, and only generates after confirmation", () => {
    let turn = startChatCreation("Help me create a Basic 8 science lesson.")!;
    expect(turn.reply).toMatch(/what Science topic should the lesson cover\?/i);
    expect(turn.navigateTo).toBeUndefined();

    turn = answer(turn.state, "Photosynthesis");
    expect(turn.reply).toMatch(/What lesson duration do you want\?/);
    expect(turn.navigateTo).toBeUndefined();

    let guard = 0;
    while (turn.state && !turn.state.awaitingConfirmation && guard++ < 10) {
      turn = answer(turn.state, "1");
      expect(turn.navigateTo).toBeUndefined();
    }
    expect(turn.state?.awaitingConfirmation).toBe(true);
    expect(turn.reply).toContain("Generation Preview");
    expect(turn.reply).toContain("Photosynthesis");
    expect(turn.reply).toMatch(/Would you like me to generate this\?/);
    expect(turn.navigateTo).toBeUndefined();

    const unclear = answer(turn.state, "hmm");
    expect(unclear.navigateTo).toBeUndefined();
    expect(unclear.state?.awaitingConfirmation).toBe(true);

    const confirmed = answer(turn.state, "yes");
    expect(confirmed.autostart).toBe(true);
    expect(confirmed.state).toBeNull();
    const parsed = parseCreationLink(new URL(confirmed.navigateTo!, "https://www.giga3ai.com").searchParams);
    expect(parsed?.templateId).toBe("lesson");
    expect(parsed?.step).toBe("confirm");
    expect(parsed?.inputs).toMatchObject({ subject: "Science", level: "Basic 8", topic: "Photosynthesis" });
  });

  it("edit sends the user to Edit Details without generating", () => {
    let turn = startChatCreation("Create a colours rhyme")!;
    let guard = 0;
    while (turn.state && !turn.state.awaitingConfirmation && guard++ < 10) turn = answer(turn.state, "1");
    const edit = answer(turn.state, "edit");
    expect(edit.navigateTo).toBeUndefined();
    expect(edit.reply).toContain("step=edit");
  });

  it("can be cancelled at any point", () => {
    const turn = startChatCreation("Help me write a research proposal")!;
    expect(turn.reply).toMatch(/never invent data or results/);
    const cancelled = answer(turn.state, "cancel");
    expect(cancelled.state).toBeNull();
    expect(cancelled.navigateTo).toBeUndefined();
  });

  it("never collects CV personal details in chat", () => {
    const turn = startChatCreation("Help me build my CV")!;
    expect(turn.state).toBeNull();
    expect(turn.reply).not.toMatch(/full name|phone|email address/i);
    expect(turn.reply).toContain("template=cv");
  });
});
