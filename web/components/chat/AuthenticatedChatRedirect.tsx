"use client";

import { getSessionToken } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const CHAT_DESTINATION_PATHS = new Set(["/"]);

/**
 * Redirect authenticated users from the marketing landing page to chat.
 * Settings live at /home — do not redirect that route.
 */
export function AuthenticatedChatRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !CHAT_DESTINATION_PATHS.has(pathname)) return;
    if (!getSessionToken()) return;
    router.replace("/chat");
  }, [pathname, router]);

  return null;
}
