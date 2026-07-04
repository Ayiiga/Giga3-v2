import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";

/** Client-side mirror of server feature flags exposed via getChatCredits. */
export function useGiga3Features(sessionToken: string | null) {
  const credits = useQuery(
    api.users.getChatCredits,
    sessionToken ? { sessionToken } : "skip"
  );
  return (
    credits?.features ?? {
      liveNews: true,
      pushAlerts: false,
      openAiImageRequiresSubscription: true,
    }
  );
}
