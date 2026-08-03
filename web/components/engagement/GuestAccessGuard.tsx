"use client";

import { GigaSocialAuthPrompt } from "@/components/gigasocial/ux/GigaSocialAuthPrompt";
import { useGuestAccess } from "@/hooks/useGuestAccess";
import { memo, useEffect, useState, type ReactNode } from "react";

/**
 * Listens for restricted-action events and shows the existing Sign In modal.
 * Presentation only — authentication flow unchanged.
 */
export const GuestAccessGuard = memo(function GuestAccessGuard({
  children,
  nextPath = "/gigasocial/",
  enabled = true,
}: {
  children?: ReactNode;
  nextPath?: string;
  enabled?: boolean;
}) {
  const { isGuest } = useGuestAccess();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    function onRequireAuth() {
      if (!isGuest) return;
      setOpen(true);
    }
    window.addEventListener("gigasocial:require-auth", onRequireAuth);
    return () => window.removeEventListener("gigasocial:require-auth", onRequireAuth);
  }, [enabled, isGuest]);

  return (
    <>
      {children}
      {open ? (
        <GigaSocialAuthPrompt
          variant="modal"
          nextPath={nextPath}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </>
  );
});
