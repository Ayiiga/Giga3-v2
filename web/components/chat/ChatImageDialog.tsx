"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";
import {
  buildUserDisplayContent,
  prepareChatAttachment,
  type PreparedChatAttachment,
} from "@/lib/chat/multimodalAttachments";

export type ChatImageSend = (message: string, attachments: PreparedChatAttachment[]) => void;

export function ChatImageDialog({
  url,
  label,
  onClose,
  onEdit,
  onSend,
  editDisabled,
  poster,
}: {
  url: string;
  label: string;
  onClose: () => void;
  onEdit?: boolean;
  onSend?: ChatImageSend;
  editDisabled?: boolean;
  poster?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [zoom, setZoom] = useState(1);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState("");
  const [loadingPoster, setLoadingPoster] = useState(Boolean(poster && onEdit));

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  useEffect(() => {
    if (!poster || !onEdit) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Poster unavailable");
        const svg = new DOMParser().parseFromString(await response.text(), "image/svg+xml");
        const brief = svg.querySelector("desc")?.textContent;
        const original = svg.querySelector("image")?.getAttribute("href");
        if (!brief || !original || !/^data:image\/(?:jpeg|png|webp);base64,/i.test(original)) {
          throw new Error("Poster details unavailable");
        }
        setDraft(brief);
        setPhoto(original);
      } catch {
        if (!controller.signal.aborted) setError("Could not open the poster details. Try opening the editor again.");
      } finally {
        if (!controller.signal.aborted) setLoadingPoster(false);
      }
    })();
    return () => controller.abort();
  }, [onEdit, poster, url]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (editDisabled || sending || !onSend || !draft.trim() || (poster && !photo)) return;
    setSending(true);
    setError("");
    try {
      let blob: Blob;
      if (poster) {
        const [header, data] = photo.split(",", 2);
        blob = new Blob([Uint8Array.from(atob(data), character => character.charCodeAt(0))], {
          type: header.slice(5, -7),
        });
      } else {
        const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!response.ok) throw new Error("Image unavailable");
        blob = await response.blob();
      }
      const mime = /^image\/(?:jpeg|png|webp|gif|avif)$/i.test(blob.type)
        ? blob.type : "image/png";
      const file = new File([blob], `image.${mime.split("/")[1]}`, { type: mime });
      const attachment = await prepareChatAttachment(file);
      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      if (poster) {
        attachment.dataUrl = photo;
        attachment.mimeType = blob.type;
        attachment.sizeBytes = blob.size;
      }
      const prompt = poster ? `Create a missing-person poster\n${draft.trim()}` : `Edit this image:\n${draft.trim()}`;
      onSend(buildUserDisplayContent(prompt, [attachment]), [attachment]);
      onClose();
    } catch {
      setError("Could not prepare this image. Try again on a stronger connection or reattach the original in chat.");
      setSending(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      onCancel={event => {
        event.preventDefault();
        if (!sending) onClose();
      }}
      className="m-auto max-h-[90dvh] w-[min(95vw,52rem)] max-w-none overflow-hidden rounded-2xl bg-card p-0 text-foreground backdrop:bg-black/90"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
          <p className="pl-1 text-sm font-semibold">{label}</p>
          <div className="flex items-center gap-1">
            {!onEdit && (
              <>
                <button type="button" aria-label="Zoom out" disabled={zoom === 1} onClick={() => setZoom(zoom - 0.5)} className="grid size-11 place-items-center rounded-lg hover:bg-muted/20 disabled:opacity-40">
                  <Minus size={18} aria-hidden />
                </button>
                <button type="button" aria-label="Reset zoom" onClick={() => setZoom(1)} className="min-h-11 min-w-12 rounded-lg text-sm tabular-nums">
                  {zoom * 100}%
                </button>
                <button type="button" aria-label="Zoom in" disabled={zoom === 4} onClick={() => setZoom(zoom + 0.5)} className="grid size-11 place-items-center rounded-lg hover:bg-muted/20 disabled:opacity-40">
                  <Plus size={18} aria-hidden />
                </button>
              </>
            )}
            <button type="button" aria-label="Close image dialog" disabled={sending} onClick={onClose} className="grid size-11 place-items-center rounded-lg hover:bg-muted/20">
              <X size={20} aria-hidden />
            </button>
          </div>
        </header>
        {onEdit ? (
          <form onSubmit={submit} className="space-y-3 overflow-y-auto p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Image selected for editing" className="mx-auto max-h-40 max-w-full rounded-lg object-contain" />
            <label className="block space-y-1 text-sm font-medium">
              <span>{poster ? "Confirmed poster details" : "What should change?"}</span>
              <textarea
                value={draft}
                onChange={event => setDraft(event.target.value)}
                placeholder={poster ? undefined : "For example, make the background lighter"}
                rows={poster ? 7 : 3}
                maxLength={2000}
                disabled={sending || loadingPoster}
                className="w-full rounded-lg border border-border bg-background p-3 text-base"
              />
            </label>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={editDisabled || sending || loadingPoster || !draft.trim() || (poster && !photo)}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {(sending || loadingPoster) && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {poster ? "Update poster in chat" : "Send edit to chat"}
            </button>
          </form>
        ) : (
          <div className="overflow-auto overscroll-contain bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              className="mx-auto block max-w-none object-contain object-top"
              style={{ width: `${zoom * 100}%`, maxHeight: `${zoom * 72}dvh` }}
            />
          </div>
        )}
      </div>
    </dialog>
  );
}
