"use client";

import {
  buildCommunityInsights,
  buildModerationSuggestions,
  translateCommunityAnnouncement,
} from "@/lib/gigasocial/communityAssistant";
import { runSocialAi } from "@/lib/gigasocial/socialAiRouter";
import { useGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import type { SocialCommunity } from "@/lib/gigasocial/types";
import { cn } from "@/lib/utils";
import { ShieldAlert, Sparkles } from "lucide-react";
import { memo, useMemo, useState, useTransition } from "react";

export const CommunityAssistantPanel = memo(function CommunityAssistantPanel({
  community,
  className,
}: {
  community: SocialCommunity;
  className?: string;
}) {
  const features = useGigaSocialFeatures();
  const [pending, startTransition] = useTransition();
  const [translation, setTranslation] = useState<string | null>(null);

  const insights = useMemo(
    () =>
      buildCommunityInsights({
        name: community.name,
        memberCount: community.memberCount,
        category: community.category,
      }),
    [community.category, community.memberCount, community.name]
  );

  const moderation = useMemo(() => buildModerationSuggestions(), []);

  if (!features.enableCommunityAI) return null;

  return (
    <section
      className={cn(
        "saas-card rounded-2xl border border-violet-200 bg-violet-50/40 p-4",
        className
      )}
      aria-label={`AI assistant for ${community.name}`}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-violet-700" aria-hidden />
        AI Community Assistant
      </h3>
      <p className="mt-1 text-[11px] text-muted">
        Suggestions only — content is never removed automatically.
      </p>

      <ul className="mt-3 space-y-2">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-foreground"
          >
            <p className="text-xs font-semibold">{insight.title}</p>
            <p className="mt-0.5 text-xs text-muted">{insight.body}</p>
          </li>
        ))}
      </ul>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-950">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          Moderation suggestions
        </p>
        <ul className="mt-2 space-y-1.5">
          {moderation.map((item) => (
            <li key={item.id} className="text-[11px] text-amber-950/90">
              <span className="font-medium">{item.title}:</span> {item.detail}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          startTransition(() => {
            const draft = translateCommunityAnnouncement(
              `Welcome to ${community.name}. Please keep discussions respectful.`
            );
            void runSocialAi({ kind: "translate", prompt: draft }).then((result) => {
              setTranslation(result.text);
            });
          });
        }}
        className="mt-3 inline-flex min-h-9 items-center rounded-full border border-violet-200 bg-white px-3 text-xs font-medium text-violet-900"
      >
        Suggest announcement translation
      </button>
      {translation ? (
        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-white p-2 text-[11px] text-foreground">
          {translation}
        </p>
      ) : null}
    </section>
  );
});
