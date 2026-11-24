"use client";

import { gigaSocialPostPath, gigaSocialProfilePath } from "@/lib/seo/publicPaths";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const ActivityPost = dynamic(() => import("./GigaSocialPublicPostClient").then(m => m.GigaSocialPublicPostRoot), { ssr: false });
const ActivityProfile = dynamic(() => import("./GigaSocialPublicProfileClient").then(m => m.GigaSocialPublicProfileRoot), { ssr: false });

function ActivityBackLink() {
  return <Link href="/gigasocial/?tab=notifications" className="mx-4 my-3 inline-flex min-h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-accent">Back to notifications</Link>;
}

export function GigaSocialPostLegacyRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const postId = params.get("id")?.trim();
  const activity = params.get("activity") === "1";

  useEffect(() => {
    if (!postId || activity) return;
    router.replace(gigaSocialPostPath(postId));
  }, [postId, router, activity]);

  if (activity && postId) return <><ActivityBackLink /><ActivityPost initialPostId={postId} /></>;

  if (!postId) return null;
  return <p className="text-center text-muted">Redirecting to post…</p>;
}

export function GigaSocialProfileLegacyRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const handle = params.get("handle")?.replace(/^@/, "").trim().toLowerCase();
  const activity = params.get("activity") === "1";

  useEffect(() => {
    if (!handle || activity) return;
    router.replace(gigaSocialProfilePath(handle));
  }, [handle, router, activity]);

  if (activity && handle) return <><ActivityBackLink /><ActivityProfile /></>;

  if (!handle) return null;
  return <p className="text-center text-muted">Redirecting to profile…</p>;
}
