"use client";

import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/LoadingState";
import { BADGE_LABELS } from "@/lib/gigasocial/sections";
import type { SocialPost } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Award, Check, Loader2 } from "lucide-react";
import { memo, useEffect, useState } from "react";

export const GigaSocialProfilePanel = memo(function GigaSocialProfilePanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const data = useQuery(api.gigaSocial.getMyProfile, { sessionToken });
  const upsert = useMutation(api.gigaSocial.upsertMyProfile);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);
  const deletePost = useMutation(api.gigaSocial.deletePost);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const profile = data?.profile;
  const posts = (data?.recentPosts ?? []) as SocialPost[];
  const gamification = profile?.gamification;

  useEffect(() => {
    if (!profile || editing) return;
    setDisplayName(profile.displayName);
    setHandle(profile.handle);
    setBio(profile.bio);
    setSkills(profile.skills.join(", "));
    setInterests(profile.interests.join(", "));
  }, [profile, editing]);

  if (data === undefined) {
    return <LoadingState label="Loading profile…" />;
  }

  if (!data || !profile) return null;

  function startEdit() {
    setDisplayName(profile!.displayName);
    setHandle(profile!.handle);
    setBio(profile!.bio);
    setSkills(profile!.skills.join(", "));
    setInterests(profile!.interests.join(", "));
    setError(null);
    setSuccess(null);
    setEditing(true);
  }

  async function saveProfile() {
    const trimmedName = displayName.trim();
    const trimmedHandle = handle.trim();
    if (!trimmedName) {
      setError("Display name is required.");
      return;
    }
    if (!trimmedHandle) {
      setError("Handle is required.");
      return;
    }

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await upsert({
        sessionToken,
        displayName: trimmedName,
        handle: trimmedHandle,
        bio: bio.trim(),
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        interests: interests
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setEditing(false);
      setSuccess("Profile updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="saas-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-2xl font-bold text-white shadow-sm">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">{profile.displayName}</h3>
              <p className="text-sm text-muted">@{profile.handle}</p>
              {gamification && (
                <p className="mt-1 text-xs text-muted">
                  Level {gamification.level} · {gamification.xp} XP · {gamification.streakDays}-day streak
                </p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (editing) {
                setEditing(false);
                setError(null);
              } else {
                startEdit();
              }
            }}
          >
            {editing ? "Cancel" : "Edit profile"}
          </Button>
        </div>

        {success && !editing && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700" role="status">
            <Check className="h-4 w-4" aria-hidden />
            {success}
          </p>
        )}

        {editing ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void saveProfile();
            }}
          >
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-surface w-full"
              placeholder="Display name"
              required
              disabled={busy}
            />
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ""))}
              className="input-surface w-full"
              placeholder="Handle (no spaces)"
              required
              disabled={busy}
            />
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="input-surface w-full resize-none"
              placeholder="Bio"
              disabled={busy}
            />
            <input
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="input-surface w-full"
              placeholder="Skills (comma-separated)"
              disabled={busy}
            />
            <input
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              className="input-surface w-full"
              placeholder="Interests (comma-separated)"
              disabled={busy}
            />
            <Button type="submit" disabled={busy} className="min-h-10">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Save profile"}
            </Button>
            {error && (
              <p className="text-xs text-red-700" role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <>
            {profile.bio && <p className="mt-4 text-sm text-foreground">{profile.bio}</p>}
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Posts</dt>
                <dd className="font-medium">{profile.postCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-muted">Communities</dt>
                <dd className="font-medium">{profile.communityCount ?? 0}</dd>
              </div>
              {profile.skills.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Skills</dt>
                  <dd className="font-medium">{profile.skills.join(", ")}</dd>
                </div>
              )}
              {profile.interests.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Interests</dt>
                  <dd className="font-medium">{profile.interests.join(", ")}</dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>

      {gamification && gamification.badges.length > 0 && (
        <section>
          <h4 className="platform-section-title mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" aria-hidden />
            Achievements
          </h4>
          <ul className="flex flex-wrap gap-2">
            {gamification.badges.map((badge: string) => (
              <li
                key={badge}
                className="rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-foreground"
              >
                {BADGE_LABELS[badge] ?? badge}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4 className="platform-section-title mb-3">Your posts</h4>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">You have not posted yet.</p>
        ) : (
          <ul className="space-y-4">
            {posts.map((post) => (
              <li key={post._id}>
                <GigaSocialPostCard
                  post={post}
                  sessionToken={sessionToken}
                  canDelete
                  onLike={async (postId) => {
                    await toggleLike({ sessionToken, postId: postId as Id<"socialPosts"> });
                  }}
                  onBookmark={async (postId) => {
                    await toggleBookmark({ sessionToken, postId: postId as Id<"socialPosts"> });
                  }}
                  onShare={async (postId) => {
                    await recordShare({ sessionToken, postId: postId as Id<"socialPosts"> });
                  }}
                  onDelete={async (postId) => {
                    await deletePost({ sessionToken, postId: postId as Id<"socialPosts"> });
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
});
