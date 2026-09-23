"use client";

import { MessageMarkdown } from "@/components/chat/MessageMarkdown";
import type { ParsedSmartAnswer, SmartAnswerSection } from "@/lib/chat/parseSmartAnswer";
import { cn } from "@/lib/utils";
import { memo } from "react";

type SmartAnswerProps = {
  messageId?: string;
  parsed: ParsedSmartAnswer;
};

function headingDomId(messageId: string | undefined, section: SmartAnswerSection, index: number): string {
  const base = (messageId ?? "msg").replace(/[^A-Za-z0-9_-]/g, "") || "msg";
  return `smart-answer-${base}-${section.id}-${index}`;
}

export const SmartAnswer = memo(function SmartAnswer({ messageId, parsed }: SmartAnswerProps) {
  const SectionHeading = parsed.title ? "h3" : "h2";

  return (
    <div className="smart-answer">
      {parsed.title ? <h2 className="chat-response-title smart-answer__title">{parsed.title}</h2> : null}
      {parsed.preamble ? (
        <div className="smart-answer__preamble">
          <MessageMarkdown content={parsed.preamble} headingFloor={parsed.title ? 3 : 2} />
        </div>
      ) : null}
      <div className="smart-answer__sections">
        {parsed.sections.map((section, index) => {
          const headingId = headingDomId(messageId, section, index);
          return (
            <section
              key={`${section.id}-${index}`}
              className={cn("smart-answer__section", `smart-answer__section--${section.id}`)}
              aria-labelledby={headingId}
            >
              <SectionHeading id={headingId} className="smart-answer__heading">
                <span className="smart-answer__mark" aria-hidden="true">
                  {section.emoji}
                </span>
                <span className="smart-answer__label">{section.label}</span>
              </SectionHeading>
              <div className="smart-answer__body">
                <MessageMarkdown content={section.content} headingFloor={3} />
              </div>
            </section>
          );
        })}
      </div>
      {parsed.appendix ? (
        <div className="smart-answer__appendix">
          <MessageMarkdown content={parsed.appendix} headingFloor={3} />
        </div>
      ) : null}
    </div>
  );
});
