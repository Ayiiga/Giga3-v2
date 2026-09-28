"use client";

import {
  applyCurriculumChange,
  applyLevelChange,
  bandLabel,
  CURRICULUM_COUNTRIES,
  getCountry,
  getCurriculaForCountry,
  getCurriculum,
  getLevel,
  getLevelsForCurriculum,
  getSubject,
  getSubjectsForLevel,
  resolveLegacyLevelId,
  selectionSummary,
  type CurriculumSelection,
} from "@/lib/gigalearn/curriculumEngine";
import { useMemo, useState } from "react";

interface CurriculumSelectorProps {
  value: CurriculumSelection;
  onChange: (next: CurriculumSelection, notice: string | null) => void;
  idPrefix?: string;
}

const SELECT_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2 min-h-11";
const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-foreground outline-none ring-accent/20 focus:ring-2";
const LABEL_CLASS = "mb-1.5 block text-xs font-medium text-muted";

/**
 * Progressive curriculum hierarchy: Country → Curriculum → Level → Subject
 * → Strand → Sub-strand → Topic. Each step only offers valid options for the
 * previous step; changing Level/Curriculum clears incompatible selections so
 * invalid combinations (e.g. JHS + KG) can never persist.
 */
export function CurriculumSelector({ value, onChange, idPrefix = "gl-curriculum" }: CurriculumSelectorProps) {
  const [subjectQuery, setSubjectQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const curricula = useMemo(() => getCurriculaForCountry(value.countryId), [value.countryId]);
  const levels = useMemo(() => getLevelsForCurriculum(value.curriculumId), [value.curriculumId]);
  const subjects = useMemo(() => getSubjectsForLevel(value.levelId), [value.levelId]);
  const subject = getSubject(value.subjectId);

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => s.label.toLowerCase().includes(q));
  }, [subjects, subjectQuery]);

  const showSubjectSearch = subjects.length > 8;
  const summary = selectionSummary(value);

  function emit(next: CurriculumSelection, message: string | null) {
    setNotice(message);
    onChange(next, message);
  }

  function handleCountry(countryId: string) {
    const available = CURRICULUM_COUNTRIES.find((c) => c.id === countryId)?.available;
    if (!available) return;
    const nextCurricula = getCurriculaForCountry(countryId);
    const nextCurriculumId = nextCurricula.some((c) => c.id === value.curriculumId)
      ? value.curriculumId
      : (nextCurricula[0]?.id ?? "");
    const nextLevels = getLevelsForCurriculum(nextCurriculumId).map((l) => l.id);
    const canonicalLevel = resolveLegacyLevelId(value.levelId);
    const keepLevel = nextLevels.includes(canonicalLevel);
    emit(
      {
        ...value,
        countryId,
        curriculumId: nextCurriculumId,
        levelId: keepLevel ? canonicalLevel : "",
        subjectId: keepLevel ? value.subjectId : "",
      },
      keepLevel ? null : "Level and subject were reset for the new country."
    );
  }

  function handleCurriculum(curriculumId: string) {
    const { selection, notice: message } = applyCurriculumChange(value, curriculumId);
    emit(selection, message);
  }

  function handleLevel(levelId: string) {
    const { selection, notice: message } = applyLevelChange(value, levelId);
    setSubjectQuery("");
    emit(selection, message);
  }

  function handleSubject(subjectId: string) {
    emit({ ...value, subjectId }, null);
  }

  // Group levels by band for the level dropdown.
  const levelGroups = useMemo(() => {
    const groups = new Map<string, typeof levels>();
    for (const level of levels) {
      const label = level.bandLabel || bandLabel(level.band);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(level);
    }
    return [...groups.entries()];
  }, [levels]);

  return (
    <div className="space-y-3">
      {summary.length > 0 && (
        <p
          className="rounded-xl border border-accent/25 bg-accent/5 px-3 py-2 text-xs font-medium text-foreground"
          aria-live="polite"
        >
          {summary.join(" · ")}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-country`} className={LABEL_CLASS}>
            Country
          </label>
          <select
            id={`${idPrefix}-country`}
            value={value.countryId}
            onChange={(e) => handleCountry(e.target.value)}
            className={SELECT_CLASS}
          >
            {CURRICULUM_COUNTRIES.map((c) => (
              <option key={c.id} value={c.id} disabled={!c.available}>
                {c.flag} {c.name}
                {c.available ? "" : " (coming soon)"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-curriculum`} className={LABEL_CLASS}>
            Curriculum
          </label>
          <select
            id={`${idPrefix}-curriculum`}
            value={value.curriculumId}
            onChange={(e) => handleCurriculum(e.target.value)}
            className={SELECT_CLASS}
          >
            {curricula.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-level`} className={LABEL_CLASS}>
            Level
          </label>
          <select
            id={`${idPrefix}-level`}
            value={resolveLegacyLevelId(value.levelId)}
            onChange={(e) => handleLevel(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Select level…</option>
            {levelGroups.map(([group, groupLevels]) => (
              <optgroup key={group} label={group}>
                {groupLevels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-subject`} className={LABEL_CLASS}>
            Subject
          </label>
          <select
            id={`${idPrefix}-subject`}
            value={value.subjectId}
            onChange={(e) => handleSubject(e.target.value)}
            className={SELECT_CLASS}
            disabled={!value.levelId}
          >
            <option value="">{value.levelId ? "Select subject…" : "Select a level first…"}</option>
            {filteredSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.label}
              </option>
            ))}
          </select>
          {showSubjectSearch && value.levelId && (
            <input
              type="search"
              value={subjectQuery}
              onChange={(e) => setSubjectQuery(e.target.value)}
              placeholder="Search subjects…"
              aria-label="Search subjects"
              className={`${INPUT_CLASS} mt-2`}
            />
          )}
        </div>
      </div>

      {notice && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          {notice}
        </p>
      )}

      {subject?.availabilityNote && value.levelId && (
        <p className="text-xs text-muted" role="note">
          {subject.availabilityNote}
        </p>
      )}

      {/* Strand → sub-strand → topic load dynamically once a subject is set. */}
      {value.subjectId && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`${idPrefix}-strand`} className={LABEL_CLASS}>
              Strand
            </label>
            <input
              id={`${idPrefix}-strand`}
              value={value.strand}
              onChange={(e) => emit({ ...value, strand: e.target.value }, null)}
              placeholder="e.g. from your NaCCA curriculum"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-substrand`} className={LABEL_CLASS}>
              Sub-strand
            </label>
            <input
              id={`${idPrefix}-substrand`}
              value={value.subStrand}
              onChange={(e) => emit({ ...value, subStrand: e.target.value }, null)}
              placeholder="e.g. sub-strand (optional)"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-topic`} className={LABEL_CLASS}>
              Topic
            </label>
            <input
              id={`${idPrefix}-topic`}
              value={value.topic}
              onChange={(e) => emit({ ...value, topic: e.target.value }, null)}
              placeholder="e.g. States of matter"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      )}

      {subject?.structuredPath && value.subjectId && (
        <p className="text-xs text-muted">
          Structure: {subject.structuredPath.join(" → ")}. Enter the strand and sub-strand from
          your NaCCA curriculum — Giga3 will not invent official standards.
        </p>
      )}

      <CurriculumSelectorMeta
        countryId={value.countryId}
        curriculumId={value.curriculumId}
        levelId={value.levelId}
      />
    </div>
  );
}

/** Hidden accessibility metadata (kept out of the visual flow). */
function CurriculumSelectorMeta({
  countryId,
  curriculumId,
  levelId,
}: {
  countryId: string;
  curriculumId: string;
  levelId: string;
}) {
  const country = getCountry(countryId);
  const curriculum = getCurriculum(curriculumId);
  const level = getLevel(resolveLegacyLevelId(levelId));
  return (
    <span className="sr-only" aria-live="polite">
      {country ? `${country.flag} ${country.name}. ` : ""}
      {curriculum ? `${curriculum.label}. ` : ""}
      {level ? `${level.label}.` : ""}
    </span>
  );
}

export type { CurriculumSelection };
