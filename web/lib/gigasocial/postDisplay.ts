/** Display-only post title/body split — does not modify stored post data. */

export interface PostDisplayParts {
  title: string | null;
  description: string;
}

function cleanDisplayTitle(raw: string): string {
  return raw
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/^#{1,3}\s+/, "")
    .trim();
}

/**
 * Derives a visual title from post body when the stored post has no title field.
 * Returns null title when no meaningful split is detected (legacy single-block posts).
 */
export function splitPostDisplay(body: string): PostDisplayParts {
  const trimmed = body.trim();
  if (!trimmed) return { title: null, description: "" };

  const lines = trimmed.split("\n");
  const firstLine = lines[0].trim();

  const markdownHeading = firstLine.match(/^#{1,2}\s+(.+)$/);
  if (markdownHeading) {
    const rest = lines.slice(1).join("\n").trim();
    return {
      title: cleanDisplayTitle(markdownHeading[1]),
      description: rest || trimmed,
    };
  }

  if (lines.length >= 2 && firstLine.length >= 3 && firstLine.length <= 100) {
    const rest = lines.slice(1).join("\n").trim();
    if (rest.length > 0) {
      return { title: cleanDisplayTitle(firstLine), description: rest };
    }
  }

  if (
    lines.length >= 3 &&
    lines[1].trim() === "" &&
    firstLine.length >= 3 &&
    firstLine.length <= 100
  ) {
    const rest = lines.slice(2).join("\n").trim();
    if (rest.length > 0) {
      return { title: cleanDisplayTitle(firstLine), description: rest };
    }
  }

  return { title: null, description: trimmed };
}
