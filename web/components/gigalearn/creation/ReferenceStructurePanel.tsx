"use client";

import {
  REFERENCE_TRANSFORMATION_NOTICE,
  analyzeReferenceDocument,
  type PersonalDataKind,
  type ReferenceAnalysis,
} from "@/lib/gigalearn/creation/referenceAnalyzer";
import { STRUCTURE_INPUT_KEY } from "@/lib/gigalearn/creation/prompts";
import { CREATION_TEMPLATES, getCreationTemplate } from "@/lib/gigalearn/creation/templates";
import type { CreationInputs, CreationTemplateId, SourceReference } from "@/lib/gigalearn/creation/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, FileText } from "lucide-react";
import { useRef, useState } from "react";

const MAX_REFERENCE_CHARS = 200_000;

const PERSONAL_DATA_LABELS: Record<PersonalDataKind, string> = {
  email: "an email address",
  phone: "a phone number",
  dateOfBirth: "a date of birth",
  postalAddress: "a postal address",
};

export type ReferenceStart = {
  templateId: CreationTemplateId;
  inputs: CreationInputs;
  sourceReferences: SourceReference[];
};

type ReferenceStructurePanelProps = {
  onBack: () => void;
  onStart: (start: ReferenceStart) => void;
};

/**
 * Structure-only reference intake. The pasted/uploaded text stays in this
 * component's memory: it is never saved, put in a URL or sent to the model.
 */
export function ReferenceStructurePanel({ onBack, onStart }: ReferenceStructurePanelProps) {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<ReferenceAnalysis | null>(null);
  const [templateId, setTemplateId] = useState<CreationTemplateId>("lesson");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const analyse = (source: string) => {
    const trimmed = source.slice(0, MAX_REFERENCE_CHARS);
    if (trimmed.trim().split(/\s+/).length < 5) {
      setError("Paste a bit more of the reference so Giga3 can see its structure.");
      setAnalysis(null);
      return;
    }
    setError(null);
    const result = analyzeReferenceDocument(trimmed);
    setAnalysis(result);
    if (result.documentType !== "unknown") setTemplateId(result.documentType);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const plain = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
    if (!plain) {
      setError("Only plain-text files (.txt, .md) can be read here. For PDF or Word files, copy the text and paste it below.");
      return;
    }
    const content = await file.text();
    setText(content.slice(0, MAX_REFERENCE_CHARS));
    analyse(content);
  };

  const start = () => {
    if (!analysis) return;
    const template = getCreationTemplate(templateId);
    if (!template) return;
    const inputs: CreationInputs = {};
    if (analysis.headings.length) inputs[STRUCTURE_INPUT_KEY] = analysis.headings.join("\n");
    if (templateId === "lesson") {
      for (const [key, value] of Object.entries(analysis.curriculumFields)) {
        if (value) inputs[key] = value;
      }
      if (!inputs.indicator && analysis.indicatorCodes.length) inputs.indicator = analysis.indicatorCodes[0]!;
    }
    const sourceReferences: SourceReference[] = [
      {
        kind: "importedReference",
        title: "Reference document supplied by user (structure only)",
        usedAs: "structure",
      },
    ];
    if (templateId === "lesson" && Object.keys(inputs).some((key) => key !== STRUCTURE_INPUT_KEY)) {
      inputs.curriculumIssuer = "Ghana Education Service / Ministry of Education (CCP)";
    }
    setText("");
    onStart({ templateId, inputs, sourceReferences });
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All templates
      </button>
      <h3 className="text-lg font-semibold text-foreground">Use a reference for structure</h3>
      <p className="mt-1 text-sm text-muted">{REFERENCE_TRANSFORMATION_NOTICE}</p>

      <div className="mt-4 space-y-3">
        <label htmlFor="reference-text" className="block text-sm font-medium text-foreground">
          Paste the reference text
        </label>
        <textarea
          id="reference-text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setAnalysis(null);
          }}
          rows={8}
          placeholder="Paste a scheme of learning, lesson note, research outline, CV layout…"
          className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => analyse(text)}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            Analyse structure
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground"
          >
            <FileText className="h-4 w-4" aria-hidden />
            Open .txt file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      {analysis ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-border p-4" aria-live="polite">
          <p className="text-sm text-foreground">
            Detected:{" "}
            <strong>
              {analysis.documentType === "unknown"
                ? "document type not recognised"
                : getCreationTemplate(analysis.documentType)?.label}
            </strong>{" "}
            · {analysis.wordCount.toLocaleString()} words
          </p>

          {analysis.personalDataFound.length ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              This reference contains{" "}
              {analysis.personalDataFound.map((kind) => PERSONAL_DATA_LABELS[kind]).join(", ")}. Giga3 will not copy
              any personal details — you enter your own when building.
            </p>
          ) : null}

          <div>
            <p className="text-sm font-medium text-foreground">Structure found</p>
            {analysis.headings.length ? (
              <ol className="mt-1 list-decimal pl-5 text-sm text-muted">
                {analysis.headings.map((heading) => (
                  <li key={heading}>{heading}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-sm text-muted">
                No standard section headings found. Giga3 will use the template&apos;s own structure.
              </p>
            )}
          </div>

          {Object.keys(analysis.curriculumFields).length || analysis.indicatorCodes.length ? (
            <div>
              <p className="text-sm font-medium text-foreground">Curriculum references</p>
              <ul className="mt-1 space-y-0.5 text-sm text-muted">
                {Object.entries(analysis.curriculumFields).map(([key, value]) => (
                  <li key={key}>
                    {key === "subStrand" ? "Sub-strand" : key === "contentStandard" ? "Content standard" : key[0]!.toUpperCase() + key.slice(1)}
                    : {value}
                  </li>
                ))}
                {analysis.indicatorCodes.length ? <li>Codes: {analysis.indicatorCodes.join(", ")}</li> : null}
              </ul>
            </div>
          ) : null}

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Create</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CREATION_TEMPLATES.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  aria-pressed={templateId === candidate.id}
                  onClick={() => setTemplateId(candidate.id)}
                  className={cn(
                    "min-h-11 rounded-full border px-3 text-sm",
                    templateId === candidate.id
                      ? "border-accent bg-accent/10 font-semibold text-foreground"
                      : "border-border text-muted"
                  )}
                >
                  {candidate.emoji} {candidate.label}
                </button>
              ))}
            </div>
          </fieldset>

          <button
            type="button"
            onClick={start}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
          >
            Create an original version from this structure
          </button>
        </div>
      ) : null}
    </div>
  );
}
