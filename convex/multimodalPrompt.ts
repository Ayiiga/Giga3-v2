import type { ChatCompletionAttachment } from "./chatEngine";

function formatUploadBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCurrentDateShort(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Server-side multimodal instructions — keep in sync with web/lib/chat/multimodalAttachments.ts */
export function buildMultimodalPrompt(
  message: string,
  attachments: ChatCompletionAttachment[]
): string {
  if (!attachments.length) return message;
  const attachmentSummary = attachments
    .map((attachment, index) => {
      const text = attachment.text?.trim()
        ? `\nExtracted/known content:\n${attachment.text.trim()}`
        : "";
      return `Attachment ${index + 1}: ${attachment.name} (${attachment.kind}, ${formatUploadBytes(attachment.sizeBytes)})${text}`;
    })
    .join("\n\n");

  return `${message.trim() || "Analyze the uploaded content."}

---
Uploaded multimodal context (${formatCurrentDateShort()}):
${attachmentSummary}
---

Instructions:
- Analyze every uploaded item automatically using the provided extracted content and/or image pixels.
- For PDFs/documents: ground answers only in the "Extracted/known content" block. If that block says no extractable text was found, say so clearly — do not invent chapters, quotes, or page contents.
- For images: use the attached image data. Extract visible text carefully; mark unclear regions instead of guessing.
- If only part of the text is readable, report what you can read and mark uncertain sections (do not reject the whole upload).
- For exams: detect subject and education level, solve step-by-step, show formulas, reasoning, and final answer.
- Include a Mermaid diagram or chart only when the user asks for a visual aid.
- Compare multiple images/files when more than one is uploaded.
- Give practical insights and recommendations. Never invent words or document passages you cannot see.`;
}
