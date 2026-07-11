"use client";

import { X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export const GigaSocialMediaLightbox = memo(function GigaSocialMediaLightbox({
  imageUrl,
  alt,
  onClose,
}: {
  imageUrl: string;
  alt: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="gigasocial-media-lightbox fixed inset-0 z-[70] flex items-center justify-center bg-black/92 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Full size photo"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
        aria-label="Close full size photo"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className="max-h-[92vh] max-w-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>,
    document.body
  );
});
