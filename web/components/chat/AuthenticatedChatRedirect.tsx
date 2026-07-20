"use client";

import { getSessionToken } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const CHAT_DESTINATION_PATHS = new Set(["/", "/home", "/home/"]);

/**
 * Redirect authenticated users from the marketing home page straight to chat.
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
