"use client";

import { DocumentStudio } from "@/components/documents/DocumentStudio";
import {
  documentFromMarkdown,
  looksLikeDocumentContent,
} from "@/lib/documents/model";
import { saveDocumentDraft } from "@/lib/documents/drafts";
import type { DocumentTemplateKind, GigaDocument } from "@/lib/documents/types";
import { useMemo, useState } from "react";

type DocumentResultCardProps = {
  content: string;
  title?: string;
  templateKind?: DocumentTemplateKind;
  messageId?: string;
  onRegenerate?: () => void;
};

export function DocumentResultCard({
  content,
  title,
  templateKind,
  messageId,
  onRegenerate,
}: DocumentResultCardProps) {
  const initial = useMemo(
    () =>
      documentFromMarkdown(content, {
        title,
        templateKind,
        id: messageId ? `msg_${messageId}` : undefined,
      }),
    [content, title, templateKind, messageId]
  );
  const [doc, setDoc] = useState<GigaDocument>(initial);

  if (!looksLikeDocumentContent(content) && !templateKind) return null;

  return (
    <div className="mt-2" data-testid="document-result-card">
      <p className="mb-2 text-sm text-muted">
        Edit below, then use Export PDF or Export Word when you want a file. Nothing is
        downloaded until you tap export.
      </p>
      <DocumentStudio
        document={doc}
        onChange={(next) => {
          setDoc(next);
          saveDocumentDraft(next);
        }}
        onRegenerate={onRegenerate}
        compact
      />
    </div>
  );
}
