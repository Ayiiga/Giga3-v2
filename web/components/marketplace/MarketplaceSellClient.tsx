"use client";

import { ProductPromotionPanel } from "@/components/marketplace/ProductPromotionPanel";
import { ConvexAppShell } from "@/components/providers/ConvexAppShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  SIMPLE_CATEGORIES,
  SIMPLE_LICENSE_TYPES,
  SIMPLE_PRODUCT_TYPES,
  formatGhs,
} from "@/lib/marketplace/catalog";
import { analyticsRangePreset } from "@/lib/marketplace/salesAnalytics";
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
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

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
  const searchParams = useSearchParams();
  const promoteListingId = searchParams.get("promote")?.trim() || null;
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
  const physicalInquiries = useQuery(
    api.marketplacePhysicalInquiries.getSellerInquiries,
    sessionToken ? { sessionToken } : "skip"
  );
  const revenue = useQuery(
    api.marketplace.getCreatorRevenue,
    sessionToken ? { sessionToken } : "skip"
  );
  const [analyticsPreset, setAnalyticsPreset] = useState<"7d" | "30d" | "90d" | "all">("30d");
  // Memoize so Date.now()-based presets are not new useQuery args every render
  // (that loop surfaces as React minified error #301 on /marketplace/sell).
  const analyticsRange = useMemo(
    () => analyticsRangePreset(analyticsPreset),
    [analyticsPreset]
  );
  const analytics = useQuery(
    api.marketplace.getCreatorSalesAnalytics,
    sessionToken
      ? {
          sessionToken,
          fromMs: analyticsRange.fromMs,
          toMs: analyticsRange.toMs,
        }
      : "skip"
  );
  const uploadStatus = useQuery(api.marketplace.getUploadStatus, {});
  const [editingId, setEditingId] = useState<Id<"marketplaceListings"> | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriceGhs, setEditPriceGhs] = useState(20);
  const [editPreviewText, setEditPreviewText] = useState("");
  const [editCategory, setEditCategory] = useState<string>(SIMPLE_CATEGORIES[0]);
  const [showCreatePreview, setShowCreatePreview] = useState(false);

  const upsertProfile = useMutation(api.creatorProfiles.upsertProfile);
  const submitCreatorVerification = useMutation(api.creatorProfiles.submitCreatorVerification);
  const generateVerificationUploadUrl = useMutation(api.creatorProfiles.generateVerificationUploadUrl);
  const createListing = useMutation(api.marketplace.createListing);
  const replyPhysicalInquiry = useMutation(api.marketplacePhysicalInquiries.replyToInquiry);
  const [inquiryReplies, setInquiryReplies] = useState<Record<string, string>>({});
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
  const physicalItem = productType === "physical_item";
  const [condition, setCondition] = useState<"new" | "like_new" | "good" | "fair">("new");
  const [sizeOrVariant, setSizeOrVariant] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [sellerRegion, setSellerRegion] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [shippingMethods, setShippingMethods] = useState<Array<"pickup" | "seller_delivery" | "courier">>(["pickup"]);
  const [shippingFee, setShippingFee] = useState("");
  const [shippingDays, setShippingDays] = useState("");
  const [returnWindowDays, setReturnWindowDays] = useState("");
  const [returnTerms, setReturnTerms] = useState("");
  const [editShippingMethods, setEditShippingMethods] = useState<Array<"pickup" | "seller_delivery" | "courier">>(["pickup"]);
  const [editShippingFee, setEditShippingFee] = useState("");
  const [editShippingDays, setEditShippingDays] = useState("");
  const [editReturnDays, setEditReturnDays] = useState("");
  const [editReturnTerms, setEditReturnTerms] = useState("");
  const [quotedFees, setQuotedFees] = useState<Record<string, string>>({});
  const [quotedDays, setQuotedDays] = useState<Record<string, string>>({});
  const [quotedCarrier, setQuotedCarrier] = useState<Record<string, string>>({});
  const [priceGhs, setPriceGhs] = useState(20);
  const [license, setLicense] = useState("personal");
  const [tags, setTags] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [previewToc, setPreviewToc] = useState("");
  const [previewIntro, setPreviewIntro] = useState("");
  const [copyrightNotice, setCopyrightNotice] = useState("");
  const [editPreviewToc, setEditPreviewToc] = useState("");
  const [editPreviewIntro, setEditPreviewIntro] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [legalFullName, setLegalFullName] = useState("");
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
      if (physicalItem && !asDraft && !coverImageFile && !coverImageUrl.trim()) {
        throw new Error("Upload a clear product photo before publishing.");
      }
      const listingId = await createListing({
        sessionToken,
        title,
        description,
        category,
        productType: productType as any,
        ...(physicalItem ? {
          condition, sizeOrVariant, stockQuantity, sellerRegion, deliveryNote,
          shippingMethods,
          shippingFeeGhs: shippingFee.trim() === "" ? undefined : Number(shippingFee),
          shippingDays: shippingDays.trim() === "" ? undefined : Number(shippingDays),
          returnWindowDays: returnWindowDays.trim() === "" ? undefined : Number(returnWindowDays),
          returnTerms: returnTerms.trim() || undefined,
        } : {}),
        priceGhs,
        license: license as any,
        copyrightNotice: copyrightNotice || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        previewText: previewText || undefined,
        previewToc: previewToc || undefined,
        previewIntro: previewIntro || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
      });

      if (coverImageFile) {
        await uploadViaIntent(listingId, coverImageFile, "cover_image");
      }
      if (productFile && !physicalItem) {
        const uploadResult = await uploadViaIntent(listingId, productFile, "product_file");
        setMessage(uploadResult.message);
      }

      const ebookLike =
        productType.toLowerCase().includes("ebook") ||
        productType.toLowerCase() === "book";
      if (!asDraft && ebookLike && !coverImageFile && !coverImageUrl.trim()) {
        throw new Error(
          "Add a cover image (upload or URL) before publishing an ebook."
        );
      }

      if (!asDraft) {
        await updateListing({ sessionToken, listingId, status: "published" });
        setMessage(physicalItem
          ? "Item listed for enquiries. No payment or delivery order is created."
          : "Published — buyers can purchase and download your PDF.");
      } else if (!productFile) {
        setMessage(physicalItem
          ? "Draft saved. Add a product photo and publish when ready."
          : "Draft saved. Upload a PDF under Your listings when ready.");
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

  async function uploadCover(listingId: Id<"marketplaceListings">, file: File) {
    setError(null);
    try {
      const result = await uploadViaIntent(listingId, file, "cover_image");
      setMessage(result.message || "Cover image updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload cover.");
    }
  }

  function beginEdit(listing: NonNullable<typeof listings>[number]) {
    setEditingId(listing._id);
    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditPriceGhs(listing.priceGhs);
    setEditPreviewText(listing.previewText ?? "");
    setEditPreviewToc(listing.previewToc ?? "");
    setEditPreviewIntro(listing.previewIntro ?? "");
    setEditCategory(listing.category);
    setEditShippingMethods(listing.shippingMethods ?? ["pickup"]);
    setEditShippingFee(listing.shippingFeeGhs == null ? "" : String(listing.shippingFeeGhs));
    setEditShippingDays(listing.shippingDays == null ? "" : String(listing.shippingDays));
    setEditReturnDays(listing.returnWindowDays == null ? "" : String(listing.returnWindowDays));
    setEditReturnTerms(listing.returnTerms ?? "");
    setMessage(null);
    setError(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    try {
      await updateListing({
        sessionToken,
        listingId: editingId,
        title: editTitle,
        description: editDescription,
        priceGhs: editPriceGhs,
        previewText: editPreviewText || undefined,
        previewToc: editPreviewToc || undefined,
        previewIntro: editPreviewIntro || undefined,
        category: editCategory,
        ...(listings?.find(row => row._id === editingId)?.productType === "physical_item"
          ? {
            shippingMethods: editShippingMethods,
            shippingFeeGhs: editShippingFee.trim() === "" ? undefined : Number(editShippingFee),
            shippingDays: editShippingDays.trim() === "" ? undefined : Number(editShippingDays),
            returnWindowDays: editReturnDays.trim() === "" ? undefined : Number(editReturnDays),
            returnTerms: editReturnTerms,
          } : {}),
      });
      setMessage("Listing updated.");
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update listing.");
    }
  }

  async function unpublishListing(listingId: Id<"marketplaceListings">) {
    setError(null);
    try {
      await updateListing({ sessionToken, listingId, status: "draft" });
      setMessage("Listing unpublished (saved as draft).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unpublish.");
    }
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
    if (legalFullName.trim().length < 3) {
      setError("Enter your full legal name.");
      return;
    }
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
        legalFullName,
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
    <Container className="discover-stable document-compact py-6 pb-[calc(var(--primary-nav-offset,0px)+1.25rem)] sm:py-10">
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-[#042f2e] px-6 py-7 text-emerald-50 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-emerald-200">Creator studio</p>
              <h1 className="mt-2 font-serif text-3xl tracking-tight text-white sm:text-4xl">
                Sell digital and physical products
              </h1>
              <p className="mt-2 text-sm text-emerald-100/90">
                List ebooks and digital guides with verified Paystack downloads, or post clothes, shoes and other goods for in-app enquiries. Physical payments are not available yet.
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

        {analytics?.summary ? (
          <section className="space-y-3" aria-labelledby="sales-analytics-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="sales-analytics-heading" className="text-lg font-semibold">
                Sales analytics
              </h2>
              <label className="text-sm">
                <span className="sr-only">Date range</span>
                <select
                  value={analyticsPreset}
                  onChange={(e) => setAnalyticsPreset(e.target.value as typeof analyticsPreset)}
                  className="rounded-xl border border-border bg-card px-3 py-2"
                  aria-label="Sales date range"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="all">All time</option>
                </select>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-sm text-muted">Gross sales</div>
                <div className="text-xl font-bold tabular-nums">
                  {formatGhs(analytics.summary.grossSalesGhs)}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-sm text-muted">Purchases</div>
                <div className="text-xl font-bold tabular-nums">
                  {analytics.summary.purchaseCount}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-sm text-muted">Platform fees</div>
                <div className="text-xl font-bold tabular-nums">
                  {formatGhs(analytics.summary.platformFeesGhs)}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-sm text-muted">Your earnings</div>
                <div className="text-xl font-bold tabular-nums">
                  {formatGhs(analytics.summary.creatorEarningsGhs)}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-sm text-muted">Payout balance (manual)</div>
                <div className="text-xl font-bold tabular-nums">
                  {formatGhs(analytics.summary.payoutBalanceGhs)}
                </div>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-sm text-muted">Lifetime earnings</div>
                <div className="text-xl font-bold tabular-nums">
                  {formatGhs(analytics.summary.lifetimeEarningsGhs)}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted">
              Metrics use successful Paystack fulfilments only (pending/failed charges are excluded).
              Refunds are not modeled in the current data. Payout requests are manual ops records —
              automated bank splits are not claimed.
            </p>
            {analytics.productSummaries.length > 0 ? (
              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold">By product</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {analytics.productSummaries.slice(0, 10).map((row) => (
                    <li
                      key={row.listingId}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="font-medium">{row.title}</span>
                        <span className="text-muted"> · {row.purchaseCount} sales</span>
                      </span>
                      <span className="tabular-nums">
                        {formatGhs(row.grossGhs)} gross · {formatGhs(row.earningsGhs)} earned
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analytics.recentSales.length > 0 ? (
              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold">Recent sales</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {analytics.recentSales.slice(0, 8).map((sale) => (
                    <li
                      key={sale._id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-muted">
                        {formatTimestampDateTime(sale.createdAt)} · {sale.listingTitle}
                      </span>
                      <span className="tabular-nums">
                        {formatGhs(sale.amountGhs)} · earned {formatGhs(sale.creatorEarningsGhs)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {analytics.payouts.length > 0 ? (
              <div className="rounded-2xl border bg-card p-4 sm:p-5">
                <h3 className="text-sm font-semibold">Payout requests (manual)</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {analytics.payouts.slice(0, 8).map((payout) => (
                    <li
                      key={payout._id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="capitalize text-muted">
                        {payout.status} · {formatTimestampDateTime(payout.createdAt)}
                      </span>
                      <span className="font-medium tabular-nums">{formatGhs(payout.amountGhs)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {revenue?.profile && revenue.profile.payoutBalanceGhs >= 50 ? (
              <Button
                variant="secondary"
                onClick={() =>
                  requestPayout({
                    sessionToken,
                    amountGhs: revenue.profile.payoutBalanceGhs,
                  }).then(() => setMessage("Payout requested (pending ops review)."))
                }
              >
                Request payout
              </Button>
            ) : null}
          </section>
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
            {profile?.handle ? (
              <ButtonLink href={`/creator/?handle=${encodeURIComponent(profile.handle)}`} variant="secondary">
                View storefront
              </ButtonLink>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Identity verification</h2>
          <p className="mt-2 text-sm text-muted">
            Selling requires your Ghana national ID, an ID photo, and GPS within Ghana. Location is
            used only for this check and is never shown on public listings.
          </p>
          <p className="mt-2 text-sm font-medium capitalize text-foreground">
            Status:{" "}
            {verificationStatus === "approved"
              ? "Verified"
              : verificationStatus === "rejected"
                ? "Needs resubmission"
                : verificationStatus === "pending"
                  ? "Under review"
                  : "Not started"}
            {profile?.verificationSubmittedAt
              ? ` · last attempt ${formatTimestampDateTime(profile.verificationSubmittedAt)}`
              : ""}
          </p>
          {profile?.nationalIdMasked && (
            <p className="mt-1 text-sm text-muted">ID on file: {profile.nationalIdMasked}</p>
          )}

          {verificationStatus === "rejected" && (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              {profile?.verificationRejectionReason ||
                "Verification was rejected. Update your ID document and Ghana GPS location, then resubmit."}
            </p>
          )}

          {verificationStatus === "pending" && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Your identity submission is awaiting manual review. Your signed-in account email is captured from your authenticated session; document format and GPS checks do not prove identity. Listings remain restricted until an authorized reviewer approves your application. For help, email{" "}
              <a className="font-semibold underline" href="mailto:support@giga3ai.com">
                support@giga3ai.com
              </a>.
            </p>
          )}

          {(verificationStatus === "none" ||
            verificationStatus === "rejected" ||
            verificationStatus === "pending") && (
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm font-medium">
                Full legal name
                <input value={legalFullName} onChange={(e) => setLegalFullName(e.target.value)} placeholder="Name as shown on your ID" className="min-h-11 rounded-xl border px-4 py-3" autoComplete="name" maxLength={120} />
              </label>
              <p className="text-sm text-muted">Signed-in account email: {profile?.userId ?? "Loading account email…"} (captured from your authenticated session)</p>
              <input
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value)}
                placeholder="National ID number"
                className="min-h-11 rounded-xl border px-4 py-3"
                autoComplete="off"
              />
              <label className="flex min-h-11 cursor-pointer flex-col gap-2 rounded-xl border border-dashed px-4 py-3 text-sm">
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
                  className="min-h-11"
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
                className="min-h-11"
                onClick={handleSubmitVerification}
                disabled={submittingVerification}
              >
                {submittingVerification ? "Submitting…" : "Submit for identity review"}
              </Button>
            </div>
          )}

          {verificationStatus === "approved" && (
            <p className="mt-4 text-sm text-emerald-800">
              Verified seller — you can publish digital products with approved files or physical goods with a real photo and stock. Only digital downloads use Paystack.
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-serif text-xl font-semibold">New product</h2>
          <p className="mt-2 text-sm text-muted">
            List a downloadable digital product, or show clothing, shoes and other physical goods
            to interested buyers. Physical items use in-app enquiries only — no payment or shipping yet.
          </p>
          {verificationStatus === "none" || verificationStatus === "rejected" ? (
            <p className="mt-2 text-sm text-amber-700">
              Complete identity verification above before creating listings.
            </p>
          ) : null}
          {verificationStatus === "pending" ? (
            <p className="mt-2 text-sm text-amber-700">
              Finish identity verification above before you can publish listings.
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
              <select aria-label="Product category" value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border px-4 py-3">
                {SIMPLE_CATEGORIES.filter((c) => physicalItem
                  ? ["Clothing", "Shoes", "Bags & Accessories", "Home Goods", "Other Goods"].includes(c)
                  : !["Clothing", "Shoes", "Bags & Accessories", "Home Goods", "Other Goods"].includes(c)
                ).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select aria-label="Product type" value={productType} onChange={(e) => {
                const next = e.target.value;
                setProductType(next);
                setCategory(next === "physical_item" ? "Clothing" : "Education");
              }} className="rounded-xl border px-4 py-3">
                {SIMPLE_PRODUCT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              {!physicalItem ? (
                <select aria-label="Digital license" value={license} onChange={(e) => setLicense(e.target.value)} className="rounded-xl border px-4 py-3">
                  {SIMPLE_LICENSE_TYPES.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              ) : null}
              <input
                type="number"
                min={1}
                value={priceGhs}
                onChange={(e) => setPriceGhs(Number(e.target.value))}
                className="rounded-xl border px-4 py-3"
                aria-label="Price GHS"
              />
            </div>
            {physicalItem ? (
              <div className="grid gap-3 rounded-2xl border border-violet-200 bg-violet-50/40 p-3 sm:grid-cols-2 dark:border-violet-900 dark:bg-violet-950/20">
                <label className="space-y-1 text-sm font-medium">
                  <span>Condition</span>
                  <select aria-label="Item condition" value={condition} onChange={(e) => setCondition(e.target.value as typeof condition)} className="w-full rounded-xl border px-3 py-3">
                    <option value="new">New</option>
                    <option value="like_new">Like new</option>
                    <option value="good">Used — good</option>
                    <option value="fair">Used — fair</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Size, colour or variant</span>
                  <input aria-label="Size or variant" value={sizeOrVariant} onChange={(e) => setSizeOrVariant(e.target.value)} placeholder="e.g. UK 8, black" maxLength={100} className="w-full rounded-xl border px-3 py-3" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Available quantity</span>
                  <input aria-label="Stock quantity" type="number" min={1} max={1000} value={stockQuantity} onChange={(e) => setStockQuantity(Number(e.target.value))} className="w-full rounded-xl border px-3 py-3" />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>City or region (not home address)</span>
                  <input aria-label="Item city or region" value={sellerRegion} onChange={(e) => setSellerRegion(e.target.value)} placeholder="e.g. Kumasi, Ghana" maxLength={90} className="w-full rounded-xl border px-3 py-3" />
                </label>
                <label className="space-y-1 text-sm font-medium sm:col-span-2">
                  <span>Delivery area (optional)</span>
                  <textarea aria-label="Delivery information" value={deliveryNote} onChange={(e) => setDeliveryNote(e.target.value)} rows={2} maxLength={300} placeholder="Delivery locations, not a private address" className="w-full rounded-xl border px-3 py-3" />
                </label>
                <div className="space-y-2 sm:col-span-2">
                  <p className="text-sm font-semibold">Delivery methods offered</p>
                  <div className="flex flex-wrap gap-3">
                    {([["pickup", "Collection / pickup"], ["seller_delivery", "Local delivery"], ["courier", "Courier shipping"]] as const).map(([id, label]) => (
                      <label key={id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm">
                        <input type="checkbox" checked={shippingMethods.includes(id)}
                          onChange={e => setShippingMethods(x => e.target.checked ? [...x.filter(m => m !== id), id] : x.filter(m => m !== id))} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <label className="space-y-1 text-sm font-medium">
                  <span>Delivery fee in GHS (optional)</span>
                  <input aria-label="Standard shipping fee GHS" inputMode="numeric" type="number" min="0" max="10000"
                    value={shippingFee} onChange={e => setShippingFee(e.target.value)} placeholder="Blank: quote per buyer"
                    className="w-full rounded-xl border px-3 py-3"/>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Estimated delivery days (optional)</span>
                  <input aria-label="Estimated delivery days" type="number" min="1" max="60" value={shippingDays}
                    onChange={e => setShippingDays(e.target.value)} placeholder="e.g. 3"
                    className="w-full rounded-xl border px-3 py-3"/>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>Seller return window in days (optional)</span>
                  <input aria-label="Seller return window days" type="number" min="0" max="90" value={returnWindowDays}
                    onChange={e => setReturnWindowDays(e.target.value)} placeholder="e.g. 7"
                    className="w-full rounded-xl border px-3 py-3"/>
                </label>
                <label className="space-y-1 text-sm font-medium sm:col-span-2">
                  <span>Return conditions (optional)</span>
                  <textarea aria-label="Seller return conditions" rows={2} maxLength={500} value={returnTerms}
                    onChange={e => setReturnTerms(e.target.value)} placeholder="e.g. Unworn items with tags. Statutory rights still apply."
                    className="w-full rounded-xl border px-3 py-3"/>
                </label>
                <p className="text-xs text-amber-800 dark:text-amber-200 sm:col-span-2">
                  These are seller-provided options and a voluntary return policy. Shipping quotes are not paid orders.
                  Physical checkout and money refunds are not yet enabled.
                </p>
              </div>
            ) : null}
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="rounded-xl border px-4 py-3"
            />
            {!physicalItem ? (
            <div className="space-y-3 rounded-xl border border-border bg-background/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Public preview (optional — never attach the paid PDF here)
              </p>
              <textarea
                value={previewToc}
                onChange={(e) => setPreviewToc(e.target.value)}
                rows={2}
                placeholder="Table of contents (ebooks)"
                className="w-full rounded-xl border px-4 py-3"
              />
              <textarea
                value={previewIntro}
                onChange={(e) => setPreviewIntro(e.target.value)}
                rows={2}
                placeholder="Introduction excerpt"
                className="w-full rounded-xl border px-4 py-3"
              />
              <textarea
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                rows={3}
                placeholder="Sample pages / preview excerpt"
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>
            ) : null}
            {!physicalItem ? (
            <input
              value={copyrightNotice}
              onChange={(e) => setCopyrightNotice(e.target.value)}
              placeholder="Copyright notice"
              className="rounded-xl border px-4 py-3"
            />
            ) : null}
            <input
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder={physicalItem ? "Product photo URL (or upload below)" : "Cover image URL (required for ebooks if not uploading)"}
              className="rounded-xl border px-4 py-3"
            />
            <label className="flex cursor-pointer flex-col gap-2 rounded-xl border border-dashed px-4 py-4 text-sm">
              <span className="font-medium">{physicalItem ? "Product photo upload" : "Cover image upload"}</span>
              <span className="text-muted">
                {coverImageFile?.name ??
                  (physicalItem ? "Clear photo of the actual item (required to publish)" : "JPG or PNG book cover — required before publishing ebooks")}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={verificationStatus !== "approved"}
                onChange={(e) => setCoverImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {!physicalItem ? (
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
            ) : null}
            {!physicalItem ? (
            <p className="text-sm text-muted">
              {uploadStatus?.requiresAdminReview
                ? "PDFs are reviewed by Giga3 before buyers can purchase. Paystack checkout stays fraud-safe."
                : "Upload a PDF after verification is approved."}
            </p>
            ) : null}
            {showCreatePreview && title.trim() ? (
              <div className="rounded-xl border border-dashed border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Preview</p>
                <h3 className="mt-2 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted line-clamp-4">{description || "No description yet."}</p>
                <p className="mt-2 text-sm font-bold tabular-nums">{formatGhs(priceGhs)}</p>
                {previewText ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-muted">{previewText}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreatePreview((v) => !v)}
              >
                {showCreatePreview ? "Hide preview" : "Preview"}
              </Button>
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
                disabled={publishing || verificationStatus !== "approved" || (physicalItem ? !coverImageFile && !coverImageUrl.trim() : !productFile)}
              >
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        </section>

        {physicalInquiries && physicalInquiries.length > 0 ? (
          <section className="rounded-2xl border border-violet-200 bg-card p-4 sm:p-5" aria-label="Physical item enquiries">
            <h2 className="text-lg font-semibold">Buyer enquiries</h2>
            <p className="mt-1 text-xs text-muted">These are enquiries, not paid orders. Do not request payments or private addresses through messages.</p>
            <div className="mt-3 space-y-3">
              {physicalInquiries.map((inquiry) => (
                <article key={inquiry._id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{inquiry.listingTitle}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{inquiry.message}</p>
                  <p className="mt-1 text-xs text-muted">
                    Requested: {inquiry.requestedShippingMethod?.replace(/_/g, " ") ?? "pickup"}
                    {inquiry.destinationCity ? ` · City: ${inquiry.destinationCity}` : ""}
                  </p>
                  {inquiry.response ? <p className="mt-2 whitespace-pre-wrap text-sm text-violet-800 dark:text-violet-200">Your reply: {inquiry.response}</p> : null}
                  <textarea
                    aria-label={`Reply to enquiry for ${inquiry.listingTitle}`}
                    rows={2}
                    maxLength={800}
                    value={inquiryReplies[inquiry._id] ?? ""}
                    onChange={(e) => setInquiryReplies((v) => ({ ...v, [inquiry._id]: e.target.value }))}
                    className="mt-2 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    placeholder="Reply with availability or sizing details"
                  />
                  {inquiry.requestedShippingMethod !== "pickup" ? (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input aria-label="Shipping quote GHS" type="number" min="0" max="10000"
                        placeholder="Shipping fee GHS" value={quotedFees[inquiry._id] ?? ""}
                        onChange={e => setQuotedFees(v => ({...v, [inquiry._id]: e.target.value}))} className="rounded-xl border border-border px-3 py-2 text-sm"/>
                      <input aria-label="Quoted delivery days" type="number" min="1" max="60"
                        placeholder="Delivery days" value={quotedDays[inquiry._id] ?? ""}
                        onChange={e => setQuotedDays(v => ({...v, [inquiry._id]: e.target.value}))} className="rounded-xl border border-border px-3 py-2 text-sm"/>
                      <input aria-label="Delivery carrier name" maxLength={100}
                        placeholder="Courier (optional)" value={quotedCarrier[inquiry._id] ?? ""}
                        onChange={e => setQuotedCarrier(v => ({...v, [inquiry._id]: e.target.value}))} className="rounded-xl border border-border px-3 py-2 text-sm"/>
                    </div>
                  ) : null}
                  <Button type="button" size="sm" variant="secondary" onClick={() => {
                    void replyPhysicalInquiry({
                      sessionToken,
                      inquiryId: inquiry._id,
                      response: inquiryReplies[inquiry._id] ?? "",
                      shippingFeeGhs: quotedFees[inquiry._id] ? Number(quotedFees[inquiry._id]) : undefined,
                      deliveryDays: quotedDays[inquiry._id] ? Number(quotedDays[inquiry._id]) : undefined,
                      carrier: quotedCarrier[inquiry._id] || undefined,
                    }).then(() => {
                      setMessage("Your reply was saved for the buyer.");
                      setInquiryReplies((v) => ({ ...v, [inquiry._id]: "" }));
                    }).catch((e) => setError(e instanceof Error ? e.message : "Could not reply."));
                  }}>
                    Send reply
                  </Button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

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
                        {listing.productType === "physical_item" ? (
                          <span className="text-violet-700 dark:text-violet-300">
                            {listing.status === "published" ? "✓ Open for in-app enquiries (no online payment)" : "Upload a photo and publish to receive enquiries"}
                          </span>
                        ) : !listing.hasFile ? (
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
                      <Button type="button" size="sm" variant="ghost" onClick={() => beginEdit(listing)}>
                        Edit
                      </Button>
                      {listing.status === "published" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => void unpublishListing(listing._id)}
                        >
                          Unpublish
                        </Button>
                      ) : null}
                      {listing.status === "draft" &&
                        (listing.fileReviewLabel === "approved" ||
                         (listing.productType === "physical_item" && Boolean(listing.coverImageUrl) && (listing.stockQuantity ?? 0) > 0)) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => publishExistingListing(listing._id)}
                          >
                            Publish
                          </Button>
                        )}
                      {listing.productType !== "physical_item" ? (
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
                            e.target.value = "";
                          }}
                        />
                      </label>
                      ) : null}
                      <label className="cursor-pointer rounded-xl border px-4 py-2 text-sm">
                        Upload cover
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/*"
                          className="hidden"
                          disabled={verificationStatus !== "approved"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void uploadCover(listing._id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {listing.coverImageUrl ? (
                    <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                      Cover image on file — shown on Market cards and the product page.
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      No cover image yet — upload a JPG/PNG so the Market card shows your cover.
                    </p>
                  )}
                  {editingId === listing._id ? (
                    <div className="mt-4 grid gap-3 border-t border-border pt-4">
                      {listing.productType === "physical_item" ? (
                        <div className="space-y-3 rounded-xl border border-violet-200 p-3">
                          <p className="font-semibold text-sm">Shipping & returns</p>
                          <div className="flex flex-wrap gap-3">
                            {([["pickup","Pickup"],["seller_delivery","Local delivery"],["courier","Courier"]] as const).map(([id, label]) => (
                              <label key={id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={editShippingMethods.includes(id)}
                                  onChange={e => setEditShippingMethods(x => e.target.checked ? [...x.filter(m => m !== id), id] : x.filter(m => m !== id))}/>
                                {label}
                              </label>
                            ))}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <input aria-label="Edit shipping fee GHS" type="number" min="0" max="10000"
                              placeholder="Shipping fee GHS" value={editShippingFee} onChange={e => setEditShippingFee(e.target.value)} className="rounded-xl border px-3 py-2"/>
                            <input aria-label="Edit delivery days" type="number" min="1" max="60"
                              placeholder="Delivery days" value={editShippingDays} onChange={e => setEditShippingDays(e.target.value)} className="rounded-xl border px-3 py-2"/>
                            <input aria-label="Edit return window days" type="number" min="0" max="90"
                              placeholder="Return days" value={editReturnDays} onChange={e => setEditReturnDays(e.target.value)} className="rounded-xl border px-3 py-2"/>
                          </div>
                          <textarea aria-label="Edit return conditions" rows={2} maxLength={500}
                            placeholder="Seller return conditions" value={editReturnTerms} onChange={e => setEditReturnTerms(e.target.value)}
                            className="w-full rounded-xl border px-3 py-2"/>
                        </div>
                      ) : null}
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="rounded-xl border px-4 py-3"
                        aria-label="Edit title"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="rounded-xl border px-4 py-3"
                        aria-label="Edit description"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="rounded-xl border px-4 py-3"
                          aria-label="Edit category"
                        >
                          {SIMPLE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={editPriceGhs}
                          onChange={(e) => setEditPriceGhs(Number(e.target.value))}
                          className="rounded-xl border px-4 py-3"
                          aria-label="Edit price GHS"
                        />
                      </div>
                      <textarea
                        value={editPreviewToc}
                        onChange={(e) => setEditPreviewToc(e.target.value)}
                        rows={2}
                        placeholder="Table of contents preview"
                        className="rounded-xl border px-4 py-3"
                        aria-label="Edit preview TOC"
                      />
                      <textarea
                        value={editPreviewIntro}
                        onChange={(e) => setEditPreviewIntro(e.target.value)}
                        rows={2}
                        placeholder="Introduction preview"
                        className="rounded-xl border px-4 py-3"
                        aria-label="Edit preview intro"
                      />
                      <textarea
                        value={editPreviewText}
                        onChange={(e) => setEditPreviewText(e.target.value)}
                        rows={2}
                        placeholder="Sample pages preview"
                        className="rounded-xl border px-4 py-3"
                        aria-label="Edit preview text"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" onClick={() => void saveEdit()}>
                          Save changes
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : null}
                  {listing.status === "published" ||
                  (promoteListingId && promoteListingId === listing._id) ? (
                    <div
                      id={promoteListingId === listing._id ? "promote-panel" : undefined}
                      className={
                        promoteListingId === listing._id
                          ? "ring-2 ring-violet-500/40 rounded-2xl"
                          : undefined
                      }
                    >
                      <ProductPromotionPanel listing={listing} />
                    </div>
                  ) : null}
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
      <Suspense fallback={<p className="p-8 text-center text-muted">Loading seller dashboard…</p>}>
        <MarketplaceSellInner />
      </Suspense>
    </ConvexAppShell>
  );
}
