"use client";

import { gigaSocialPostPath, gigaSocialProfilePath } from "@/lib/seo/publicPaths";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function GigaSocialPostLegacyRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const postId = params.get("id")?.trim();

  useEffect(() => {
    if (!postId) return;
    router.replace(gigaSocialPostPath(postId));
  }, [postId, router]);

  if (!postId) return null;
  return <p className="text-center text-muted">Redirecting to post…</p>;
}

export function GigaSocialProfileLegacyRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const handle = params.get("handle")?.replace(/^@/, "").trim().toLowerCase();

  useEffect(() => {
    if (!handle) return;
    router.replace(gigaSocialProfilePath(handle));
  }, [handle, router]);

  if (!handle) return null;
  return <p className="text-center text-muted">Redirecting to profile…</p>;
}
