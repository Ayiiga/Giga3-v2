import { api } from "convex/_generated/api";
import { getConvexClient } from "@/lib/convex";
import { getOrCreateClientId } from "./clientId";

export function recordExamPracticeCompletion() {
  const client = getConvexClient();
  void client?.mutation(api.platformStats.recordExamPracticeCompletion, {
    clientId: getOrCreateClientId(),
  }).catch(() => undefined);
}
