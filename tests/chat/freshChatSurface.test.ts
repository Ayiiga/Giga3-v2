import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("fresh chat surface", () => {
  it("opens chat without restoring a stored active conversation id", () => {
    const platform = readFileSync(
      resolve(__dirname, "../../web/hooks/useChatPlatform.ts"),
      "utf8"
    );
    expect(platform).toContain('useState<string | null>(null)');
    expect(platform).not.toContain("readActiveConversationId()");
  });

  it("does not auto-select the first conversation when none is active", () => {
    const platform = readFileSync(
      resolve(__dirname, "../../web/hooks/useChatPlatform.ts"),
      "utf8"
    );
    const supabase = readFileSync(
      resolve(__dirname, "../../web/hooks/useSupabaseChatPlatform.ts"),
      "utf8"
    );
    expect(platform).toContain("return null;");
    expect(platform).not.toContain("return conversations[0]._id;");
    expect(supabase).not.toContain("return conversations[0]._id;");
  });

  it("clears UI state on New Chat without eagerly creating a backend conversation", () => {
    const platform = readFileSync(
      resolve(__dirname, "../../web/hooks/useChatPlatform.ts"),
      "utf8"
    );
    expect(platform).toContain("stopGigaVoice()");
    expect(platform).toContain("clearComposerDraft(null)");
    expect(platform).toContain("setActiveId(null)");
    expect(platform).not.toMatch(
      /const startNewChat = useCallback\(async \(\) => \{[\s\S]*?createConversation/m
    );
  });

  it("keeps AfricanVoiceReader for non-structured replies only", () => {
    const bubble = readFileSync(
      resolve(__dirname, "../../web/components/chat/MessageBubble.tsx"),
      "utf8"
    );
    expect(bubble).toContain("AnswerContentBlock");
    expect(bubble).toContain("!answerBlocks?.isStructured");
    expect(bubble).toContain("<AfricanVoiceReader");
  });

  it("routes answer block read-aloud through the shared Giga voice layer", () => {
    const actions = readFileSync(
      resolve(__dirname, "../../web/components/chat/AnswerBlockActions.tsx"),
      "utf8"
    );
    expect(actions).toContain("toggleGigaVoiceBlock");
    expect(actions).toContain("readVoiceLanguageId");
    expect(actions).not.toContain("readAloud(");
  });
});
