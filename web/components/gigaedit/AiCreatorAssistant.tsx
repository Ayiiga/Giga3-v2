"use client";

import {
  generateLocalCreativeDraft,
  launchAiAssistInChat,
  type AiAssistKind,
} from "@/lib/gigaedit/aiAssist";
import { isGigaEditOnline } from "@/lib/gigaedit/offline";
import { useRouter } from "next/navigation";
import { useState } from "react";

const KINDS: { id: AiAssistKind; label: string }[] = [
  { id: "script", label: "Scripts" },
  { id: "caption", label: "Captions" },
  { id: "hook", label: "Hooks" },
  { id: "hashtags", label: "Hashtags" },
  { id: "video-ideas", label: "Video ideas" },
  { id: "thumbnail", label: "Thumbnails" },
  { id: "marketing", label: "Marketing" },
];

export function AiCreatorAssistant() {
  const router = useRouter();
  const [kind, setKind] = useState<AiAssistKind>("script");
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">AI creator assistant</h2>
        <p className="mt-1 text-xs text-[var(--ge-muted)]">
          Connects to Giga3 Chat for full generation when online. Offline drafts stay on-device and are
          clearly labeled AI-assisted.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${
              kind === k.id
                ? "bg-[var(--ge-gold)] font-bold text-[#0b1220]"
                : "border border-[var(--ge-border)] text-[var(--ge-muted)]"
            }`}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      <label className="block text-xs text-[var(--ge-muted)]">
        Topic
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--ge-border)] bg-[var(--ge-input)] px-3 py-2 text-sm"
          placeholder="What are you creating?"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[var(--ge-gold)] px-3 py-2 text-xs font-bold text-[#0b1220]"
          onClick={() => {
            const text = generateLocalCreativeDraft(kind, topic);
            setDraft(text);
            setStatus("Local AI-assisted draft ready (offline-safe).");
          }}
        >
          Generate local draft
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--ge-border)] px-3 py-2 text-xs"
          onClick={() => {
            if (!isGigaEditOnline()) {
              setStatus("You’re offline — local draft still works.");
              setDraft(generateLocalCreativeDraft(kind, topic));
              return;
            }
            launchAiAssistInChat(kind, topic);
            setStatus("Opening Giga3 Chat with your prompt…");
            router.push("/chat");
          }}
        >
          Open in Giga3 Chat
        </button>
      </div>

      {draft ? (
        <pre className="gigaedit-glass whitespace-pre-wrap p-4 text-xs leading-relaxed text-[var(--ge-muted)]">
          {draft}
        </pre>
      ) : null}
      {status ? <p className="text-xs text-[var(--ge-gold)]">{status}</p> : null}
    </div>
  );
}
