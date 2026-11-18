import type { DocJson } from "@/lib/documents/types";

export type CvNode = {
  type: string;
  attrs?: { level?: number; cvSection?: string | null };
  text?: string;
  content?: CvNode[];
};

export const CV_SECTION_FIELDS = {
  personal: ["Full name", "Professional title", "Address", "Email", "Phone", "Website / portfolio", "Date of birth", "Marital status", "Nationality", "Religion", "Hometown", "District"],
  education: ["Course / Degree", "School / University", "Grade / Score", "Year", "Details"],
  experience: ["Role", "Organisation", "Location", "Dates", "Responsibilities and achievements"],
  references: ["Name", "Position", "Organisation", "Contact", "Details"],
} as const;

const ALIASES: Record<string, string[]> = {
  personal: ["contact", "contact details", "personal details"],
  education: ["education", "qualifications", "academic qualifications"],
  experience: ["experience", "professional experience", "work experience", "employment history"],
  skills: ["skills", "core skills", "key skills"],
  objective: ["objective", "summary", "profile", "professional profile", "professional summary", "career objective"],
  references: ["reference", "references", "referees"],
  projects: ["projects", "leadership and projects"],
  awards: ["achievements & awards", "achievements and awards", "awards", "achievements"],
};

export type CvSection = { id: string; title: string; start: number; end: number };

export function cvNodeText(node: CvNode): string {
  if (node.type === "hardBreak") return "\n";
  return node.text ?? node.content?.map(cvNodeText).join(
    node.type === "bulletList" || node.type === "orderedList" ? "\n" : ""
  ) ?? "";
}

export function retainUnmappedContact(nodes: CvNode[]): CvNode[] {
  return nodes.flatMap((node) => {
    if (node.type === "bulletList" || node.type === "orderedList") {
      const content = retainUnmappedContact(node.content ?? []);
      return content.length ? [{ ...node, content }] : [];
    }
    const text = cvNodeText(node);
    const singleLineBlock = node.type === "paragraph" || node.type === "listItem" &&
      node.content?.length === 1 && node.content[0].type === "paragraph";
    const mapped = singleLineBlock && !text.includes("\n") && CV_SECTION_FIELDS.personal.slice(1).some((field) =>
      text.startsWith(field + ": ")
    );
    return mapped ? [] : [node];
  });
}

export function cvNodes(doc: DocJson): CvNode[] {
  return (doc.content ?? []) as CvNode[];
}

export function cvSections(nodes: CvNode[]): CvSection[] {
  const sections: CvSection[] = [];
  nodes.forEach((node, index) => {
    if (node.type !== "heading" || node.attrs?.level !== 2) return;
    const title = cvNodeText(node);
    const known = Object.keys(ALIASES).find((key) =>
      key === node.attrs?.cvSection || ALIASES[key].includes(title.trim().toLowerCase())
    );
    const id = known && !sections.some((section) => section.id === known) ? known : `custom-${index}`;
    if (sections.length) sections[sections.length - 1].end = index;
    sections.push({ id, title, start: index, end: nodes.length });
  });
  return sections;
}

export function cvTextNode(type: "heading" | "paragraph", value: string, level?: number): CvNode {
  return {
    type,
    ...(type === "heading" ? { attrs: { level } } : {}),
    content: value ? [{ type: "text", text: value }] : [],
  };
}

export function cvSectionHeading(title: string, id: string): CvNode {
  return {
    ...cvTextNode("heading", title, 2),
    attrs: { level: 2, cvSection: Object.hasOwn(ALIASES, id) ? id : null },
  };
}

export function cvParagraphs(text: string): CvNode[] {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    .map((line) => cvTextNode("paragraph", line));
}

export function replaceCvSection(nodes: CvNode[], id: string, title: string, body: CvNode[]): CvNode[] {
  const section = cvSections(nodes).find((item) => item.id === id);
  if (!section) return [...nodes, cvSectionHeading(title, id), ...body];
  return [...nodes.slice(0, section.start + 1), ...body, ...nodes.slice(section.end)];
}

export type CvEntry = { key: string; values: string[]; original?: CvNode[] };

export function readCvEntries(nodes: CvNode[], fields: readonly string[]): CvEntry[] {
  const groups: CvNode[][] = [];
  for (const node of nodes) {
    if ((node.type === "heading" && node.attrs?.level === 3) || groups.length === 0) groups.push([]);
    groups[groups.length - 1].push(node);
  }
  return groups.map((group, index) => {
    const values = fields.map(() => "");
    const notes: string[] = [];
    for (const [position, node] of group.entries()) {
      const text = cvNodeText(node);
      if (position === 0 && node.type === "heading" && node.attrs?.level === 3) {
        values[0] = text;
        continue;
      }
      const field = fields.findIndex((label, i) => i > 0 && i < fields.length - 1 && text.startsWith(label + ": "));
      if (field > 0) values[field] = text.slice(fields[field].length + 2);
      else if (text) notes.push(text);
    }
    values[fields.length - 1] = notes.join("\n");
    return { key: `entry-${index}`, values, original: group };
  });
}

export function writeCvEntries(entries: CvEntry[], fields: readonly string[]): CvNode[] {
  return entries.flatMap(({ original, values }) => {
    if (original) return original;
    const heading = values[0]?.trim();
    const nodes = heading ? [cvTextNode("heading", heading, 3)] : [];
    for (let index = 1; index < fields.length - 1; index++) {
      const value = values[index]?.trim();
      if (value) nodes.push(cvTextNode("paragraph", `${fields[index]}: ${value}`));
    }
    return [...nodes, ...cvParagraphs(values[fields.length - 1] ?? "")];
  });
}

export function moveCvItem<T>(items: T[], from: number, direction: -1 | 1): T[] {
  const to = from + direction;
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
  const next = [...items];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
