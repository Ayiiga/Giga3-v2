export const MIN_PASSWORD_LENGTH = 8;

/**
 * Password rules for sign-up / reset.
 * Keep messaging user-facing — returned strings are shown in the UI.
 */
export function validatePasswordShape(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > 128) {
    return "Password is too long.";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Password must include at least one letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (/^\s|\s$/.test(password)) {
    return "Password cannot start or end with a space.";
  }
  return null;
}

/** Lightweight client/server hint for password forms. */
export function passwordRequirementsHint(): string {
  return "Use at least 8 characters with a letter and a number.";
}
