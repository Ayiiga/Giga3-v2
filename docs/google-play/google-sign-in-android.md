# Google Sign-In — Android TWA considerations

Giga3 web auth was **not modified** for the TWA phase. This document describes what may be required for Sign in with Google inside the Play-distributed app.

## Current web implementation

| Component | Location |
|-----------|----------|
| GIS client script | `https://accounts.google.com/gsi/client` |
| UI | `web/components/chat/GoogleSignInButton.tsx` |
| Token exchange | `web/lib/authGoogle.ts` → Convex `googleAuthActions:signInWithGoogle` |
| Build-time client ID | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |
| Server client ID | Convex `GOOGLE_CLIENT_ID` |

CSP (`web/public/_headers`) allows `accounts.google.com` for scripts, frames, and connect.

## TWA / WebView behavior

The TWA uses Chrome Custom Tabs / Trusted Web Activity to render **https://www.giga3ai.com**. Google Identity Services (GIS) generally works in Chrome on Android, but you should verify on a physical device:

- One Tap / Sign in with Google button on `/chat/login/`
- FedCM / third-party cookie restrictions on future Android versions

## Manual setup (if sign-in fails on device)

Create credentials in [Google Cloud Console](https://console.cloud.google.com/) — **do not commit secrets**:

1. **Web client** (existing) — authorized JavaScript origins must include `https://www.giga3ai.com`.
2. **Android OAuth client** (may be required for some GIS flows):
   - Package name: `com.giga3ai.app`
   - SHA-1 certificate fingerprint: from your **upload key** or **Play App Signing** certificate (Console → App integrity).

3. Ensure Convex `GOOGLE_CLIENT_ID` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` match the **Web** OAuth client ID (current pattern).

No automatic credential creation was performed in this phase.

## Testing checklist

- [ ] Email/password login on Android TWA
- [ ] Google Sign-In on Android TWA
- [ ] Session persistence after app restart
- [ ] Logout clears `localStorage` session keys
