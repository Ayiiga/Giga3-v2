"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import {
  LICENSE_TYPES,
  MARKETPLACE_CATEGORIES,
  PRODUCT_TYPES,
  formatGhs,
} from "@/lib/marketplace/catalog";
import { getSessionToken } from "@/lib/auth";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function MarketplaceSellInner() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setSessionToken(getSessionToken());
  }, []);

  const profile = useQuery(
    api.creatorProfiles.getMyProfile,
    sessionToken ? { sessionToken } : "skip"
  );
  const listings = useQuery(
    api.marketplace.getMyListings,
    sessionToken ? { sessionToken } : "skip"
  );
  const revenue = useQuery(
    api.marketplace.getCreatorRevenue,
    sessionToken ? { sessionToken } : "skip"
  );

  const upsertProfile = useMutation(api.creatorProfiles.upsertProfile);
  const createListing = useMutation(api.marketplace.createListing);
  const attachFile = useMutation(api.marketplace.attachListingFile);
  const generateUploadUrl = useMutation(api.marketplace.generateUploadUrl);
  const requestVerification = useMutation(api.creatorProfiles.requestVerification);
  const requestPayout = useMutation(api.marketplace.requestPayout);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(MARKETPLACE_CATEGORIES[0]);
  const [productType, setProductType] = useState<string>(PRODUCT_TYPES[0].id);
  const [priceGhs, setPriceGhs] = useState(20);
  const [license, setLicense] = useState("personal");
  const [tags, setTags] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [copyrightNotice, setCopyrightNotice] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) router.replace("/chat/login?next=/marketplace/sell");
  }, [sessionToken, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setHandle(profile.handle);
      setBio(profile.bio ?? "");
    }
  }, [profile]);

  if (!sessionToken) return <p className="text-center text-muted">Redirecting…</p>;

  async function saveProfile() {
    await upsertProfile({
      sessionToken,
      displayName,
      handle,
      bio,
    });
    setMessage("Profile saved.");
  }

  async function publishListing() {
    const listingId = await createListing({
      sessionToken,
      title,
      description,
      category,
      productType: productType as any,
      priceGhs,
      license: license as any,
      copyrightNotice: copyrightNotice || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      previewText: previewText || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      publish: true,
    });
    setMessage(
      "Published! Now attach the downloadable file below — buyers can't purchase until a file is attached."
    );
    setTitle("");
    setDescription("");
  }

  async function uploadFile(listingId: Id<"marketplaceListings">, file: File) {
    const uploadUrl = await generateUploadUrl({ sessionToken });
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const { storageId } = await res.json();
    await attachFile({
      sessionToken,
      listingId,
      storageId,
      fileName: file.name,
    });
    setMessage(`File attached to listing.`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="page-title">Creator dashboard</h1>
            <p className="mt-2 text-muted">Publish digital products and manage earnings.</p>
          </div>
          <ButtonLink href="/marketplace" variant="ghost">
            Browse marketplace
          </ButtonLink>
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">{message}</p>
        )}

        {revenue?.profile && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5">
              <div className="text-sm text-muted">Payout balance</div>
              <div className="text-2xl font-bold">{formatGhs(revenue.profile.payoutBalanceGhs)}</div>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <div className="text-sm text-muted">Total sales</div>
              <div className="text-2xl font-bold">{revenue.profile.totalSales}</div>
            </div>
            <div className="rounded-2xl border bg-card p-5">
              <div className="text-sm text-muted">Earnings</div>
              <div className="text-2xl font-bold">{formatGhs(revenue.profile.totalEarningsGhs)}</div>
            </div>
          </div>
        )}

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Creator profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="rounded-xl border px-4 py-3"
            />
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Handle"
              className="rounded-xl border px-4 py-3"
            />
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Bio"
            className="mt-4 w-full rounded-xl border px-4 py-3"
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={saveProfile}>Save profile</Button>
            <Button
              variant="secondary"
              onClick={() => requestVerification({ sessionToken }).then((r) => setMessage(r.message ?? "Verification updated"))}
            >
              Request verification
            </Button>
            {revenue?.profile && revenue.profile.payoutBalanceGhs >= 50 && (
              <Button
                variant="secondary"
                onClick={() =>
                  requestPayout({ sessionToken, amountGhs: revenue.profile.payoutBalanceGhs }).then(() =>
                    setMessage("Payout requested.")
                  )
                }
              >
                Request payout
              </Button>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">New listing</h2>
          <div className="mt-4 grid gap-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="rounded-xl border px-4 py-3"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="Description"
              className="w-full rounded-xl border px-4 py-3"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="rounded-xl border px-4 py-3">
                {MARKETPLACE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={productType} onChange={(e) => setProductType(e.target.value)} className="rounded-xl border px-4 py-3">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <select value={license} onChange={(e) => setLicense(e.target.value)} className="rounded-xl border px-4 py-3">
                {LICENSE_TYPES.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={priceGhs}
                onChange={(e) => setPriceGhs(Number(e.target.value))}
                className="rounded-xl border px-4 py-3"
                aria-label="Price GHS"
              />
            </div>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="rounded-xl border px-4 py-3"
            />
            <textarea
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              rows={3}
              placeholder="Preview excerpt"
              className="w-full rounded-xl border px-4 py-3"
            />
            <input
              value={copyrightNotice}
              onChange={(e) => setCopyrightNotice(e.target.value)}
              placeholder="Copyright notice"
              className="rounded-xl border px-4 py-3"
            />
            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="Cover image URL (optional)"
              className="rounded-xl border px-4 py-3"
            />
            <p className="text-sm text-muted">
              After publishing, upload the downloadable file under “Your listings”.
              Buyers cannot purchase a listing until its file is attached.
            </p>
            <Button onClick={publishListing}>Publish listing</Button>
          </div>
        </section>

        {listings && listings.length > 0 && (
          <section>
            <h2 className="mb-4 text-lg font-semibold">Your listings</h2>
            <div className="space-y-4">
              {listings.map((listing: NonNullable<typeof listings>[number]) => (
                <article key={listing._id} className="rounded-2xl border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{listing.title}</h3>
                      <p className="text-sm text-muted">
                        {listing.status} · {formatGhs(listing.priceGhs)} · {listing.purchaseCount} sales
                      </p>
                      <p className="mt-1 text-xs">
                        {listing.hasFile ? (
                          <span className="text-emerald-600">
                            ✓ File attached — ready to sell
                          </span>
                        ) : (
                          <span className="text-amber-600">
                            ⚠ No file yet — not purchasable until you attach one
                          </span>
                        )}
                      </p>
                    </div>
                    <label className="cursor-pointer rounded-xl border px-4 py-2 text-sm">
                      Attach file
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void uploadFile(listing._id, file);
                        }}
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
  );
}

export function MarketplaceSellClient() {
  return (
    <ConvexAppShell>
      <MarketplaceSellInner />
    </ConvexAppShell>
  );
}
