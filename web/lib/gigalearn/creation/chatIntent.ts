/**
 * Cheap pre-check kept in the chat bundle; the full intake (templates, questions)
 * is loaded on demand only when a message might be a creation request.
 */
export const CREATION_VERB =
  /^(?:please\s+)?(?:(?:can|could|would|will)\s+you\s+(?:please\s+)?|help\s+me\s+(?:to\s+)?|i\s+(?:want|need|would\s+like)\s+(?:you\s+)?to\s+|i\s+want\s+|i\s+need\s+|let'?s\s+)?(?:create|make|write|build|prepare|draft|generate|develop|design|compose)\b/i;

export function mightBeCreationRequest(text: string): boolean {
  return CREATION_VERB.test(text.trim());
}
