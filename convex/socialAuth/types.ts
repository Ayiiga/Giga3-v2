export const SOCIAL_AUTH_PROVIDERS = [
  "google",
  "apple",
  "microsoft",
  "github",
] as const;

export type SocialAuthProvider = (typeof SOCIAL_AUTH_PROVIDERS)[number];

export function isSocialAuthProvider(value: string): value is SocialAuthProvider {
  return (SOCIAL_AUTH_PROVIDERS as readonly string[]).includes(value);
}

export type SocialAuthIdentity = {
  provider: SocialAuthProvider;
  subject: string;
  email: string;
  emailVerified: true;
  name?: string;
  picture?: string;
};
