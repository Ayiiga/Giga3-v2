"use client";

import { Button } from "@/components/ui/Button";
import {
  CV_SECTION_FIELDS, cvNodeText, cvParagraphs, cvSectionHeading, cvSections, cvTextNode,
  moveCvItem, readCvEntries, replaceCvSection, retainUnmappedContact, writeCvEntries,
  type CvEntry, type CvNode,
} from "@/lib/documents/cvSections";
import {
  ArrowDown, ArrowLeft, ArrowUp, Award, BriefcaseBusiness, ChevronRight, Eye, GraduationCap,
  LayoutList, ListChecks, Plus, Rocket, Target, Trash2, UserRound, Users,
} from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";

const sections = [
  { id: "personal", title: "Personal Details", icon: UserRound },
  { id: "education", title: "Education", icon: GraduationCap },
  { id: "experience", title: "Experience", icon: BriefcaseBusiness },
  { id: "skills", title: "Skills", icon: ListChecks },
  { id: "objective", title: "Objective", icon: Target },
  { id: "references", title: "References", icon: Users },
  { id: "projects", title: "Projects", icon: Rocket },
  { id: "awards", title: "Achievements & Awards", icon: Award },
];

const fieldClass = "mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base font-normal text-slate-950 focus:border-violet-600 focus:outline-none focus:ring-2 focus:ring-violet-200";
const actionClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/20 disabled:opacity-40";

type Props = {
  nodes: CvNode[];
  onSave: (nodes: CvNode[]) => void;
  onPreview: () => void;
  onAdvanced: () => void;
  photo: ReactNode;
};

