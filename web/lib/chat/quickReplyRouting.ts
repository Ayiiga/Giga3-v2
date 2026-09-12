import {
  isConversationalChatQuery,
  queryNeedsLiveWeb,
  resolveResearchCapability,
  type ResearchCapabilityId,
} from "convex/researchCapabilities";
import { readResearchCapability } from "@/lib/chat/liveWebPreferences";

/** Greetings/small talk that should use synchronous quick reply (no job queue). */
export function shouldUseQuickConversationalReply(args: {
  query: string;
  hasImageAttachment?: boolean;
}): boolean {
  if (args.hasImageAttachment) return false;
  const q = args.query.trim();
  if (!isConversationalChatQuery(q)) return false;
  const capability = resolveResearchCapability({
    explicit: readResearchCapability(),
    query: q,
    liveWebEnabled: false,
  });
  return !queryNeedsLiveWeb({ query: q, capability, hasImageAttachment: false });
}

export function quickReplyCapabilityForQuery(query: string): ResearchCapabilityId {
  return resolveResearchCapability({
    explicit: readResearchCapability(),
    query,
    liveWebEnabled: false,
  });
}
