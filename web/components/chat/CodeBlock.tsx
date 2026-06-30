"use client";

import { highlightCode } from "@/lib/chat/syntaxHighlight";
import { copyMarkdownToClipboard } from "@/lib/share/clientShare";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { memo, useMemo, useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(
    () => highlightCode(code, language),
    [code, language]
  );

  async function handleCopy() {
    await copyMarkdownToClipboard("```" + (language ? language + "\n" : "") + code + "\n```");
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="chat-code-block group relative">
      {language && (
        <span className="chat-md-code-lang" aria-hidden>
          {language}
        </span>
      )}
      <button
        type="button"
        onClick={() => void handleCopy()}
        className={cn(
          "absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg",
          "border border-border/60 bg-background/80 text-muted opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        )}
        aria-label="Copy code"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
      <pre className="chat-md-pre chat-md-pre-highlight">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
});
