import { signatureImageBytes } from "@/lib/documents/signature";
import { documentAppearance, type DocumentAppearance } from "@/lib/documents/designs";
import { cvHeadingStyle } from "@/lib/documents/cvLayouts";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import type { DocJson, GigaDocument } from "@/lib/documents/types";
import { DOC_TEXT_COLORS } from "@/lib/documents/types";
import { tipTapJsonToMarkdown } from "@/lib/documents/model";
import { passportPhotoBytes } from "@/lib/documents/profilePhoto";

function alignOf(value?: string) {
  switch (value) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justify":
      return AlignmentType.BOTH;
    default:
      return AlignmentType.LEFT;
  }
}

function colorHex(value?: string): string {
  if (!value) return "18181B";
  if (value.startsWith("#")) return value.slice(1).toUpperCase();
  const named = Object.entries(DOC_TEXT_COLORS).find(([, v]) => v === value);
  if (named) return named[1].slice(1).toUpperCase();
  return "18181B";
}

function runsFromNode(node: unknown, font: string, heading?: { color: string; size: number }): TextRun[] {
  if (!node || typeof node !== "object") return [];
  const n = node as {
    type?: string;
    text?: string;
    marks?: Array<{ type: string; attrs?: { color?: string } }>;
    content?: unknown[];
  };
  if (n.type === "hardBreak") return [new TextRun({ break: 1 })];
  if (n.type === "text") {
    const marks = n.marks ?? [];
    return [
      new TextRun({
        text: n.text ?? "",
        bold: Boolean(heading) || marks.some((m) => m.type === "bold"),
        italics: marks.some((m) => m.type === "italic"),
        underline: marks.some((m) => m.type === "underline") ? {} : undefined,
        color: colorHex(heading?.color === "#ffffff" ? heading.color : marks.find((m) => m.type === "textStyle")?.attrs?.color ?? heading?.color),
        font,
        size: heading?.size ?? 22,
      }),
    ];
  }
  if (Array.isArray(n.content)) return n.content.flatMap((child) => runsFromNode(child, font, heading));
  return [];
}

function paragraphsFromJson(doc: DocJson | null | undefined, appearance: DocumentAppearance): Paragraph[] {
  const out: Paragraph[] = [];
  const font = appearance.serif ? "Georgia" : "Calibri";
  if (!doc?.content || !Array.isArray(doc.content)) return out;

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      attrs?: { level?: number; textAlign?: string };
      content?: unknown[];
    };
    if (n.type === "heading") {
      const level = n.attrs?.level ?? 1;
      const styled = wordHeading(appearance, level);
      out.push(
        new Paragraph({
          children: runsFromNode(n, font, styled.run),
          ...styled.paragraph,
          heading:
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
                ? HeadingLevel.HEADING_2
                : HeadingLevel.HEADING_3,
          alignment: alignOf(n.attrs?.textAlign),
          spacing: { after: 160 },
        })
      );
      return;
    }
    if (n.type === "paragraph") {
      out.push(
        new Paragraph({
          children: runsFromNode(n, font),
          alignment: alignOf(n.attrs?.textAlign),
          spacing: { after: 120, line: 276 },
        })
      );
      return;
    }
    if (n.type === "bulletList") {
      for (const item of n.content ?? []) {
        out.push(
          new Paragraph({
            children: runsFromNode(item, font),
            bullet: { level: 0 },
            spacing: { after: 60 },
          })
        );
      }
      return;
    }
    if (n.type === "orderedList") {
      let i = 0;
      for (const item of n.content ?? []) {
        out.push(
          new Paragraph({
            children: runsFromNode(item, font),
            numbering: { reference: "doc-numbers", level: 0 },
            spacing: { after: 60 },
          })
        );
        i += 1;
      }
      void i;
      return;
    }
    if (n.type === "horizontalRule") {
      out.push(
        new Paragraph({
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "A1A1AA" },
          },
          spacing: { after: 200 },
        })
      );
      return;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }

  doc.content.forEach(walk);
  return out;
}

/** Markdown-only imports should not combine separate CV bullets into one line. */
function wordHeading(appearance: DocumentAppearance, level: number) {
  const style = cvHeadingStyle(appearance, level);
  return {
    run: { color: style.color, size: level === 1 ? 46 : level === 2 ? 27 : 23 },
    paragraph: {
      keepNext: true,
      shading: style.fill ? { fill: colorHex(style.fill) } : undefined,
      border: style.rule ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: colorHex(style.rule) } } : undefined,
    },
  };
}

