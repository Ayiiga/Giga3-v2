"use client";

import { AnswerBlockActions } from "@/components/chat/AnswerBlockActions";
import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import type { AnswerBlockSection } from "@/lib/chat/parseAnswerBlocks";
import { cn } from "@/lib/utils";
import { memo } from "react";

type AnswerContentBlockProps = {
  messageId?: string;
  section: AnswerBlockSection;
  index: number;
};

export const AnswerContentBlock = memo(function AnswerContentBlock({
  messageId,
  section,
  index,
}: AnswerContentBlockProps) {
  const blockId = `${messageId ?? "msg"}-${section.kind}-${index}`;

  return (
    <section
      className={cn("answer-content-block", `answer-content-block--${section.kind}`)}
      aria-label={section.label}
    >
      <div className="answer-content-block__header">
        <h3 className="answer-content-block__title">{section.label}</h3>
        <AnswerBlockActions
          blockId={blockId}
          text={section.content}
          label={section.label}
        />
      </div>
      <div className="answer-content-block__body">
        <MessageMarkdown content={section.content} />
      </div>
    </section>
  );
});
