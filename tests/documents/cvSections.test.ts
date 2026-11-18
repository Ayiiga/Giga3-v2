import { describe, expect, it } from "vitest";
import { CV_SECTION_FIELDS, cvNodeText, cvSectionHeading, cvSections, cvTextNode, moveCvItem, readCvEntries, replaceCvSection, writeCvEntries } from "../../web/lib/documents/cvSections";

describe("CV profile editing", () => {
  it("keeps formatted legacy content intact when adding or moving education entries", () => {
    const legacy = [cvTextNode("heading", "Diploma", 3), {
      type: "paragraph",
      content: [{ type: "text", text: "Teacher training", marks: [{ type: "bold" }] }],
    }];
    const fields = CV_SECTION_FIELDS.education;
    const added = { key: "b", values: ["Degree", "Example University", "", "2025", ""] };
    const existing = readCvEntries(legacy, fields);
    const moved = moveCvItem([...existing, added], 1, -1);
    const serialized = writeCvEntries(moved, fields);
    expect(serialized.slice(-2)).toEqual(legacy);
    expect(readCvEntries(serialized, fields)[0].values).toEqual(added.values);
  });

  it("keeps a renamed heading bound to its form and preserves other sections", () => {
    const header = cvTextNode("heading", "Applicant", 1);
    const skills = [cvTextNode("heading", "Skills", 2), cvTextNode("paragraph", "Teaching")];
    const nodes = [header, cvSectionHeading("Academic record", "education"), ...skills];
    expect(cvSections(nodes)[0].id).toBe("education");
    const updated = replaceCvSection(nodes, "education", "Education", [cvTextNode("heading", "Diploma", 3)]);
    expect(updated.map(cvNodeText)).toEqual(["Applicant", "Academic record", "Diploma", "Skills", "Teaching"]);
    expect(updated.slice(-2)).toEqual(skills);
  });
});
