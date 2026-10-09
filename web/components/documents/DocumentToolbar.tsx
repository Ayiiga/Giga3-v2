"use client";

import { cn } from "@/lib/utils";
import { DOC_TEXT_COLORS, type DocTextColor } from "@/lib/documents/types";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Italic,
  List,
  ListOrdered,
  MoreHorizontal,
  Redo2,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { useState } from "react";

type DocumentToolbarProps = {
  editor: Editor | null;
  className?: string;
};

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times", value: "Times New Roman, serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Calibri", value: "Calibri, sans-serif" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm",
        active
          ? "border-accent bg-accent/15 text-foreground"
          : "border-border bg-white text-muted hover:text-foreground",
        disabled && "opacity-40"
      )}
    >
      {children}
    </button>
  );
}

export function DocumentToolbar({ editor, className }: DocumentToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  if (!editor) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-xl border border-border bg-violet-50/50 p-2",
        className
      )}
      role="toolbar"
      aria-label="Document formatting"
    >
      <ToolButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="h-4 w-4" />
      </ToolButton>
      <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
      <ToolButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </ToolButton>
      <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
      <ToolButton
        label="Align left"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Align centre"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Align right"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Justify"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-4 w-4" />
      </ToolButton>
      <span className="mx-0.5 w-px self-stretch bg-border" aria-hidden />
      <ToolButton
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        label="Insert table"
        active={editor.isActive("table")}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <Table2 className="h-4 w-4" />
      </ToolButton>
      <label className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-white px-2 text-xs font-medium text-muted">
        Heading
        <select
          className="bg-transparent text-foreground outline-none"
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : "p"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (v === "p") editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .toggleHeading({ level: Number(v) as 1 | 2 | 3 })
                .run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
      </label>
      <label className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-white px-2 text-xs font-medium text-muted">
        Size
        <select
          className="bg-transparent text-foreground outline-none"
          defaultValue="14px"
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(v).run();
          }}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-border bg-white px-2 text-xs font-medium text-muted">
        Font
        <select
          className="max-w-[7rem] bg-transparent text-foreground outline-none"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(v).run();
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-1" role="group" aria-label="Text colour">
        {(Object.keys(DOC_TEXT_COLORS) as DocTextColor[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-label={`Text colour ${key}`}
            title={key}
            onClick={() => editor.chain().focus().setColor(DOC_TEXT_COLORS[key]).run()}
            className="h-7 w-7 rounded-full border border-border"
            style={{ backgroundColor: DOC_TEXT_COLORS[key] }}
          />
        ))}
      </div>
      <div className="relative">
        <ToolButton label="More formatting" active={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
          <MoreHorizontal className="h-4 w-4" />
        </ToolButton>
        {moreOpen ? (
          <div
            className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-xl border border-border bg-white p-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-violet-50"
              onClick={() => {
                editor.commands.selectAll();
                setMoreOpen(false);
              }}
            >
              Select all
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-violet-50"
              onClick={async () => {
                const text = editor.state.selection.empty
                  ? editor.getText()
                  : editor.state.doc.textBetween(
                      editor.state.selection.from,
                      editor.state.selection.to,
                      "\n"
                    );
                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  /* clipboard may be blocked */
                }
                setMoreOpen(false);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-violet-50"
              onClick={() => {
                editor.chain().focus().setHorizontalRule().run();
                setMoreOpen(false);
              }}
            >
              Page break / rule
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-violet-50"
              onClick={() => {
                editor.chain().focus().setTextSelection(0).run();
                setMoreOpen(false);
              }}
            >
              Jump to start
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
