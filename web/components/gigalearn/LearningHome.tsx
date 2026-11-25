"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useState } from "react";
import { CURRICULUM_LEVELS } from "@/lib/gigalearn/curriculumEngine";
import { LEARNING_WORLDS } from "@/lib/gigalearn/learningWorlds";
import { getSessionToken } from "@/lib/auth";
import { offlineProgressOwner } from "@/lib/gigalearn/offlineProgressOwner";
import { loadWorldReview } from "@/lib/gigalearn/worldReview";
import { saveStudioContext } from "@/lib/gigalearn/studioContext";
import { getProgressSnapshot } from "@/lib/gigalearn/workspace";

const bands = [
  ["early-years", "Early Years"],
  ["primary", "Basic 1–6"],
  ["jhs", "JHS"],
  ["shs", "SHS"],
] as const;

const worldArt = {
  discovery: ["early-years", "green"],
  foundation: ["primary", "blue"],
  exploration: ["materials", "violet"],
  mastery: ["jhs", "gold"],
} as const;

const destinations = [
  [
    "GigaLearn Academy",
    "Courses and certificates",
    "/gigalearn/academy/",
    "course",
  ],
  [
    "Teacher Dashboard",
    "Plan lessons and manage classes",
    "/gigalearn/?tab=teacher",
    "teacher",
  ],
  [
    "Creator Tools",
    "Create educational content",
    "/gigalearn/?tab=create",
    "creator",
  ],
  ["Document templates", "CVs, posters, flyers and cover letters", "/documents/#template-library", "certificate"],
  ["AI Tutor", "Get help with a subject", "/gigalearn/?tab=tutor", "tutor"],
  [
    "Teaching materials",
    "Charts, worksheets and practical guides",
    "/gigalearn/resources/",
    "materials",
  ],
  [
    "Practice",
    "BECE, WASSCE and Teacher Promotion",
    "/gigalearn/exam/",
    "exam",
  ],
  ["Parent", "View learning activities", "/gigalearn/?tab=parent"],
  ["Insights", "Explore learning progress", "/gigalearn/?tab=insight"],
];

export function LearningHome() {
  const [query, setQuery] = useState("");
  const [band, setBand] = useState("");
  const progress = getProgressSnapshot();
  const owner = offlineProgressOwner(getSessionToken());
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
      <Link href="/gigalearn/?tab=my-learning" className="learning-progress gigalearn-focus">
        <strong>Your learning progress</strong>
        <span>
          {progress.quizzesCompleted} quizzes completed
        </span>
      </Link>
      {!search && (
        <section aria-labelledby="learning-worlds-heading" className="space-y-3">
          <h3 id="learning-worlds-heading" className="text-lg font-bold">Learning worlds</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEARNING_WORLDS.map((world) => {
              const review = owner ? loadWorldReview(owner, world.id) : null;
              const [photo, tone] = worldArt[world.id];
              return (
                <Link
                  key={world.id}
                  href={`/gigalearn/?world=${world.id}`}
                  className="gigalearn-world-link gigalearn-focus"
                  data-learn-tone={tone}
                >
                  <span className="gigalearn-world-text">
                    <strong className="text-lg leading-tight">{world.title}</strong>
                    <span className="text-xs font-semibold">{world.grades}</span>
                    <span className="text-sm">{world.activity}</span>
                    {review && review.dueAt <= Date.now() && (
                      <span className="text-sm font-bold">Review due</span>
                    )}
                  </span>
                  <img src={`/images/interface/${photo}.webp`} alt="" width="128" height="112" />
                  <ArrowUpRight className="gigalearn-world-arrow h-4 w-4" aria-hidden />
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <h3 className="text-lg font-bold">Explore by level</h3>
      {!search && (
        <div className="level-cards">
          {bands.map(([id, label]) => (
            <button
              type="button"
              key={id}
              className="gigalearn-focus"
              aria-pressed={band === id}
              onClick={() => setBand(id)}
            >
              <span className="gigalearn-level-label">
                {label}
                {band === id && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              </span>
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
            className="gigalearn-focus"
            aria-pressed={band === "university"}
            onClick={() => setBand("university")}
          >
            <span className="gigalearn-level-label">
              University
              {band === "university" && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </span>
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
              className="gigalearn-control px-3 py-2 text-sm"
              data-learn-tone={level.band === "early-years" ? "green" : level.band === "jhs" ? "violet" : "blue"}
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
        {tools.map(([name, detail, href, illustration]) => (
          <Link
            key={href}
            href={href}
            className={illustration ? "illustrated-tool gigalearn-focus" : "gigalearn-focus"}
          >
            {illustration && (
              <img
                loading="lazy"
                alt=""
                width="68"
                height="60"
                src={`/images/interface/${illustration}.webp`}
              />
            )}
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
        className="certificate-banner gigalearn-control gigalearn-control--primary w-full px-4 py-3"
        data-learn-tone="violet"
        href="/gigalearn/academy/certificates/"
      >
        View my certificates →
      </Link>
    </section>
  );
}
