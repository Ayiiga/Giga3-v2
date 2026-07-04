import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalDocumentBySlug } from "@/lib/legal/content";
import type { Metadata } from "next";

const document = legalDocumentBySlug["acceptable-use"];

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
};

export default function AcceptableUsePage() {
  return <LegalDocument document={document} />;
}
