"use client";

import { GigaSocialPostCard } from "@/components/gigasocial/GigaSocialPostCard";
import { GigaSocialGrowthHub } from "@/components/gigasocial/growth/GigaSocialGrowthHub";
import { GigaSocialCreatorStudio } from "@/components/gigasocial/studio/GigaSocialCreatorStudio";
import { ProfileSkeleton } from "@/components/gigasocial/ux/PanelSkeletons";
import { FAN_LABELS } from "@/lib/gigasocial/fanBranding";
import { SocialAvatar } from "@/components/gigasocial/SocialAvatar";
import { Button } from "@/components/ui/Button";
import { getGigaSocialFeatures } from "@/lib/gigasocial/featureFlags";
import { BADGE_LABELS } from "@/lib/gigasocial/sections";
import { SOCIAL_AVATAR_ACCEPT } from "@/lib/gigasocial/constants";
import { uploadSocialAvatar } from "@/lib/gigasocial/mediaUpload";
import type { SocialPost } from "@/lib/gigasocial/types";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { Award, Camera, Check, Loader2, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { SocialPostTypeId } from "@/lib/gigasocial/sections";

export const GigaSocialProfilePanel = memo(function GigaSocialProfilePanel({
  sessionToken,
}: {
  sessionToken: string;
}) {
  const data = useQuery(api.gigaSocial.getMyProfile, { sessionToken });
  const ensureMyProfile = useMutation(api.gigaSocial.ensureMyProfile);
  const features = useMemo(() => getGigaSocialFeatures(), []);
  const upsert = useMutation(api.gigaSocial.upsertMyProfile);
  const updatePost = useMutation(api.gigaSocial.updatePost);
  const toggleLike = useMutation(api.gigaSocial.toggleLike);
  const toggleBookmark = useMutation(api.gigaSocial.toggleBookmark);
  const recordShare = useMutation(api.gigaSocial.recordShare);
  const deletePost = useMutation(api.gigaSocial.deletePost);
  const prepareAvatarUpload = useAction(api.gigaSocialStorage.prepareAvatarUpload);
  const resolveStorageUrl = useMutation(api.gigaSocialStorage.resolveStorageUrl);

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const uploadDeps = useMemo(
    () => ({
      prepareAvatarUpload,
      resolveStorageUrl,
      sessionToken,
    }),
    [prepareAvatarUpload, resolveStorageUrl, sessionToken]
  );

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
    setAvatarUrl(profile.avatarUrl);
    setAvatarPreview(null);
    setPendingAvatarFile(null);
    setRemoveAvatar(false);
  }, [profile, editing]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  if (data === undefined) {
    return <ProfileSkeleton />;
  }

  if (data === null) {
    return (
      <div className="saas-card rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-muted">
          We couldn&apos;t load your profile right now. You can still browse the feed — tap below to
          finish setup.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => void ensureMyProfile({ sessionToken })}
        >
          Set up profile
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="saas-card rounded-2xl border border-border p-6 text-center">
        <p className="text-sm text-muted">
          We couldn&apos;t load your profile right now. You can still browse the feed — tap below to
          finish setup.
        </p>
        <Button
          type="button"
          className="mt-4"
          onClick={() => void ensureMyProfile({ sessionToken })}
        >
          Set up profile
        </Button>
      </div>
    );
  }

  function startEdit() {
    setDisplayName(profile!.displayName);
    setHandle(profile!.handle);
    setBio(profile!.bio);
    setSkills(profile!.skills.join(", "));
    setInterests(profile!.interests.join(", "));
    setAvatarUrl(profile!.avatarUrl);
    setAvatarPreview(null);
    setPendingAvatarFile(null);
    setRemoveAvatar(false);
    setError(null);
    setSuccess(null);
    setEditing(true);
  }

  function onAvatarSelected(file: File | null) {
    if (!file) return;
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
    setPendingAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
    if (avatarInputRef.current) avatarInputRef.current.value = "";
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
    setUploadPercent(null);

    try {
      let nextAvatarUrl: string | undefined = avatarUrl;

      if (removeAvatar) {
        nextAvatarUrl = "";
      } else if (pendingAvatarFile) {
        nextAvatarUrl = await uploadSocialAvatar(uploadDeps, pendingAvatarFile, {
          onProgress: (progress) => setUploadPercent(progress.percent),
        });
      }

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
        avatarUrl: nextAvatarUrl,
      });
      setEditing(false);
      setAvatarPreview(null);
      setPendingAvatarFile(null);
      setRemoveAvatar(false);
      setSuccess("Profile updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    } finally {
      setBusy(false);
      setUploadPercent(null);
    }
  }

  const shownAvatarUrl = removeAvatar
    ? undefined
    : avatarPreview ?? avatarUrl ?? profile.avatarUrl;

  return (
    <div className="gigasocial-profile-stable gigasocial-pro space-y-6">
      <div className="saas-card rounded-2xl border border-border p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <SocialAvatar
                name={displayName || profile.displayName}
                avatarUrl={shownAvatarUrl}
                size="lg"
                square
              />
              {editing ? (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-white text-foreground shadow-sm"
                  aria-label="Change profile photo"
                  disabled={busy}
                >
                  <Camera className="h-4 w-4" aria-hidden />
                </button>
              ) : null}
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
                setAvatarPreview(null);
                setPendingAvatarFile(null);
                setRemoveAvatar(false);
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
              ref={avatarInputRef}
              type="file"
              accept={SOCIAL_AVATAR_ACCEPT}
              className="sr-only"
              onChange={(e) => onAvatarSelected(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => avatarInputRef.current?.click()}
              >
                {shownAvatarUrl ? "Change photo" : "Upload photo"}
              </Button>
              {(shownAvatarUrl || profile.avatarUrl) && !removeAvatar ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setRemoveAvatar(true);
                    setAvatarPreview(null);
                    setPendingAvatarFile(null);
                  }}
                >
                  <X className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Remove photo
                </Button>
              ) : null}
              {uploadPercent != null ? (
                <span className="text-xs text-muted">Uploading {uploadPercent}%</span>
              ) : null}
            </div>
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
                <dt className="text-muted">{FAN_LABELS.fans}</dt>
                <dd className="font-medium">{profile.fanCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-muted">{FAN_LABELS.supporting}</dt>
                <dd className="font-medium">{profile.supportingCount ?? 0}</dd>
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

      <GigaSocialGrowthHub sessionToken={sessionToken} xp={gamification?.xp ?? 0} />

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

      {features.enableCreatorStudio ? (
        <GigaSocialCreatorStudio profile={profile} posts={posts} />
      ) : null}

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
                  enableEdit
                  onEdit={async (postId, args: { body: string; postType: SocialPostTypeId }) => {
                    await updatePost({
                      sessionToken,
                      postId: postId as Id<"socialPosts">,
                      body: args.body,
                      postType: args.postType,
                    });
                  }}
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
