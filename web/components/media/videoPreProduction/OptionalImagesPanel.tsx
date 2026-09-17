"use client";

import { Button } from "@/components/ui/Button";
import {
  MAX_OPTIONAL_REFERENCE_IMAGES,
  isHttpsImageUrl,
} from "@/lib/media/videoPreProduction/optionalImages";
import { cn } from "@/lib/utils";
import { ImageIcon, Loader2, Upload } from "lucide-react";

type OptionalImagesPanelProps = {
  imageUrls: string[];
  recentImageUrls: string[];
  uploading?: boolean;
  onAddFromGallery: (url: string) => void;
  onUploadFile: (file: File) => void;
  onRemove: (index: number) => void;
  onReplace: (index: number, file: File) => void;
  onContinueWithoutImages: () => void;
};

export function OptionalImagesPanel({
  imageUrls,
  recentImageUrls,
  uploading = false,
  onAddFromGallery,
  onUploadFile,
  onRemove,
  onReplace,
  onContinueWithoutImages,
}: OptionalImagesPanelProps) {
  const atLimit = imageUrls.length >= MAX_OPTIONAL_REFERENCE_IMAGES;
  const galleryUrls = recentImageUrls.filter(
    (url) => isHttpsImageUrl(url) && !imageUrls.includes(url)
  );

  return (
    <div className="space-y-4" data-testid="preprod-optional-images">
      <p className="text-sm text-muted">
        Add images (optional) — use your gallery, upload new files, or continue without images.
        AI visuals are generated from your script when no image is supplied.
      </p>

      <div className="flex flex-wrap gap-2">
        {galleryUrls.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Add from gallery
            </p>
            <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
              {galleryUrls.slice(0, 8).map((url) => (
                <button
                  key={url}
                  type="button"
                  disabled={uploading || atLimit}
                  onClick={() => onAddFromGallery(url)}
                  className={cn(
                    "h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border hover:border-violet-500/50",
                    uploading && "opacity-60"
                  )}
                  aria-label="Add image from gallery"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        <label
          className={cn(
            "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent/5",
            (uploading || atLimit) && "pointer-events-none opacity-60"
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-4 w-4" aria-hidden />
          )}
          Upload
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={uploading || atLimit}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUploadFile(file);
            }}
          />
        </label>

        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={uploading}
          onClick={onContinueWithoutImages}
        >
          Continue without images
        </Button>
      </div>

      {imageUrls.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Selected ({imageUrls.length}/{MAX_OPTIONAL_REFERENCE_IMAGES})
          </p>
          <div className="flex flex-wrap gap-3">
            {imageUrls.map((url, i) => (
              <div key={`${url}-${i}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-border"
                />
                {!isHttpsImageUrl(url) && (
                  <span className="absolute inset-x-0 bottom-0 rounded-b-lg bg-amber-600/90 px-1 py-0.5 text-center text-[10px] text-white">
                    Uploading…
                  </span>
                )}
                <div className="absolute -right-1 -top-1 flex gap-0.5">
                  <label
                    className="cursor-pointer rounded-full bg-violet-600 p-1 text-white"
                    aria-label="Replace image"
                  >
                    <ImageIcon className="h-3 w-3" aria-hidden />
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) onReplace(i, file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Remove image"
                    className="rounded-full bg-red-600 p-1 text-white"
                    onClick={() => onRemove(i)}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
