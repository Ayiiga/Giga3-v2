"use client";

import { speakPronunciationSequence, stopGigaLearnVoice } from "@/lib/gigalearn/speechSynthesis";
import { ORIGINAL_RHYME_LABEL, type GigaRhyme } from "@/lib/gigalearn/rhymes/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronRight, Hand, Repeat, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Mode = "idle" | "hear" | "repeat" | "clap";

const REPEAT_PAUSE_MS = 3500;

type RhymePlayerProps = {
  rhyme: GigaRhyme;
  onBack: () => void;
  onNext?: () => void;
  onPractised: (id: string) => void;
};

export function RhymePlayer({ rhyme, onBack, onNext, onPractised }: RhymePlayerProps) {
  const [mode, setMode] = useState<Mode>("idle");
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [yourTurn, setYourTurn] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [clapWord, setClapWord] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [doneActivities, setDoneActivities] = useState<Set<number>>(new Set());
  const playTokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  const stop = useCallback(() => {
    playTokenRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    stopGigaLearnVoice();
    setMode("idle");
    setActiveLine(null);
    setYourTurn(false);
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
    setAnswers({});
    setDoneActivities(new Set());
    setClapWord(0);
    setSpeechError(null);
    return stop;
  }, [rhyme.id, stop]);

  const speakLine = useCallback(
    async (index: number, token: number, onDone: () => void) => {
      setActiveLine(index);
      const ok = await speakPronunciationSequence(
        [{ text: rhyme.lyrics[index]!, voiceId: rhyme.audio.voiceId }],
        { rate: 0.85, onEnd: () => playTokenRef.current === token && onDone() }
      );
      if (!ok && playTokenRef.current === token) {
        setSpeechError("Speech is not available on this device. Check your volume and try again.");
        stop();
      }
    },
    [rhyme, stop]
  );

  const playFrom = useCallback(
    (index: number, token: number, withPause: boolean) => {
      if (index >= rhyme.lyrics.length) {
        setMode("idle");
        setActiveLine(null);
        setYourTurn(false);
        onPractised(rhyme.id);
        return;
      }
      void speakLine(index, token, () => {
        if (!withPause) {
          playFrom(index + 1, token, false);
          return;
        }
        setYourTurn(true);
        timerRef.current = setTimeout(() => {
          if (playTokenRef.current !== token) return;
          setYourTurn(false);
          playFrom(index + 1, token, true);
        }, REPEAT_PAUSE_MS);
      });
    },
    [onPractised, rhyme.id, rhyme.lyrics.length, speakLine]
  );

  const start = (next: "hear" | "repeat") => {
    stop();
    setSpeechError(null);
    const token = playTokenRef.current;
    setMode(next);
    playFrom(0, token, next === "repeat");
  };

  const clapLines = rhyme.lyrics.map((line) => line.split(/\s+/).filter(Boolean));
  const clapTotal = clapLines.reduce((sum, words) => sum + words.length, 0);
  let clapCursor = clapWord;
  let clapLine = 0;
  while (clapLine < clapLines.length && clapCursor >= clapLines[clapLine]!.length) {
    clapCursor -= clapLines[clapLine]!.length;
    clapLine += 1;
  }

  const clap = () => {
    const next = clapWord + 1;
    setClapWord(next);
    if (next >= clapTotal) onPractised(rhyme.id);
  };

  const answeredAll = rhyme.questions.length > 0 && rhyme.questions.every((q) => answers[q.id] === q.answer);
  useEffect(() => {
    if (answeredAll) onPractised(rhyme.id);
  }, [answeredAll, onPractised, rhyme.id]);

  const playing = mode === "hear" || mode === "repeat";
  const status = playing
    ? yourTurn
      ? "Your turn — say the line!"
      : activeLine != null
        ? `Line ${activeLine + 1} of ${rhyme.lyrics.length}`
        : "Starting…"
    : "";

  return (
    <article aria-labelledby={`rhyme-${rhyme.id}-title`} className="space-y-4">
      <button
        type="button"
        onClick={() => {
          stop();
          onBack();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        All rhymes
      </button>

      <header className="flex items-start gap-4">
        <span className="text-6xl leading-none" role="img" aria-label={rhyme.illustration.alt}>
          {rhyme.illustration.emoji}
        </span>
        <div className="min-w-0">
          <h3
            id={`rhyme-${rhyme.id}-title`}
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold text-foreground outline-none"
          >
            {rhyme.title}
          </h3>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-semibold">Learning objective:</span> {rhyme.learningObjective}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">{rhyme.ageRange}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">{rhyme.language}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-muted">{rhyme.region}</span>
          </div>
          <p className="mt-1 text-xs text-muted">Cultural context: {rhyme.culturalContext}</p>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-accent/5 p-4">
        <ol className="space-y-1.5" aria-label="Rhyme lyrics">
          {rhyme.lyrics.map((line, index) => {
            const current = activeLine === index || (mode === "clap" && clapLine === index);
            return (
              <li
                key={index}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "rounded-lg px-2 py-1 text-base leading-relaxed",
                  current ? "bg-accent text-accent-foreground font-semibold" : "text-foreground"
                )}
              >
                {mode === "clap"
                  ? clapLines[index]!.map((word, wordIndex) => (
                      <span
                        key={wordIndex}
                        className={cn(
                          "mr-1 inline-block rounded px-0.5",
                          clapLine === index && clapCursor === wordIndex && "bg-white text-foreground underline"
                        )}
                      >
                        {word}
                      </span>
                    ))
                  : line}
              </li>
            );
          })}
        </ol>
        {rhyme.glossary?.length ? (
          <div className="mt-3 border-t border-border pt-3">
            <dl className="grid gap-1 text-xs sm:grid-cols-2">
              {rhyme.glossary.map((entry) => (
                <div key={entry.word}>
                  <dt className="inline font-semibold text-foreground">{entry.word}</dt>{" "}
                  <dd className="inline text-muted">— {entry.meaning}</dd>
                </div>
              ))}
            </dl>
            {rhyme.language !== "English" ? (
              <p className="mt-1 text-[11px] text-amber-700">
                African-language words need native-speaker review; the device voice may not pronounce them accurately.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {status}
      </p>
      {status ? (
        <p className={cn("text-sm font-semibold", yourTurn ? "text-emerald-700" : "text-muted")} aria-hidden>
          {status}
        </p>
      ) : null}
      {speechError ? (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {speechError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {playing ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
          >
            <Square className="h-4 w-4" aria-hidden />
            Stop
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => start("hear")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Hear
            </button>
            <button
              type="button"
              onClick={() => start("repeat")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
            >
              <Repeat className="h-4 w-4" aria-hidden />
              Repeat after me
            </button>
            <button
              type="button"
              aria-pressed={mode === "clap"}
              onClick={() => {
                setClapWord(0);
                setMode(mode === "clap" ? "idle" : "clap");
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
            >
              <Hand className="h-4 w-4" aria-hidden />
              Clap along
            </button>
          </>
        )}
      </div>

      {mode === "clap" ? (
        <div className="rounded-2xl border border-border p-4 text-center">
          <p className="text-sm text-muted">Clap once for every word, then tap the button.</p>
          <button
            type="button"
            onClick={clap}
            disabled={clapWord >= clapTotal}
            className="mt-2 min-h-14 min-w-32 rounded-full bg-amber-400 px-6 text-lg font-bold text-black disabled:opacity-50"
          >
            👏 Clap
          </button>
          <p className="mt-2 text-xs text-muted" aria-live="polite">
            {clapWord >= clapTotal ? "Great clapping — you finished the rhyme!" : `${clapWord} / ${clapTotal} words`}
          </p>
        </div>
      ) : null}

      <section aria-labelledby={`rhyme-${rhyme.id}-practice`} className="rounded-2xl border border-border p-4">
        <h4 id={`rhyme-${rhyme.id}-practice`} className="text-sm font-semibold text-foreground">
          Practice
        </h4>
        <ul className="mt-2 space-y-2">
          {rhyme.activities.map((activity, index) => (
            <li key={index}>
              <label className="flex min-h-11 items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={doneActivities.has(index)}
                  onChange={() =>
                    setDoneActivities((current) => {
                      const next = new Set(current);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })
                  }
                />
                {activity}
              </label>
            </li>
          ))}
        </ul>
      </section>

      {rhyme.questions.length ? (
        <section aria-labelledby={`rhyme-${rhyme.id}-questions`} className="rounded-2xl border border-border p-4">
          <h4 id={`rhyme-${rhyme.id}-questions`} className="text-sm font-semibold text-foreground">
            Questions
          </h4>
          <div className="mt-2 space-y-3">
            {rhyme.questions.map((question) => {
              const picked = answers[question.id];
              return (
                <fieldset key={question.id}>
                  <legend className="text-sm text-foreground">{question.prompt}</legend>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {question.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={picked === option}
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: option }))}
                        className={cn(
                          "min-h-11 rounded-xl border px-3 text-sm font-medium",
                          picked === option
                            ? option === question.answer
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-red-400 bg-red-400 text-white"
                            : "border-border text-foreground"
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {picked ? (
                    <p
                      className={cn("mt-1 text-xs font-semibold", picked === question.answer ? "text-emerald-700" : "text-red-600")}
                      aria-live="polite"
                    >
                      {picked === question.answer ? "Correct — well done!" : "Not quite. Listen again and try once more."}
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          {rhyme.originalContent ? ORIGINAL_RHYME_LABEL : "User-provided content"}
          {rhyme.reviewed ? "" : " · awaiting educator review"}
        </p>
        {onNext ? (
          <button
            type="button"
            onClick={() => {
              stop();
              onNext();
            }}
            className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-border px-4 text-sm font-semibold text-foreground"
          >
            Next rhyme
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </footer>
    </article>
  );
}
