"use client";

import Link from "next/link";
import { useState } from "react";
import { CURRICULUM_LEVELS } from "@/lib/gigalearn/curriculumEngine";
import { saveStudioContext } from "@/lib/gigalearn/studioContext";
import { getProgressSnapshot } from "@/lib/gigalearn/workspace";

const bands = [
  ["early-years", "Early Years"],
  ["primary", "Basic 1–6"],
  ["jhs", "JHS"],
  ["shs", "SHS"],
] as const;

const destinations = [
  ["GigaLearn Academy", "Courses and certificates", "/gigalearn/academy/"],
  [
    "Teacher Dashboard",
    "Plan lessons and manage classes",
    "/gigalearn/?tab=teacher",
  ],
  ["Creator Tools", "Create educational content", "/gigalearn/?tab=create"],
  ["AI Tutor", "Get help with a subject", "/gigalearn/?tab=tutor"],
  [
    "Teaching materials",
    "Charts, worksheets and practical guides",
    "/gigalearn/resources/",
  ],
  ["Practice", "BECE, WASSCE and Teacher Promotion", "/gigalearn/exam/"],
  ["Parent", "View learning activities", "/gigalearn/?tab=parent"],
  ["Insights", "Explore learning progress", "/gigalearn/?tab=insight"],
];

export function LearningHome() {
  const [query, setQuery] = useState("");
  const [band, setBand] = useState("");
  const progress = getProgressSnapshot();
  const search = query.trim().toLowerCase();
  const tools = destinations.filter(([name, detail]) =>
    (name + " " + detail).toLowerCase().includes(search),
  );
  const levels = CURRICULUM_LEVELS.filter((level) =>
    search
      ? (level.label + " " + level.bandLabel).toLowerCase().includes(search)
      : level.band === band,
  );

  return (
    <section className="learning-home mx-auto max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold">Welcome to GigaLearn</h2>
      <input
        type="search"
        aria-label="Search levels and tools"
        placeholder="Search levels and tools…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-full border border-violet-300 bg-card px-4 py-3"
      />
      <Link href="/gigalearn/?tab=my-learning" className="learning-progress">
        <strong>Your learning progress</strong>
        <span>
          {progress.streakDays}-day streak · {progress.quizzesCompleted} quizzes
          completed
        </span>
      </Link>
      <h3 className="text-lg font-bold">Explore by level</h3>
      {!search && (
        <div className="level-cards">
          {bands.map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-pressed={band === id}
              onClick={() => setBand(id)}
            >
              {label}
              <img
                alt=""
                src={"/images/interface/" + id + ".webp"}
                width="128"
                height="112"
              />
            </button>
          ))}
          <button
            type="button"
            aria-pressed={band === "university"}
            onClick={() => setBand("university")}
          >
            University
            <img
              alt=""
              src="/images/interface/academy.webp"
              width="128"
              height="112"
            />
          </button>
        </div>
      )}
      {((band === "university" && !search) ||
        (search && "university".includes(search))) && (
        <div className="learning-tools">
          <Link href="/gigalearn/academy/courses/">
            <strong>University study</strong>
            <span>Browse professional courses</span>
          </Link>
          <Link href="/gigalearn/?tab=tutor">
            <strong>Study with AI Tutor</strong>
            <span>Discuss a university topic</span>
          </Link>
        </div>
      )}
      {levels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <a
              key={level.id}
              className="rounded-xl border border-violet-300 px-3 py-3 text-sm font-semibold"
              href={
                "/gigalearn/?tab=" +
                (level.band === "early-years" ? "early-years" : "learn")
              }
              onClick={() =>
                saveStudioContext({
                  countryId: "ghana",
                  curriculumId: level.curriculumId,
                  levelId: level.id,
                  subjectId: "",
                  strand: "",
                  subStrand: "",
                  topic: "",
                })
              }
            >
              {level.label}
            </a>
          ))}
        </div>
      )}
      <h3 className="text-lg font-bold">Workspaces &amp; tools</h3>
      <div className="learning-tools">
        {tools.map(([name, detail, href]) => (
          <Link key={href} href={href}>
            <strong>{name}</strong>
            <span>{detail}</span>
          </Link>
        ))}
      </div>
      {search &&
        !levels.length &&
        !tools.length &&
        !"university".includes(search) && (
          <p role="status">No matching levels or tools.</p>
        )}
      <Link
        className="block rounded-xl bg-violet-800 p-4 font-semibold text-white"
        href="/gigalearn/academy/certificates/"
      >
        View my certificates →
      </Link>
    </section>
  );
}
