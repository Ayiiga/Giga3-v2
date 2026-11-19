/** Text requests about images must not enter a paid rendering pipeline. */
export function isImageCommentaryOrInstruction(query: string): boolean {
  const request = query.trim().replace(
    /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?/i,
    '',
  );
  // Match the requested action, not instructional words inside a creative brief
  // such as “Create a poster explaining how to wash your hands”.
  if (/^(?:how|where|why|what|which|when)\b/i.test(request)) return true;
  if (/^(?:explain|describe|review|critique|analyse|analyze|evaluate|summari[sz]e|teach|brainstorm|suggest)\b/i.test(request)) return true;
  if (/^(?:show|tell|teach|guide|walk)\b(?:\s+(?:me|us))?\s+(?:how|where|why|what|which|whether|through|the steps)\b/i.test(request)) return true;
  if (/^(?:give|provide|offer|share|write|draft|create|generate)\s+(?:(?:me|us|an?|some|your|the|honest|brief|detailed|constructive|professional|quick|short)\s+){0,5}(?:feedback|critique|review|analysis|opinion|advice|ideas?|tips?|instructions?|prompts?|wording|captions?|copy|text)(?:\s|$)/i.test(request)) return true;
  return false;
}
