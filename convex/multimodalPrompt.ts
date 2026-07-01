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
- Analyze every uploaded item automatically.
- Extract text/OCR where possible.
- For exams: detect subject and education level, solve step-by-step, show formulas, reasoning, and final answer.
- If a diagram, graph, circuit, flowchart, geometry sketch, map, or scientific illustration helps, include a Mermaid diagram block or a clear generated diagram description.
- Compare multiple images/files when more than one is uploaded.
- Give practical insights and recommendations.`;
}
