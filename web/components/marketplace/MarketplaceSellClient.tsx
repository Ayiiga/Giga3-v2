"use client";

import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  SIMPLE_CATEGORIES,
  SIMPLE_LICENSE_TYPES,
  SIMPLE_PRODUCT_TYPES,
  formatGhs,
} from "@/lib/marketplace/catalog";
import { getSessionToken } from "@/lib/auth";
import { formatCurrentDateTime, formatTimestampDateTime } from "@/lib/datetime";
import {
  captureCoordinates,
  formatCoordinates,
  type CapturedCoordinates,
} from "@/lib/geolocation";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

function RevenueStatsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="min-h-[5.5rem] rounded-2xl border bg-card p-5">
          <div className="h-4 w-24 rounded bg-border" />
          <div className="mt-3 h-8 w-20 rounded bg-border" />
        </div>
      ))}
    </div>
  );
}

function MarketplaceSellInner() {
  const router = useRouter();
  const [sessionToken] = useState<string | null>(() => getSessionToken());
  const profileHydrated = useRef(false);

  useEffect(() => {
    if (!sessionToken) {
      router.replace("/chat/login?next=/marketplace/sell");
    }
  }, [sessionToken, router]);

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
  const uploadStatus = useQuery(api.marketplace.getUploadStatus, {});

  const upsertProfile = useMutation(api.creatorProfiles.upsertProfile);
  const submitCreatorVerification = useMutation(api.creatorProfiles.submitCreatorVerification);
  const generateVerificationUploadUrl = useMutation(api.creatorProfiles.generateVerificationUploadUrl);
  const createListing = useMutation(api.marketplace.createListing);
  const updateListing = useMutation(api.marketplace.updateListing);
  const prepareListingUpload = useMutation(api.marketplaceUploadIntents.prepareListingUpload);
  const completeListingUpload = useMutation(api.marketplaceUploadIntents.completeListingUpload);
  const requestPayout = useMutation(api.marketplace.requestPayout);

  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(SIMPLE_CATEGORIES[0]);
  const [productType, setProductType] = useState<string>(SIMPLE_PRODUCT_TYPES[0].id);
  const [priceGhs, setPriceGhs] = useState(20);
  const [license, setLicense] = useState("personal");
  const [tags, setTags] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [copyrightNotice, setCopyrightNotice] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [nationalIdNumber, setNationalIdNumber] = useState("");
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<CapturedCoordinates | null>(null);
  const [capturingLocation, setCapturingLocation] = useState(false);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verificationStatus =
    profile?.verificationStatus ?? "none";

  useEffect(() => {
    if (!profile || profileHydrated.current) return;
    setDisplayName(profile.displayName);
    setHandle(profile.handle);
    setBio(profile.bio ?? "");
    if (profile.latitude != null && profile.longitude != null) {
      setCoordinates({
        latitude: profile.latitude,
        longitude: profile.longitude,
        accuracyMeters: profile.locationAccuracyMeters ?? undefined,
        capturedAt: profile.locationCapturedAt ?? Date.now(),
      });
    }
    profileHydrated.current = true;
  }, [profile]);

  if (!sessionToken) return <p className="text-center text-muted">Redirecting…</p>;

  async function saveProfile() {
    setError(null);
    await upsertProfile({
      sessionToken,
      displayName,
      handle,
      bio,
    });
    setMessage("Profile saved.");
  }

  async function uploadVerificationDocument(file: File): Promise<Id<"_storage">> {
    const uploadUrl = await generateVerificationUploadUrl({ sessionToken });
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    const { storageId } = await res.json();
    return storageId as Id<"_storage">;
  }

  async function uploadViaIntent(
    listingId: Id<"marketplaceListings">,
    file: File,
    purpose: "product_file" | "cover_image"
  ) {
    const prep = await prepareListingUpload({
      sessionToken,
      listingId,
      purpose,
      fileName: file.name,
      contentType:
        file.type ||
        (purpose === "product_file" ? "application/pdf" : "image/jpeg"),
      fileSizeBytes: file.size,
    });
    const res = await fetch(prep.uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) throw new Error("Upload failed");
    const { storageId } = await res.json();
    return completeListingUpload({
      sessionToken,
      intentId: prep.intentId,
      storageId: storageId as Id<"_storage">,
    });
  }

  async function saveListing(asDraft: boolean) {
    setError(null);
    setPublishing(true);
    try {
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
      });

      if (coverImageFile) {
        await uploadViaIntent(listingId, coverImageFile, "cover_image");
      }
      if (productFile) {
        const uploadResult = await uploadViaIntent(listingId, productFile, "product_file");
        setMessage(uploadResult.message);
      }

      if (!asDraft) {
        await updateListing({ sessionToken, listingId, status: "published" });
        setMessage("Published — buyers can pay once your PDF is admin-approved.");
      } else if (!productFile) {
        setMessage("Draft saved. Upload a PDF under Your listings when ready.");
      }

      setTitle("");
      setDescription("");
      setCoverImageFile(null);
      setProductFile(null);
      setCoverImageUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save listing.");
    } finally {
      setPublishing(false);
    }
  }

  async function uploadFile(listingId: Id<"marketplaceListings">, file: File) {
    const result = await uploadViaIntent(listingId, file, "product_file");
    setMessage(result.message);
  }

  async function publishExistingListing(listingId: Id<"marketplaceListings">) {
    setError(null);
    try {
      await updateListing({ sessionToken, listingId, status: "published" });
      setMessage("Listing published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish listing.");
    }
  }
  async function uploadIdDocument(file: File): Promise<Id<"_storage">> {
    return uploadVerificationDocument(file);
  }

  async function handleCaptureLocation() {
    setError(null);
    setCapturingLocation(true);
    try {
      const coords = await captureCoordinates();
      setCoordinates(coords);
      setMessage("Location captured.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture location.");
    } finally {
      setCapturingLocation(false);
    }
  }

  async function handleSubmitVerification() {
    setError(null);
    if (!nationalIdNumber.trim()) {
      setError("Enter your national ID number.");
      return;
    }
    if (!idDocumentFile) {
      setError("Upload a photo of your national ID.");
      return;
    }
    if (!coordinates) {
      setError("Capture your GPS location to complete registration.");
      return;
    }

    setSubmittingVerification(true);
    try {
      const storageId = await uploadIdDocument(idDocumentFile);
      const result = await submitCreatorVerification({
        sessionToken,
        nationalIdNumber,
        idDocumentStorageId: storageId,
        idDocumentFileName: idDocumentFile.name,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        locationAccuracyMeters: coordinates.accuracyMeters,
      });
      setMessage(result.message ?? "Verification submitted.");
      setIdDocumentFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification submission failed.");
    } finally {
      setSubmittingVerification(false);
    }
  }

  function handleIdDocumentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setIdDocumentFile(file);
  }

  return (
    <Container className="discover-stable py-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-[#042f2e] px-6 py-7 text-emerald-50 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-emerald-200">Creator studio</p>
              <h1 className="mt-2 font-serif text-3xl tracking-tight text-white sm:text-4xl">
                Sell digital products
              </h1>
              <p className="mt-2 text-sm text-emerald-100/90">
                Verify once, upload a PDF, set a price in GHS — buyers pay through Paystack and
                download from their library.
              </p>
              <p className="mt-2 text-xs text-emerald-200/70">{formatCurrentDateTime()}</p>
            </div>
            <ButtonLink
              href="/marketplace"
              variant="secondary"
              className="border-white/20 bg-white text-emerald-950 hover:bg-emerald-50"
            >
              Browse marketplace
            </ButtonLink>
          </div>
        </div>

        {message && (
          <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800">{message}</p>
        )}
        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {revenue?.profile ? (
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
        ) : sessionToken ? (
          <RevenueStatsSkeleton />
        ) : null}

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
          <h2 className="text-lg font-semibold">Identity verification</h2>
          <p className="mt-2 text-sm text-muted">
            Marketplace registration requires a national ID and your current GPS coordinates.
          </p>
          <p className="mt-2 text-sm font-medium capitalize text-foreground">
            Status: {verificationStatus.replace(/_/g, " ")}
            {profile?.verificationSubmittedAt
              ? ` · submitted ${formatTimestampDateTime(profile.verificationSubmittedAt)}`
              : ""}
          </p>
          {profile?.nationalIdMasked && (
            <p className="mt-1 text-sm text-muted">ID on file: {profile.nationalIdMasked}</p>
          )}

          {(verificationStatus === "none" || verificationStatus === "rejected") && (
            <div className="mt-4 grid gap-4">
              <input
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value)}
                placeholder="National ID number"
                className="rounded-xl border px-4 py-3"
                autoComplete="off"
              />
              <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed px-4 py-4 text-sm">
                <span className="font-medium">National ID document (photo or scan)</span>
                <span className="text-muted">
                  {idDocumentFile?.name ?? "Tap to choose a JPG, PNG, or PDF"}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleIdDocumentChange}
                />
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCaptureLocation}
                  disabled={capturingLocation}
                >
                  {capturingLocation ? "Capturing location…" : "Capture GPS location"}
                </Button>
                {coordinates && (
                  <p className="text-sm text-muted">
                    {formatCoordinates(
                      coordinates.latitude,
                      coordinates.longitude,
                      coordinates.accuracyMeters
                    )}
                  </p>
                )}
              </div>
              <Button
                type="button"
                onClick={handleSubmitVerification}
                disabled={submittingVerification}
              >
                {submittingVerification ? "Submitting…" : "Submit verification"}
              </Button>
            </div>
          )}

          {verificationStatus === "pending" && (
            <p className="mt-4 text-sm text-muted">
              Verification is under review. You can save drafts now; publishing unlocks after
              approval.
            </p>
          )}

          {verificationStatus === "approved" && (
            <p className="mt-4 text-sm text-emerald-700">
              Verified creator — you can publish listings on the marketplace.
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-serif text-xl font-semibold">New product</h2>
          <p className="mt-2 text-sm text-muted">
            PDFs and digital guides work best. Official Creator Academy guides are GHS 150 each.
          </p>
          {verificationStatus === "none" || verificationStatus === "rejected" ? (
            <p className="mt-2 text-sm text-amber-700">
              Complete identity verification above before creating listings.
            </p>
          ) : null}
          {verificationStatus === "pending" ? (
            <p className="mt-2 text-sm text-amber-700">
              Save drafts while pending. Publishing requires admin approval.
            </p>
          ) : null}
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
                {SIMPLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={productType} onChange={(e) => setProductType(e.target.value)} className="rounded-xl border px-4 py-3">
                {SIMPLE_PRODUCT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <select value={license} onChange={(e) => setLicense(e.target.value)} className="rounded-xl border px-4 py-3">
                {SIMPLE_LICENSE_TYPES.map((l) => (
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
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed px-4 py-4 text-sm">
              <span className="font-medium">Cover image upload (optional)</span>
              <span className="text-muted">
                {coverImageFile?.name ?? "JPG or PNG for your listing card"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={verificationStatus !== "approved"}
                onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed px-4 py-4 text-sm">
              <span className="font-medium">Product PDF</span>
              <span className="text-muted">
                {productFile?.name ?? "PDF only, max 25 MB — admin reviews before sales go live"}
              </span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                disabled={verificationStatus !== "approved"}
                onChange={(e) => setProductFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="text-sm text-muted">
              {uploadStatus?.requiresAdminReview
                ? "PDFs are reviewed by Giga3 before buyers can purchase. Paystack checkout stays fraud-safe."
                : "Upload a PDF after verification is approved."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => saveListing(true)}
                disabled={
                  publishing ||
                  (verificationStatus !== "pending" && verificationStatus !== "approved")
                }
              >
                {publishing ? "Saving…" : "Save draft"}
              </Button>
              <Button
                type="button"
                onClick={() => saveListing(false)}
                disabled={publishing || verificationStatus !== "approved" || !productFile}
              >
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
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
                        {listing.updatedAt
                          ? ` · updated ${formatTimestampDateTime(listing.updatedAt)}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs">
                        {!listing.hasFile ? (
                          <span className="text-amber-600">⚠ Upload a PDF to sell</span>
                        ) : listing.fileReviewLabel === "pending" ? (
                          <span className="text-amber-600">⏳ PDF awaiting admin review</span>
                        ) : listing.fileReviewLabel === "rejected" ? (
                          <span className="text-red-600">✗ PDF rejected — upload again</span>
                        ) : listing.purchaseReady ? (
                          <span className="text-emerald-600">✓ Live — ready to sell</span>
                        ) : (
                          <span className="text-emerald-600">✓ PDF approved — publish when ready</span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {listing.status === "draft" &&
                        listing.fileReviewLabel === "approved" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => publishExistingListing(listing._id)}
                          >
                            Publish
                          </Button>
                        )}
                      <label className="cursor-pointer rounded-xl border px-4 py-2 text-sm">
                        Upload PDF
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          disabled={verificationStatus !== "approved"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadFile(listing._id, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </Container>
  );
}

export function MarketplaceSellClient() {
  return (
    <ConvexAppShell>
      <MarketplaceSellInner />
    </ConvexAppShell>
  );
}
