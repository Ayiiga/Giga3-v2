"use client";

import { Button } from "@/components/ui/Button";
import {
  getProgressSnapshot,
  listArtifacts,
  listPromptHistory,
  removeArtifact,
  toggleArtifactFavorite,
  type LearningArtifact,
} from "@/lib/gigalearn/workspace";
import { getGigaLearnTool } from "@/lib/gigalearn/tools";
import { getGigaLearnProfile } from "@/lib/gigalearn/profile";
import { cn } from "@/lib/utils";
import { Award, Copy, Star, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";

export const GigaLearnWorkspacePanel = memo(function GigaLearnWorkspacePanel() {
  const [artifacts, setArtifacts] = useState<LearningArtifact[]>([]);
  const [prompts, setPrompts] = useState(() => listPromptHistory());
  const [progress, setProgress] = useState(() => getProgressSnapshot());
  const [profile, setProfile] = useState(() => getGigaLearnProfile());
  const [filter, setFilter] = useState<"all" | "favorites" | "quiz" | "notes" | "study-plan">(
    "all"
  );

  const refresh = useCallback(() => {
    setArtifacts(listArtifacts());
    setPrompts(listPromptHistory());
    setProgress(getProgressSnapshot());
    setProfile(getGigaLearnProfile());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = artifacts.filter((a) => {
    if (filter === "favorites") return a.favorite;
    if (filter === "all") return true;
    return a.kind === filter;
  });

  const topSubjects = Object.entries(progress.subjectsStudied)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Materials created" value={String(progress.totalGenerations)} />
        <StatCard label="Learning streak" value={`${progress.streakDays} day${progress.streakDays === 1 ? "" : "s"}`} />
        <StatCard label="Quizzes" value={String(progress.quizzesCompleted)} />
        <StatCard label="Study plans" value={String(progress.studyPlansCreated)} />
      </div>

      <div className="saas-card rounded-2xl border border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Learner profile</h3>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Role</dt>
            <dd className="font-medium capitalize text-foreground">{profile.role}</dd>
          </div>
          <div>
            <dt className="text-muted">Curriculum</dt>
            <dd className="font-medium uppercase text-foreground">{profile.examBoard}</dd>
          </div>
          <div>
            <dt className="text-muted">Level</dt>
            <dd className="font-medium text-foreground">{profile.level.replace(/-/g, " ")}</dd>
          </div>
          <div>
            <dt className="text-muted">Focus subjects</dt>
            <dd className="font-medium text-foreground">
              {profile.subjects.length ? profile.subjects.join(", ") : "Not set"}
            </dd>
          </div>
        </dl>
        {topSubjects.length > 0 && (
          <p className="mt-3 text-xs text-muted">
            Most studied: {topSubjects.map(([s, n]) => `${s} (${n})`).join(", ")}
          </p>
        )}
      </div>

      {progress.achievements.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Award className="h-4 w-4 text-accent" aria-hidden />
            Achievements
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {progress.achievements.map((a) => (
              <li
                key={a.id}
                className="saas-card rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <p className="font-medium text-foreground">{a.label}</p>
                <p className="text-xs text-muted">{a.description}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "favorites", "quiz", "notes", "study-plan"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
              filter === id
                ? "border-accent/40 bg-accent/10 text-foreground"
                : "border-border text-muted"
            )}
          >
            {id.replace("-", " ")}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="saas-card rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            No saved learning materials yet. Generate quizzes, lesson notes, or study plans to build your history.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id} className="saas-card rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                    {item.favorite && (
                      <Star className="ml-1 inline h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(item.createdAt).toLocaleString()} · {item.kind}
                    {item.subject ? ` · ${item.subject}` : ""}
                    {item.curriculum ? ` · ${item.curriculum.toUpperCase()}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void navigator.clipboard.writeText(item.content)}
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      toggleArtifactFavorite(item.id);
                      refresh();
                    }}
                  >
                    <Star className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeArtifact(item.id);
                      refresh();
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-foreground">
                {item.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {prompts.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Recent prompts</h3>
          <ul className="space-y-2">
            {prompts.slice(0, 8).map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-white px-3 py-2 text-xs text-muted"
              >
                <span className="font-medium text-foreground">
                  {getGigaLearnTool(p.toolId)?.label ?? p.toolId}
                </span>
                <p className="mt-1 line-clamp-2">{p.prompt}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
});

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="saas-card rounded-2xl border border-border px-4 py-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
