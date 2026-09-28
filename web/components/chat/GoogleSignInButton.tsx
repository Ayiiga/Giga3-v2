"use client";

import { useEffect, useRef } from "react";

/** Official Google Identity Services client. Not the legacy gapi/platform.js loader. */
export const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

type CredentialCallback = (idToken: string) => void;

type GoogleIdApi = {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdApi } };
  }
}

let scriptPromise: Promise<void> | null = null;

export function googleClientId(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
}

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  const pending = new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (window.google?.accounts?.id) resolve();
      else reject(new Error("Google sign-in could not be loaded."));
    };
    const fail = () => reject(new Error("Google sign-in could not be loaded."));
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`
    );
    if (existing) {
      if (window.google?.accounts?.id || existing.dataset.loaded === "1") {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "1";
      finish();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  scriptPromise = pending;
  pending.catch(() => {
    if (scriptPromise === pending) scriptPromise = null;
  });
  return pending;
}

type GoogleSignInButtonProps = {
  mode: "signin" | "signup";
  disabled?: boolean;
  onCredential: CredentialCallback;
  onError: (message: string) => void;
};

/**
 * Official Sign in with Google button.
 * Popup + FedCM keeps the ID token in the JS callback. Redirect mode POSTs to
 * a login URI, which this static export cannot receive.
 */
export function GoogleSignInButton({
  mode,
  disabled = false,
  onCredential,
  onError,
}: GoogleSignInButtonProps) {
  const clientId = googleClientId();
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  onCredentialRef.current = onCredential;
  onErrorRef.current = onError;

  useEffect(() => {
    const parent = containerRef.current;
    if (!clientId || !parent || disabled) return;
    let cancelled = false;
    loadGoogleIdentityScript()
      .then(() => {
        const googleId = window.google?.accounts?.id;
        if (cancelled || !googleId) return;
        googleId.initialize({
          client_id: clientId,
          callback: (response: { credential?: string }) => {
            const credential = response?.credential?.trim();
            if (!credential) {
              onErrorRef.current("Google sign-in was cancelled. You can try again or use your password.");
              return;
            }
            onCredentialRef.current(credential);
          },
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_button: true,
          button_auto_select: false,
          context: mode === "signup" ? "signup" : "signin",
        });
        parent.replaceChildren();
        const width = Math.min(400, Math.max(240, Math.floor(parent.clientWidth || 320)));
        googleId.renderButton(parent, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: mode === "signup" ? "signup_with" : "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        });
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current("Google sign-in could not be loaded. Use email and password.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, disabled, mode]);

  if (!clientId) return null;

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <div
        ref={containerRef}
        className="flex min-h-11 w-full items-center justify-center"
        data-google-signin={mode}
      />
    </div>
  );
}
