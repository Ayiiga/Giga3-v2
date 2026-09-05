"use client";

import { ChevronDown, Redo2, Search, Undo2, X } from "lucide-react";
import Link from "next/link";

type VideoEditorHeaderProps = {
  onClose: () => void;
  onExport: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  exporting?: boolean;
};

export function VideoEditorHeader({
  onClose,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  exporting = false,
}: VideoEditorHeaderProps) {
  return (
    <header className="gigaedit-editor-header flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={onClose}
          className="gigaedit-editor-icon-btn"
          aria-label="Back to Creator Studio home"
        >
          <X className="h-5 w-5" />
        </button>
        <button type="button" className="gigaedit-editor-icon-btn hidden sm:inline-flex" aria-label="Search">
          <Search className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/media/?action=enhance"
          className="gigaedit-editor-quality-chip hidden items-center gap-1 sm:inline-flex"
        >
          AI UHD
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="gigaedit-editor-icon-btn"
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="gigaedit-editor-icon-btn"
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="gigaedit-editor-export-btn"
        >
          {exporting ? "Exporting…" : "Export"}
        </button>
      </div>
    </header>
  );
}
