"use client";

import {
  ANANSE_POEM,
  CONCRETE_CATEGORIES,
  CONCRETE_QUIZZES,
  FRUIT_GAME,
  FRUIT_POLL,
  FRUIT_QA,
  FRUIT_RHYMES,
  GES_STRANDS,
  GIGALEARN_VOICES,
  OFFLINE_BANNER,
  checkConcreteAnswer,
  getGigaLearnVoice,
  lessonPreviewForLevel,
  previewGigaLearnVoice,
} from "@/lib/gigalearn/concreteObjects";
import { GIGALEARN_LEVELS, isLowerGrade, type GigaLearnLevelId } from "@/lib/gigalearn/levels";
import { listOfflineLessons } from "@/lib/gigalearn/offlineLessons";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

const CONCRETE_BADGE = "bg-[#3B82F6] text-white";
const TOUCH_SEE_BADGE = "bg-[#10B981] text-white";

export function LowerGradesConcrete() {
  const [selectedLevel, setSelectedLevel] = useState<GigaLearnLevelId>("KG1");
  const lower = isLowerGrade(selectedLevel);
  const preview = useMemo(() => lessonPreviewForLevel(selectedLevel), [selectedLevel]);
  const previewVoice = getGigaLearnVoice(preview.voiceId);

  return (
    <div className="space-y-5">
      <LevelSelector selectedLevel={selectedLevel} onChange={setSelectedLevel} />

      {lower ? (
        <section aria-labelledby="gl-real-things">
          <div className="mb-2 flex items-center gap-2">
            <h3 id="gl-real-things" className="text-base font-bold text-white">
              Learn with Real Things
            </h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", TOUCH_SEE_BADGE)}>
              Touch &amp; See
            </span>
          </div>
          <div className="space-y-4">
            {CONCRETE_CATEGORIES.map((cat) => (
              <div key={cat.id}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {cat.title}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {cat.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[20px] border border-[#2A3441] bg-[#1A233A] p-4"
                    >
                      <span className="text-[32px] leading-none" aria-hidden>
                        {item.emoji}
                      </span>
                      <p className="mt-2 text-sm font-bold text-white">{item.title}</p>
                      <p className="text-[11px] text-gray-400">{item.subtitle}</p>
                      <span
                        className={cn(
                          "mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
                          CONCRETE_BADGE
                        )}
                      >
                        {cat.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4 text-xs text-gray-300">
          {selectedLevel} uses curriculum mode (BECE / WASSCE prep, study plans, past questions).
          Switch to Creche–P3 for concrete objects, fruits, and real items.
        </p>
      )}

      <LearningModes level={selectedLevel} lower={lower} />
      <LessonPreviewCard level={selectedLevel} lower={lower} />
      <VoicesSection previewVoiceId={preview.voiceId} />
      <GesSection />
      <OfflineBanner />
    </div>
  );
}

function LevelSelector({
  selectedLevel,
  onChange,
}: {
  selectedLevel: GigaLearnLevelId;
  onChange: (level: GigaLearnLevelId) => void;
}) {
  return (
    <section aria-labelledby="gl-level">
      <h3 id="gl-level" className="mb-2 text-sm font-bold text-white">
        Select level
      </h3>
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1"
          role="tablist"
          aria-label="Learning levels"
        >
          {GIGALEARN_LEVELS.map((level) => {
            const active = level.id === selectedLevel;
            return (
              <button
                key={level.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(level.id)}
                title={`${level.label} · ages ${level.ages}`}
                className={cn(
                  "min-h-12 min-w-12 shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition-all",
                  active
                    ? "scale-105 border-[#FCD116]/50 bg-gradient-to-br from-[#FCD116] to-[#CE1126] font-extrabold text-black shadow-[0_0_20px_rgba(252,209,22,0.5)]"
                    : "border-[#2A3441] bg-[#1A233A] text-gray-300 hover:border-[#3A4A61] hover:text-white"
                )}
              >
                {level.emoji} {level.label}
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/60 to-transparent"
          aria-hidden
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-400">
        Showing: {selectedLevel}
        {isLowerGrade(selectedLevel) ? " · concrete objects, fruits & real items" : " · curriculum mode"}
      </p>
    </section>
  );
}

function LearningModes({ level, lower }: { level: GigaLearnLevelId; lower: boolean }) {
  const [quizIndex, setQuizIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [gamePicked, setGamePicked] = useState<string | null>(null);
  const [pollVote, setPollVote] = useState<string | null>(null);
  const [rhymePlaying, setRhymePlaying] = useState<string | null>(null);
  const [qaOpen, setQaOpen] = useState(false);

  const quiz = CONCRETE_QUIZZES[quizIndex % CONCRETE_QUIZZES.length];
  const quizCorrect = picked !== null && checkConcreteAnswer(quiz, picked);
  const gameTarget = FRUIT_GAME.fruits[quizIndex % FRUIT_GAME.fruits.length];
  const gameWon = gamePicked !== null && gamePicked === gameTarget;

  function nextQuiz() {
    setQuizIndex((i) => (i + 1) % CONCRETE_QUIZZES.length);
    setPicked(null);
  }

  function playRhyme(id: string, text: string) {
    setRhymePlaying(id);
    previewGigaLearnVoice(text);
    window.setTimeout(() => setRhymePlaying(null), 4000);
  }

  if (!lower) return null;

  return (
    <section aria-label="Learning modes with concrete objects" className="space-y-3">
      {/* Recommendations */}
      <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
        <p className="text-xs font-bold text-white">
          <span className="mr-1.5 rounded-full bg-[#10B981] px-2 py-0.5 text-[10px] text-white">
            For You
          </span>
          For {level}: start with 3 fruits
        </p>
        <span className="mt-2 inline-block rounded-full bg-[#EAB308] px-2.5 py-1 text-[10px] font-bold text-black">
          AI STUDIO
        </span>
      </div>

      {/* Practices */}
      <div className="rounded-2xl border border-[#EAB308] bg-[#1A233A] p-4">
        <p className="text-xs font-bold text-white">Practice · Touch 3 apples and count</p>
        <p className="mt-1 text-2xl" aria-hidden>
          🍎🍎🍎
        </p>
        <span className="mt-2 inline-block rounded-full border border-[#EAB308] px-2.5 py-1 text-[10px] font-bold text-[#EAB308]">
          ON DEVICE
        </span>
      </div>

      {/* Quizzes — concrete images, 1–5 range for KG, offline */}
      <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-white">{quiz.question}</p>
          <span className="rounded-full border border-[#EAB308] px-2 py-0.5 text-[10px] font-bold text-[#EAB308]">
            ON DEVICE
          </span>
        </div>
        <p className="mt-1 text-3xl" aria-hidden>
          {quiz.concreteRow.join("")}
        </p>
        <div className="mt-2 flex gap-2">
          {quiz.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setPicked(opt)}
              className={cn(
                "min-h-12 min-w-12 rounded-xl border px-3 py-2 text-sm font-bold",
                picked === opt
                  ? opt === quiz.answer
                    ? "border-[#10B981] bg-[#10B981] text-white"
                    : "border-red-400 bg-red-400 text-white"
                  : "border-[#2A3441] bg-[#0D1323] text-white"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
        {picked !== null ? (
          <div className="mt-2 flex items-center justify-between">
            <p className={cn("text-xs font-bold", quizCorrect ? "text-[#10B981]" : "text-red-300")}>
              {quizCorrect ? `Correct! ${quiz.answer} — well done! 🎉` : "Try again — count slowly: 1, 2, 3…"}
            </p>
            <button
              type="button"
              onClick={nextQuiz}
              className="min-h-11 rounded-xl bg-[#EAB308] px-3 py-1.5 text-xs font-bold text-black"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {/* Games — fruit matching with LIVE dot */}
      <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold text-white">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" aria-hidden />
          LIVE · Game · {FRUIT_GAME.prompt}
        </p>
        <p className="mt-1 text-[11px] text-gray-400">Tap: {gameTarget}</p>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex gap-2">
            {FRUIT_GAME.fruits.map((fruit) => (
              <button
                key={fruit}
                type="button"
                aria-label={`Pick ${fruit}`}
                onClick={() => setGamePicked(fruit)}
                className={cn(
                  "min-h-12 min-w-12 rounded-xl border p-2 text-2xl",
                  gamePicked === fruit
                    ? fruit === gameTarget
                      ? "border-[#10B981] bg-[#10B981]/20"
                      : "border-red-400 bg-red-400/20"
                    : "border-[#2A3441] bg-[#0D1323]"
                )}
              >
                {fruit}
              </button>
            ))}
          </div>
          <span className="text-3xl" aria-label="Basket">
            {FRUIT_GAME.basket}
          </span>
        </div>
        {gamePicked !== null ? (
          <p className={cn("mt-2 text-xs font-bold", gameWon ? "text-[#10B981]" : "text-red-300")}>
            {gameWon ? "Fruit matched — into the basket! 🧺" : "Not that one — try again!"}
          </p>
        ) : null}
        <div className="mt-3 border-t border-[#2A3441] pt-3">
          <p className="text-xs font-bold text-white">Poll · {FRUIT_POLL.question}</p>
          <div className="mt-1.5 flex gap-2">
            {FRUIT_POLL.options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setPollVote(opt)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-1.5 text-xs font-bold",
                  pollVote === opt
                    ? opt === FRUIT_POLL.answer
                      ? "border-[#10B981] bg-[#10B981] text-white"
                      : "border-red-400 bg-red-400 text-white"
                    : "border-[#2A3441] bg-[#0D1323] text-white"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          {pollVote !== null ? (
            <p className={cn("mt-1.5 text-xs font-bold", pollVote === FRUIT_POLL.answer ? "text-[#10B981]" : "text-red-300")}>
              {pollVote === FRUIT_POLL.answer ? "Yes! Banana is yellow! 🍌" : "Look again — which one is yellow?"}
            </p>
          ) : null}
        </div>
      </div>

      {/* Rhymes — Twi + African voice, ON DEVICE */}
      <div className="space-y-2">
        {FRUIT_RHYMES.map((rhyme) => (
          <div key={rhyme.id} className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-white">Rhyme · {rhyme.title}</p>
              <button
                type="button"
                aria-label={`Play ${rhyme.title}`}
                onClick={() => playRhyme(rhyme.id, `${rhyme.title}. ${rhyme.linesEn.join(" ")}`)}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-[#EAB308] text-lg font-bold text-black"
              >
                {rhymePlaying === rhyme.id ? "⏸" : "▶️"}
              </button>
            </div>
            {rhyme.linesEn.map((line, i) => (
              <p key={i} className="mt-1 text-xs text-gray-200">
                {line}
              </p>
            ))}
            {rhyme.linesTwi.map((line, i) => (
              <p key={i} className="text-xs text-gray-400">
                {line}
              </p>
            ))}
            <p className="mt-1.5 text-[11px] text-gray-400">
              {rhyme.voiceLabel} ·{" "}
              <span className="rounded-full border border-[#EAB308] px-1.5 py-0.5 text-[10px] font-bold text-[#EAB308]">
                ON DEVICE
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Poems — Ananse with concrete objects */}
      <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
        <p className="text-xs font-bold text-white">Poem · {ANANSE_POEM.title} 🕷️🥭</p>
        {ANANSE_POEM.lines.map((line, i) => (
          <p key={i} className="mt-1 text-xs text-gray-200">
            {line}
          </p>
        ))}
      </div>

      {/* Songs — Twi voiceover + teleprompter badge */}
      <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
        <p className="text-xs font-bold text-white">Song · I Like Bananas 🍌🎵</p>
        <p className="mt-1 text-xs text-gray-200">I like bananas, yes I do — with Twi voiceover!</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[#EAB308] px-2 py-0.5 text-[10px] font-bold text-black">
            AI STUDIO
          </span>
          <span className="rounded-full border border-[#EAB308] px-2 py-0.5 text-[10px] font-bold text-[#EAB308]">
            Teleprompter Top 25%
          </span>
        </div>
      </div>

      {/* Q&A — fruit image + voice */}
      <div className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-4">
        <p className="text-xs font-bold text-white">
          Q&amp;A · {FRUIT_QA.question} <span className="text-2xl">{FRUIT_QA.emoji}</span>
        </p>
        {!qaOpen ? (
          <button
            type="button"
            onClick={() => {
              setQaOpen(true);
              previewGigaLearnVoice(`What color is an orange? ${FRUIT_QA.answer}`);
            }}
            className="mt-2 min-h-11 rounded-xl bg-[#EAB308] px-3 py-1.5 text-xs font-bold text-black"
          >
            Hear &amp; reveal answer 🔊
          </button>
        ) : (
          <p className="mt-2 text-sm font-bold text-[#10B981]">{FRUIT_QA.answer} 🍊</p>
        )}
      </div>
    </section>
  );
}

function LessonPreviewCard({ level, lower }: { level: GigaLearnLevelId; lower: boolean }) {
  // Upper levels (P4-P6, JHS, SHS, University, Adult) have no concrete preview:
  // lessonPreviewForLevel falls back to the KG1 fruit card, which must never
  // render outside Creche–P3 (SHS showing 🍎🍎🍎 was a level leak).
  if (!lower) return null;
  const preview = lessonPreviewForLevel(level);
  const voice = getGigaLearnVoice(preview.voiceId);

  return (
    <section aria-label="Lesson preview" className="rounded-2xl border border-[#EAB308] bg-[#1E293B] p-4">
      <p className="text-sm font-bold text-white">{preview.title}</p>
      <p className="mt-2 text-3xl tracking-wide" aria-label={preview.concreteAnswer}>
        {preview.concreteRow.join(" ")} <span className="text-xl font-bold text-white">{preview.concreteAnswer}</span>
      </p>
      <p className="mt-2 text-xs text-white">{preview.textEn}</p>
      <p className="text-xs text-gray-400">{preview.textTwi}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Play ${voice?.name ?? "teacher"} voice`}
          onClick={() => previewGigaLearnVoice(`${preview.textEn}. ${preview.concreteAnswer}`)}
          className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-[#EAB308] text-base font-bold text-black"
        >
          ▶️
        </button>
        <p className="text-[11px] text-gray-300">
          Voice {voice?.name} · {voice?.language} {voice?.flag}
        </p>
      </div>
      <p className="mt-2 rounded-xl border border-[#EAB308]/50 bg-black/30 p-2 text-[10px] font-bold text-[#EAB308]">
        {preview.teleprompterNote}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="min-h-11 rounded-xl bg-[#EAB308] px-3 py-2 text-xs font-bold text-black">
          {preview.quizLabel}
        </span>
        <span className="min-h-11 rounded-xl bg-white px-3 py-2 text-xs font-bold text-black">
          Game · Match fruits
        </span>
        <span className="min-h-11 rounded-xl border border-[#2A3441] px-3 py-2 text-xs font-bold text-white">
          Q&amp;A · Ask: what fruit?
        </span>
      </div>
      <div className="mt-3 flex gap-3 border-t border-[#2A3441] pt-3">
        {[
          { emoji: "🍎", label: "Apple" },
          { emoji: "🍌", label: "Banana" },
          { emoji: "🍊", label: "Orange" },
        ].map((fruit) => (
          <div key={fruit.label} className="flex flex-col items-center gap-0.5">
            <span className="text-3xl" aria-hidden>
              {fruit.emoji}
            </span>
            <span className="text-[10px] text-gray-400">{fruit.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function VoicesSection({ previewVoiceId }: { previewVoiceId: string }) {
  const [triedCache, setTriedCache] = useState<string | null>(null);

  return (
    <section aria-labelledby="gl-voices">
      <h3 id="gl-voices" className="mb-2 text-sm font-bold text-white">
        African voices
      </h3>
      <ul className="space-y-2">
        {GIGALEARN_VOICES.map((voice) => (
          <li
            key={voice.id}
            className={cn(
              "flex items-center gap-2 rounded-2xl bg-[#1A233A] p-3",
              voice.id === previewVoiceId && "border border-[#EAB308]"
            )}
          >
            <span className="text-xl" aria-hidden>
              {voice.flag}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{voice.name}</p>
              <p className="truncate text-[11px] text-gray-400">
                {voice.language} · {voice.style}
              </p>
            </div>
            <button
              type="button"
              aria-label={`Play sample of ${voice.name}`}
              onClick={() => {
                setTriedCache(voice.id);
                previewGigaLearnVoice(`Hello! I am ${voice.name}. Let's learn together!`);
              }}
              className="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-[#EAB308] text-sm font-bold text-black"
            >
              {triedCache === voice.id ? "✓" : "▶️"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GesSection() {
  return (
    <section aria-labelledby="gl-ges">
      <h3 id="gl-ges" className="mb-2 text-sm font-bold text-white">
        Ghana curriculum (GES)
      </h3>
      <div className="space-y-2">
        {GES_STRANDS.map((row) => (
          <div key={row.level} className="rounded-2xl border border-[#2A3441] bg-[#1A233A] p-3">
            <p className="text-xs font-bold text-[#EAB308]">{row.level}</p>
            <ul className="mt-1 space-y-0.5">
              {row.strands.map((strand) => (
                <li key={strand} className="text-[11px] text-gray-300">
                  • {strand}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function OfflineBanner() {
  const [storageLabel, setStorageLabel] = useState<string>(
    `${OFFLINE_BANNER.storageUsed}/${OFFLINE_BANNER.storageTotal}`
  );
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listOfflineLessons()
      .then((rows) => {
        if (!cancelled) setStorageLabel(`${rows.length} packs · ${OFFLINE_BANNER.storageTotal} cap`);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function clearCache() {
    try {
      const dbs = (indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }).databases;
      if (typeof dbs === "function") {
        const list = await dbs.call(indexedDB);
        await Promise.all(
          (list ?? [])
            .map((d) => d.name)
            .filter((n): n is string => Boolean(n && n.startsWith("giga3-gigalearn")))
            .map(
              (name) =>
                new Promise<void>((resolve) => {
                  const req = indexedDB.deleteDatabase(name);
                  req.onsuccess = () => resolve();
                  req.onerror = () => resolve();
                })
            )
        );
      }
      setNotice("Cache cleared — lessons stay in the cloud.");
    } catch {
      setNotice("Could not clear cache on this device.");
    }
  }

  return (
    <div className="rounded-2xl border border-[#10B981]/50 bg-[#1A233A] p-3">
      <p className="text-xs font-bold text-[#10B981]">📴 {OFFLINE_BANNER.text}</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-300">Storage {storageLabel}</p>
        <button
          type="button"
          onClick={() => void clearCache()}
          className="min-h-11 rounded-xl border border-[#2A3441] px-3 py-1.5 text-[11px] font-bold text-white"
        >
          Clear cache
        </button>
      </div>
      {notice ? <p className="mt-1 text-[11px] text-[#EAB308]">{notice}</p> : null}
    </div>
  );
}
