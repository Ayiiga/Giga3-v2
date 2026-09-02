import { validatePublicHttpUrl } from "./liveWebSecurity";
import type { WebActionKind, WebActionProposal } from "./types";

const CONSEQUENTIAL_PATTERNS: Array<{ kind: WebActionKind; re: RegExp }> = [
  { kind: "purchase", re: /\b(buy|purchase|checkout|pay|order)\b/i },
  { kind: "delete_account", re: /\b(delete account|close account|remove account)\b/i },
  { kind: "login", re: /\b(log\s*in|sign\s*in|authenticate)\b/i },
  { kind: "submit_form", re: /\b(submit|post form|send form)\b/i },
  { kind: "click", re: /\b(click|press|tap)\b/i },
];

const BLOCKED_PATTERNS: RegExp[] = [
  /\bcaptcha\b/i,
  /\bbypass\b/i,
  /\bpassword\b/i,
  /\bapi[_-]?key\b/i,
  /\btoken\b/i,
  /\bcookie\b/i,
  /\bpaywall\b/i,
  /\b2fa\b/i,
  /\botp\b/i,
];

export function classifyWebAction(description: string): WebActionKind {
  for (const entry of CONSEQUENTIAL_PATTERNS) {
    if (entry.re.test(description)) return entry.kind;
  }
  if (/\b(open|visit|navigate|go to)\b/i.test(description)) return "navigate";
  return "unknown";
}

export function proposeWebAction(description: string): WebActionProposal {
  const trimmed = description.trim();
  if (!trimmed) {
    return {
      kind: "unknown",
      description: trimmed,
      requiresConfirmation: false,
      blockedReason: "Empty action description",
    };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        kind: classifyWebAction(trimmed),
        description: trimmed,
        requiresConfirmation: false,
        blockedReason:
          "This action involves credentials, security controls, or restricted access and cannot be performed.",
      };
    }
  }

  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    const validated = validatePublicHttpUrl(urlMatch[0]);
    if (!validated.ok) {
      return {
        kind: "navigate",
        description: trimmed,
        requiresConfirmation: false,
        blockedReason: validated.reason,
      };
    }
  }

  const kind = classifyWebAction(trimmed);

  return {
    kind,
    description: trimmed,
    targetUrl: urlMatch?.[0],
    requiresConfirmation: true,
  };
}

export function isWebActionSupported(): boolean {
  return false;
}

export type WebActionExecutionResult = {
  ok: boolean;
  message: string;
  status: "confirmed" | "rejected" | "blocked" | "unsupported";
};

export function executeConfirmedWebAction(
  proposal: WebActionProposal,
  confirmed: boolean
): WebActionExecutionResult {
  if (proposal.blockedReason) {
    return {
      ok: false,
      message: proposal.blockedReason,
      status: "blocked",
    };
  }

  if (!confirmed) {
    return {
      ok: false,
      message: "Action cancelled.",
      status: "rejected",
    };
  }

  if (!isWebActionSupported()) {
    return {
      ok: false,
      message:
        "Web Actions mode is not supported by the current server runtime. No browser interaction was performed.",
      status: "unsupported",
    };
  }

  return {
    ok: false,
    message: "Action could not be executed.",
    status: "unsupported",
  };
}
