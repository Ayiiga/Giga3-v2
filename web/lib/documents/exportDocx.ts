import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  BorderStyle,
  convertInchesToTwip,
} from "docx";
import type { DocJson, GigaDocument } from "@/lib/documents/types";
import { DOC_TEXT_COLORS } from "@/lib/documents/types";
import { tipTapJsonToMarkdown } from "@/lib/documents/model";

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

function runsFromNode(node: unknown): TextRun[] {
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
        bold: marks.some((m) => m.type === "bold"),
        italics: marks.some((m) => m.type === "italic"),
        underline: marks.some((m) => m.type === "underline") ? {} : undefined,
        color: colorHex(marks.find((m) => m.type === "textStyle")?.attrs?.color),
        font: "Calibri",
        size: 22,
      }),
    ];
  }
  if (Array.isArray(n.content)) return n.content.flatMap(runsFromNode);
  return [];
}

function paragraphsFromJson(doc: DocJson | null | undefined): Paragraph[] {
  const out: Paragraph[] = [];
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
      out.push(
        new Paragraph({
          children: runsFromNode(n),
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
          children: runsFromNode(n),
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
            children: runsFromNode(item),
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
            children: runsFromNode(item),
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

function paragraphsFromMarkdown(markdown: string): Paragraph[] {
  return markdown
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      if (block.startsWith("# ")) {
        return new Paragraph({
          text: block.slice(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 160 },
        });
      }
      if (block.startsWith("## ")) {
        return new Paragraph({
          text: block.slice(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 140 },
        });
      }
      if (block.startsWith("### ")) {
        return new Paragraph({
          text: block.slice(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { after: 120 },
        });
      }
      if (/^[-*+]\s+/m.test(block)) {
        return new Paragraph({
          text: block.replace(/^[-*+]\s+/gm, "").replace(/\n/g, " "),
          bullet: { level: 0 },
        });
      }
      return new Paragraph({
        text: block.replace(/\n/g, " "),
        spacing: { after: 120, line: 276 },
      });
    });
}

/** Build a real OOXML .docx buffer from the structured document. */
export async function exportDocumentDocx(doc: GigaDocument): Promise<Uint8Array> {
  let children = paragraphsFromJson(
    doc.content?.content && doc.content.content.length > 0 ? doc.content : null
  );
  if (children.length === 0) {
    children = paragraphsFromMarkdown(doc.markdown || tipTapJsonToMarkdown(doc.content));
  }
  if (children.length === 0) {
    children = [new Paragraph({ text: doc.title })];
  }

  const widthTwip = convertInchesToTwip(doc.paper.size === "A5" ? 5.83 : 8.27);
  const heightTwip = convertInchesToTwip(doc.paper.size === "A5" ? 8.27 : 11.69);
  const landscape = doc.paper.orientation === "landscape";

  const document = new Document({
    title: doc.title,
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
  return buffer instanceof Uint8Array
    ? buffer
    : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