export function CvProfileEditor({ nodes, onSave, onPreview, onAdvanced, photo }: Props) {
  const [active, setActive] = useState("profile");
  const [example, setExample] = useState(false);
  const [entries, setEntries] = useState<CvEntry[]>([]);
  const [personal, setPersonal] = useState<string[]>([]);
  const [body, setBody] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");
  const [ordered, setOrdered] = useState<ReturnType<typeof cvSections>>([]);
  const sequence = useRef(0);
  const root = useRef<HTMLElement>(null);
  const existing = cvSections(nodes);
  const current = existing.find((section) => section.id === active);
  const section = sections.find((item) => item.id === active);
  const title = section?.title ?? current?.title ?? (active === "manage" ? "Manage sections" : active === "new" ? "Add a section" : "CV Profile");
  const fields = active === "education" || active === "experience" || active === "references" ? CV_SECTION_FIELDS[active] : undefined;
  const nameIndex = nodes.findIndex((node) => node.type === "heading" && node.attrs?.level === 1);
  const contact = existing.find((item) => item.id === "personal");

  function reveal(next: string) {
    setActive(next);
    setExample(false);
    requestAnimationFrame(() => {
      root.current?.scrollIntoView({ block: "start" });
      root.current?.querySelector<HTMLElement>("[data-cv-profile-title]")?.focus({ preventScroll: true });
    });
  }

  function open(id: string) {
    const selected = existing.find((item) => item.id === id);
    const content = selected ? nodes.slice(selected.start + 1, selected.end) : [];
    setBody(content.map(cvNodeText).join("\n"));
    setSectionTitle("");
    if (id === "manage") setOrdered(existing);
    if (id === "education" || id === "experience" || id === "references") {
      const read = readCvEntries(content, CV_SECTION_FIELDS[id]);
      setEntries(read.length ? read : [{ key: "entry-first", values: CV_SECTION_FIELDS[id].map(() => "") }]);
    }
    if (id === "personal") {
      const text = content.map(cvNodeText).join("\n");
      setPersonal(CV_SECTION_FIELDS.personal.map((field, index) =>
        index === 0 ? (nameIndex >= 0 ? cvNodeText(nodes[nameIndex]) : "")
          : text.split("\n").find((line) => line.startsWith(field + ": "))?.slice(field.length + 2) ?? ""
      ));
    }
    reveal(id);
  }

  function save() {
    let result = nodes;
    if (active === "manage") {
      result = [...nodes.slice(0, existing[0]?.start ?? nodes.length), ...ordered.flatMap((item) => [
        item.title === cvNodeText(nodes[item.start]) ? nodes[item.start] : cvSectionHeading(item.title.trim(), item.id),
        ...nodes.slice(item.start + 1, item.end),
      ])];
    } else if (active === "personal") {
      const name = personal[0]?.trim();
      const oldContact = contact ? nodes.slice(contact.start + 1, contact.end) : [];
      const other = retainUnmappedContact(oldContact);
      const details = CV_SECTION_FIELDS.personal.slice(1).flatMap((field, index) => {
        const value = personal[index + 1]?.trim();
        return value ? [cvTextNode("paragraph", `${field}: ${value}`)] : [];
      });
      if (details.length || contact) result = replaceCvSection(nodes, "personal", "Personal Details", [...details, ...other]);
      if (nameIndex >= 0 && name !== cvNodeText(nodes[nameIndex])) {
        result = [...result];
        result.splice(nameIndex, 1, ...(name ? [cvTextNode("heading", name, 1)] : []));
      } else if (nameIndex < 0 && name) result = [cvTextNode("heading", name, 1), ...result];
    } else if (active === "new") {
      result = [...nodes, cvTextNode("heading", sectionTitle.trim(), 2), ...cvParagraphs(body)];
    } else {
      const contents = fields ? writeCvEntries(entries, fields) : cvParagraphs(body);
      const currentBody = current ? nodes.slice(current.start + 1, current.end) : [];
      if (fields || body !== currentBody.map(cvNodeText).join("\n")) {
        if (current || contents.length) result = replaceCvSection(nodes, active, title, contents);
      }
    }
    onSave(result);
    reveal("profile");
  }

  function row(id: string, label: string, Icon: typeof UserRound) {
    return (
      <button type="button" key={id} onClick={() => open(id)}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800 shadow-sm hover:border-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-600">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-100 to-violet-100 text-violet-800">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
      </button>
    );
  }

  const invalid = active === "new" ? !sectionTitle.trim() : active === "manage" && ordered.some((item) => !item.title.trim());

  return (
    <section ref={root} className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <header className="flex min-h-14 items-center gap-2 bg-gradient-to-r from-sky-700 to-violet-800 px-3 py-2 text-white">
        {active !== "profile" ? (
          <button type="button" className={actionClass} onClick={() => reveal("profile")} aria-label="Cancel section changes and return to CV Profile">
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
        <h3 data-cv-profile-title tabIndex={-1} className="text-lg font-bold outline-none">{title}</h3>
      </header>

      {active === "profile" ? (
        <div className="space-y-5 p-3 sm:p-5">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-600">Sections</h4>
            {sections.slice(0, 6).map(({ id, title: label, icon }) => row(id, label, icon))}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-600">More sections</h4>
            {sections.slice(6).map(({ id, title: label, icon }) => row(id, label, icon))}
            {existing.filter((item) => item.id.startsWith("custom-")).map((item) => row(item.id, item.title, LayoutList))}
            {row("new", "Add a section", Plus)}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-600">Manage sections</h4>
            {row("manage", "Rearrange / Edit Headings", LayoutList)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={onPreview} className="grow"><Eye className="h-4 w-4" aria-hidden /> View CV</Button>
            <Button type="button" variant="secondary" onClick={onAdvanced}>Advanced editor</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-3 sm:p-5">
          {active === "education" || active === "personal" ? (
            <div role="group" aria-label="Section guidance" className="flex gap-2 border-b border-slate-200">
              <button type="button" className="min-h-11 px-2 aria-pressed:border-b-2 aria-pressed:border-violet-600" aria-pressed={!example} onClick={() => setExample(false)}>{title}</button>
              <button type="button" className="min-h-11 px-2 aria-pressed:border-b-2 aria-pressed:border-violet-600" aria-pressed={example} onClick={() => setExample(true)}>{active === "education" ? "Example" : "Help"}</button>
            </div>
          ) : null}
          {example ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
              {active === "education" ? <><p>List your qualification, institution and year. Include a grade if it helps your application.</p><p className="font-semibold">Example</p><p>Diploma in Basic Education<br />Example College of Education, Nalerigu<br />2020–2023</p></>
                : <p>Add your name and the contact details you want employers to use. The photograph and additional personal details are optional. For example, use “Mpoko Charles” for the name and “Binduri” for the location.</p>}
            </div>
          ) : active === "personal" ? (
            <>
              {CV_SECTION_FIELDS.personal.slice(0, 6).map((label, index) => (
                <label key={label} className="block text-sm font-semibold text-slate-800">
                  {label}
                  <input className={fieldClass} value={personal[index] ?? ""} type={label === "Email" ? "email" : label === "Phone" ? "tel" : "text"}
                    onChange={(event) => { const value = event.target.value; setPersonal((items) => items.map((item, i) => i === index ? value : item)); }} />
                </label>
              ))}
              <details className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                <summary className="cursor-pointer py-2 text-sm font-semibold">Optional personal details</summary>
                {CV_SECTION_FIELDS.personal.slice(6).map((label, offset) => (
                  <label key={label} className="block text-sm font-semibold text-slate-800">{label}
                    <input className={fieldClass} value={personal[offset + 6] ?? ""}
                      onChange={(event) => { const value = event.target.value; setPersonal((items) => items.map((item, i) => i === offset + 6 ? value : item)); }} />
                  </label>
                ))}
              </details>
              {photo}
            </>
          ) : fields ? (
            <>
              {entries.map((entry, index) => (
                <article key={entry.key} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <header className="flex items-center justify-between gap-1 bg-gradient-to-r from-sky-700 to-violet-800 px-3 text-white">
                    <h4 className="text-sm font-bold">{title} {index + 1}</h4>
                    <div className="flex">
                      <button type="button" className={actionClass} aria-label={`Move ${title} ${index + 1} up`} disabled={index === 0} onClick={() => setEntries(moveCvItem(entries, index, -1))}><ArrowUp className="h-4 w-4" aria-hidden /></button>
                      <button type="button" className={actionClass} aria-label={`Move ${title} ${index + 1} down`} disabled={index === entries.length - 1} onClick={() => setEntries(moveCvItem(entries, index, 1))}><ArrowDown className="h-4 w-4" aria-hidden /></button>
                      <button type="button" className={actionClass} aria-label={`Remove ${title} ${index + 1}`} onClick={() => setEntries(entries.filter((item) => item.key !== entry.key))}><Trash2 className="h-4 w-4" aria-hidden /></button>
                    </div>
                  </header>
                  <div className="space-y-3 p-3">
                    {fields.map((label, field) => {
                      const props = {
                        className: fieldClass,
                        value: entry.values[field],
                        onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                          const value = event.target.value;
                          setEntries((items) => items.map((item) => item.key === entry.key
                            ? { key: item.key, values: item.values.map((old, i) => i === field ? value : old) } : item));
                        },
                      };
                      return <label key={label} className="block text-sm font-semibold text-slate-800">{label}{field === fields.length - 1 ? <textarea {...props} rows={3} /> : <input {...props} />}</label>;
                    })}
                  </div>
                </article>
              ))}
              <Button type="button" variant="secondary" onClick={() => setEntries([...entries, { key: `new-${++sequence.current}`, values: fields.map(() => "") }])}>
                <Plus className="h-4 w-4" aria-hidden /> Add entry
              </Button>
            </>
          ) : active === "manage" ? (
            ordered.length ? ordered.map((item, index) => (
              <div key={item.id} className="flex items-end gap-1 rounded-xl border border-slate-200 bg-white p-2">
                <label className="min-w-0 flex-1 text-sm font-semibold">Section {index + 1}
                  <input className={fieldClass} value={item.title} onChange={(event) => { const value = event.target.value; setOrdered((items) => items.map((other) => other.id === item.id ? { ...other, title: value } : other)); }} />
                </label>
                <button type="button" className={actionClass} aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => setOrdered(moveCvItem(ordered, index, -1))}><ArrowUp className="h-4 w-4" aria-hidden /></button>
                <button type="button" className={actionClass} aria-label={`Move ${item.title} down`} disabled={index === ordered.length - 1} onClick={() => setOrdered(moveCvItem(ordered, index, 1))}><ArrowDown className="h-4 w-4" aria-hidden /></button>
              </div>
            )) : <p className="text-sm text-slate-700">Add a CV section before arranging headings.</p>
          ) : (
            <>
              {active === "new" ? <label className="block text-sm font-semibold">Section heading<input className={fieldClass} value={sectionTitle} onChange={(event) => setSectionTitle(event.target.value)} /></label> : null}
              <label className="block text-sm font-semibold">{active === "new" ? "Section content" : title}<textarea className={fieldClass} rows={6} value={body} onChange={(event) => setBody(event.target.value)} /></label>
            </>
          )}
          {!example ? <Button type="button" disabled={invalid} onClick={save}>Save section</Button> : null}
        </div>
      )}
    </section>
  );
}
