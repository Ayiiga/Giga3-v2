/** Display-only assistant response title split — stored message content is never modified. */

export interface ResponseDisplayParts {
  title: string | null;
  content: string;
}

const MIN_CHARS_FOR_DERIVED_TITLE = 140;

function cleanDisplayTitle(raw: string): string {
  return raw
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^#{1,3}\s+/, "")
    .trim();
}

function stripLeadingBlankLines(text: string): string {
  return text.replace(/^\n+/, "");
}

/**
 * Splits assistant markdown into a prominent display title and remaining body.
 * When no title is inferred, returns the original content unchanged.
 */
export function splitAssistantResponseDisplay(raw: string): ResponseDisplayParts {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length < MIN_CHARS_FOR_DERIVED_TITLE) {
    return { title: null, content: raw };
  }

  const lines = trimmed.split("\n");
  const firstLine = lines[0].trim();

  const markdownHeading = firstLine.match(/^#{1,2}\s+(.+)$/);
  if (markdownHeading) {
    const rest = stripLeadingBlankLines(lines.slice(1).join("\n"));
    if (rest.length >= 40) {
      return { title: cleanDisplayTitle(markdownHeading[1]), content: rest };
    }
  }

  const boldTitle = firstLine.match(/^\*\*(.+)\*\*$/);
  if (boldTitle && lines.length > 1 && lines[1].trim() === "") {
    const rest = stripLeadingBlankLines(lines.slice(2).join("\n"));
    if (rest.length >= 40) {
      return { title: cleanDisplayTitle(boldTitle[1]), content: rest };
    }
  }

  if (lines.length >= 2 && firstLine.length >= 8 && firstLine.length <= 96) {
    const rest = stripLeadingBlankLines(lines.slice(1).join("\n"));
    if (rest.length >= 50 && !firstLine.endsWith(",")) {
      return { title: cleanDisplayTitle(firstLine), content: rest };
    }
  }

  if (
    lines.length >= 3 &&
    lines[1].trim() === "" &&
    firstLine.length >= 8 &&
    firstLine.length <= 96
  ) {
    const rest = stripLeadingBlankLines(lines.slice(2).join("\n"));
    if (rest.length >= 50) {
      return { title: cleanDisplayTitle(firstLine), content: rest };
    }
  }

  const firstParagraphEnd = trimmed.search(/\n\n/);
  if (firstParagraphEnd > 0) {
    const firstParagraph = trimmed.slice(0, firstParagraphEnd).trim();
    const rest = trimmed.slice(firstParagraphEnd).trim();
    if (
      firstParagraph.length >= 12 &&
      firstParagraph.length <= 90 &&
      rest.length >= 60 &&
      firstParagraph.split(/\s+/).length >= 3 &&
      !firstParagraph.includes("```")
    ) {
      return {
        title: cleanDisplayTitle(firstParagraph.replace(/[.!?]+$/, "")),
        content: rest,
      };
    }
  }

  return { title: null, content: raw };
}