function paragraphsFromMarkdown(markdown: string, appearance: DocumentAppearance): Paragraph[] {
  const out: Paragraph[] = [];
  let paragraph: string[] = [];
  const clean = (value: string) => value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1");
  const flush = () => {
    if (!paragraph.length) return;
    out.push(new Paragraph({
      text: clean(paragraph.join(" ")),
      spacing: { after: 120, line: 276 },
    }));
    paragraph = [];
  };

  for (const source of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = source.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      const styled = wordHeading(appearance, level);
      out.push(new Paragraph({
        children: [new TextRun({
          text: clean(heading[2]), bold: true, size: styled.run.size,
          color: colorHex(styled.run.color), font: appearance.serif ? "Georgia" : "Calibri",
        })],
        ...styled.paragraph,
        heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        spacing: { after: level === 1 ? 160 : level === 2 ? 140 : 120 },
      }));
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(line)) {
      flush();
      out.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "A1A1AA" } },
        spacing: { after: 160 },
      }));
      continue;
    }
    const bullet = /^[-*+]\s+(.+)$/.exec(line);
    if (bullet) {
      flush();
      out.push(new Paragraph({ text: clean(bullet[1]), bullet: { level: 0 }, spacing: { after: 60 } }));
      continue;
    }
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (numbered) {
      flush();
      out.push(new Paragraph({ text: clean(numbered[1]), numbering: { reference: "doc-numbers", level: 0 }, spacing: { after: 60 } }));
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return out;
}

/** Build a real OOXML .docx buffer from the structured document. */
export async function exportDocumentDocx(doc: GigaDocument): Promise<Uint8Array> {
  const appearance = documentAppearance(doc);
  let children = paragraphsFromJson(
    doc.content?.content && doc.content.content.length > 0 ? doc.content : null,
    appearance
  );
  if (children.length === 0) {
    children = paragraphsFromMarkdown(doc.markdown || tipTapJsonToMarkdown(doc.content), appearance);
  }
  if (children.length === 0) {
    children = [new Paragraph({ text: doc.title })];
  }
  if (doc.templateKind === "cv" && doc.profilePhotoDataUrl) {
    children.unshift(new Paragraph({
      children: [new ImageRun({
        type: "jpg",
        data: passportPhotoBytes(doc.profilePhotoDataUrl),
        transformation: { width: 98, height: 124 },
        altText: {
          title: "Passport-style CV photograph",
          description: "Applicant-provided portrait",
          name: "CV portrait",
        },
      })],
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80 },
    }));
  }

  if (doc.signatureDataUrl) {
    children.push(new Paragraph({
      children: [new ImageRun({
        type: "png",
        data: signatureImageBytes(doc.signatureDataUrl),
        transformation: { width: 196, height: 74 },
        altText: { title: "Handwritten signature", description: "Document signature", name: "Signature" },
      })],
      spacing: { before: 120 },
    }));
  }

  const widthTwip = convertInchesToTwip(doc.paper.size === "A5" ? 5.83 : 8.27);
  const heightTwip = convertInchesToTwip(doc.paper.size === "A5" ? 8.27 : 11.69);
  const landscape = doc.paper.orientation === "landscape";

  const document = new Document({
    title: doc.title,
    styles: { default: { document: { run: { font: appearance.serif ? "Georgia" : "Calibri", size: 22 } } } },
    numbering: {
      config: [
        {
          reference: "doc-numbers",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: landscape ? heightTwip : widthTwip,
              height: landscape ? widthTwip : heightTwip,
            },
            margin: {
              top: convertInchesToTwip(doc.paper.marginsMm.top / 25.4),
              right: convertInchesToTwip(doc.paper.marginsMm.right / 25.4),
              bottom: convertInchesToTwip(doc.paper.marginsMm.bottom / 25.4),
              left: convertInchesToTwip(doc.paper.marginsMm.left / 25.4),
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  if (buffer instanceof Uint8Array) {
    return new Uint8Array(buffer);
  }
  // Node Buffer / ArrayBufferView fallback across docx runtime targets.
  const view = buffer as ArrayBufferView;
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}
