import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalDocumentBySlug } from "@/lib/legal/content";
import type { Metadata } from "next";

const document = legalDocumentBySlug.refunds;

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
};

export default function RefundPolicyPage() {
  return <LegalDocument document={document} />;
}
