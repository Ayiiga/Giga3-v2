import { LegalDocument } from "@/components/legal/LegalDocument";
import { legalDocumentBySlug } from "@/lib/legal/content";
import type { Metadata } from "next";

const document = legalDocumentBySlug.privacy;

export const metadata: Metadata = {
  title: document.title,
  description: document.description,
};

export default function PrivacyPolicyPage() {
  return <LegalDocument document={document} />;
}
