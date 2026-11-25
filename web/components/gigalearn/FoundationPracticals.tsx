"use client";

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bot, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { speakWithGigaLearnVoice, stopGigaLearnVoice } from "@/lib/gigalearn/speechSynthesis";
import { LearningAward } from "./LearningAward";

const control = "gigalearn-control px-3 py-2";
const primary = `${control} gigalearn-control--primary`;

function Card({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <section className="gigalearn-practical space-y-4" data-learn-tone={tone} aria-label={title}>
      <h3 className="text-xl font-bold">{title}</h3>
      {children}
    </section>
  );
}

const numberTasks = {
  ten: {
    title: "Make Ten", prompt: "Six counters are already on the mat. Add enough counters to make ten.",
    labels: ["More counters"], target: [4], budget: 10, weights: [1], base: 6,
    award: "Ten Builder", tip: "Try with six equal objects. Add them one by one and count the total.",
  },
  shares: {
    title: "Fair Shares", prompt: "Give out all 12 counters. Each of the three plates should have the same number.",
    labels: ["Plate A", "Plate B", "Plate C"], target: [4, 4, 4], budget: 12, weights: [1, 1, 1], base: 0,
    award: "Fair Share Champion", tip: "Share 12 pieces of paper between three plates at home. Move one piece at a time.",
  },
  tens: {
    title: "Tens and Ones", prompt: "Build 24 with bundles of ten and single counters.",
    labels: ["Ten bundles", "Single counters"], target: [2, 4], budget: 39, weights: [10, 1], base: 0,
    award: "Place Value Builder", tip: "Group 24 paper strips into bundles of ten. Count the bundles and the loose strips.",
  },
} as const;

function NumberBench({ task }: { task: (typeof numberTasks)[keyof typeof numberTasks] }) {
  const empty = () => task.labels.map(() => 0);
  const [amounts, setAmounts] = useState(empty);
  const [checked, setChecked] = useState(false);
  const total = amounts.reduce((sum, amount, index) => sum + amount * task.weights[index], task.base);
  const correct = task.target.every((count, index) => amounts[index] === count);

  function change(index: number, delta: number) {
    setAmounts((previous) => previous.map((count, current) => current === index ? count + delta : count));
    setChecked(false);
  }

  return (
    <Card title={task.title} tone="blue">
      <p>{task.prompt}</p>
      <p className="font-bold" role="status">Total on the mat: {total}</p>
      {task.base > 0 && <div className="gigalearn-bench-counters" aria-hidden>
        {Array.from({ length: task.base }, (_, index) => <span key={index} />)}
      </div>}
      {task.labels.map((label, index) => (
        <div key={label} className="gigalearn-practical-results space-y-2">
          <div className="flex flex-wrap justify-between gap-1">
            <p className="font-semibold">{label} · {amounts[index]}</p>
            <div className="flex gap-1">
              <button type="button" className={control} disabled={amounts[index] === 0}
                aria-label={`Remove from ${label}`} onClick={() => change(index, -1)}>−</button>
              <button type="button" className={control} disabled={total + task.weights[index] > task.budget || (task.title === "Tens and Ones" && task.weights[index] === 1 && amounts[index] >= 9)}
                aria-label={`Add to ${label}`} onClick={() => change(index, 1)}>+</button>
            </div>
          </div>
          <div className="gigalearn-bench-counters" aria-hidden>
            {Array.from({ length: amounts[index] }, (_, counter) => (
              <span key={counter} data-bundle={task.weights[index] === 10} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} onClick={() => setChecked(true)}>Check my work</button>
        <button type="button" className={control} onClick={() => { setAmounts(empty()); setChecked(false); }}>Start again</button>
      </div>
      {checked && (correct
        ? <LearningAward title={`${task.award} award`} detail="Excellent work using your counters." tone="blue" />
        : <p role="status">Try another arrangement. Compare each group with the task.</p>)}
      <p>{task.tip}</p>
    </Card>
  );
}

const sentences = [
  { tokens: ["mangoes.", "Mansa", "counts"], order: [1, 2, 0], prompt: "Tell what Mansa does." },
  { tokens: ["the", "Kofi", "bag.", "opens"], order: [1, 3, 0, 2], prompt: "Tell what Kofi does." },
  { tokens: ["a", "sings", "song.", "Ama"], order: [3, 1, 0, 2], prompt: "Tell what Ama does." },
];

function SentenceBuilder() {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<"correct" | "retry" | null>(null);
  const sentence = sentences[round];
  const done = result === "correct" && round === sentences.length - 1;

  return (
    <Card title="Sentence Builder" tone="pink">
      <p>Tap the words in order. Start with a capital letter and end with a full stop.</p>
      <p className="font-semibold">{sentence.prompt}</p>
      <p className="gigalearn-practical-results min-h-14 text-lg" aria-live="polite">
        {picked.length ? picked.map((index) => sentence.tokens[index]).join(" ") : "Your sentence"}
      </p>
      <div className="flex flex-wrap gap-2">
        {sentence.tokens.map((word, index) => (
          <button type="button" className={control} key={word} disabled={picked.includes(index) || result === "correct"}
            onClick={() => { setPicked([...picked, index]); setResult(null); }}>{word}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={control} disabled={!picked.length || result === "correct"}
          onClick={() => { setPicked(picked.slice(0, -1)); setResult(null); }}>Undo word</button>
        <button type="button" className={primary} disabled={picked.length !== sentence.order.length || result === "correct"}
          onClick={() => setResult(sentence.order.every((index, position) => picked[position] === index) ? "correct" : "retry")}>Check sentence</button>
        {result === "correct" && !done && <button type="button" className={control}
          onClick={() => { setRound(round + 1); setPicked([]); setResult(null); }}>Next sentence</button>}
      </div>
      {result && <p role="status">{result === "correct" ? "Brilliant! Your sentence makes sense." : "Check who does the action, then put the doing word next."}</p>}
      {done && <LearningAward title="Sentence Builder award" detail="You put three sentences in order." tone="pink" />}
      {done && <button type="button" className={control} onClick={() => { setRound(0); setPicked([]); setResult(null); }}>Play again</button>}
    </Card>
  );
}

const soundTasks = {
  rhyme: {
    title: "Rhyme Pairs", award: "Rhyme Finder", tip: "Ask a partner to say a word and take turns finding one that rhymes with it.",
    lessons: [
      { prompt: "I see a cat. It wears a …", cue: "I see a cat. It wears a blank.", choices: ["hat", "cup", "dog"], answer: 0, why: "Cat and hat share the same ending sound." },
      { prompt: "We see a light. It shines at …", cue: "We see a light. It shines at blank.", choices: ["home", "night", "school"], answer: 1, why: "Light and night share the same ending sound." },
      { prompt: "We run in the sun. It is …", cue: "We run in the sun. It is blank.", choices: ["warm", "bright", "fun"], answer: 2, why: "Sun and fun share the same ending sound." },
    ],
  },
  phonics: {
    title: "Phonics Sound Match", award: "Sound Detective", tip: "Say the word slowly with a teacher and hunt for another word that starts with the same sound.",
    lessons: [
      { prompt: "Which word starts with the same sound as moon?", cue: "Moon.", choices: ["cup", "mango", "book"], answer: 1, why: "Moon and mango begin with /m/. Keep your lips together to make the sound." },
      { prompt: "Which word starts with the same sound as sock?", cue: "Sock.", choices: ["sun", "bag", "pot"], answer: 0, why: "Sock and sun begin with /s/. Listen for the long, soft hiss." },
      { prompt: "Which word starts with the same sound as shoe?", cue: "Shoe.", choices: ["drum", "lamp", "ship"], answer: 2, why: "Shoe and ship begin with /sh/. The two letters work together to represent one sound." },
    ],
  },
} as const;

function SoundPractice({ task }: { task: (typeof soundTasks)[keyof typeof soundTasks] }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [audioError, setAudioError] = useState(false);
  const audioRequest = useRef<symbol | null>(null);
  const lesson = task.lessons[round];
  const correct = picked === lesson.answer;
  const done = correct && round === task.lessons.length - 1;

  useEffect(() => () => {
    if (audioRequest.current) stopGigaLearnVoice();
    audioRequest.current = null;
  }, []);

  async function hearWords() {
    const request = Symbol();
    audioRequest.current = request;
    const played = await speakWithGigaLearnVoice({ text: `${lesson.cue} ${lesson.choices.join(". ")}.`, voiceId: "english" }).catch(() => false);
    if (audioRequest.current === request) {
      audioRequest.current = null;
      setAudioError(!played);
    }
  }

  function goTo(nextRound: number) {
    if (audioRequest.current) stopGigaLearnVoice();
    audioRequest.current = null;
    setRound(nextRound);
    setPicked(null);
    setAudioError(false);
  }

  return (
    <Card title={task.title} tone="pink">
      <p className="text-lg font-semibold">{lesson.prompt}</p>
      <button type="button" className={primary} onClick={() => void hearWords()}>
        <Volume2 className="h-5 w-5" aria-hidden /> Hear the words
      </button>
      {audioError && <p role="status">Ask a grown-up to read the words aloud with you.</p>}
      <div className="gigalearn-experiment-choices">
        {lesson.choices.map((word, index) => (
          <button key={word} type="button" className={control} aria-pressed={picked === index} disabled={correct}
            onClick={() => setPicked(index)}>{word}</button>
        ))}
      </div>
      {picked !== null && <p role="status">{correct ? `Excellent listening! ${lesson.why}` : "Say the words slowly and listen for the matching sound."}</p>}
      {correct && !done && <button type="button" className={control} onClick={() => goTo(round + 1)}>Next words</button>}
      {done && <>
        <LearningAward title={`${task.award} award`} detail="You matched all three sounds." tone="pink" />
        <button type="button" className={control} onClick={() => goTo(0)}>Play again</button>
      </>}
      <p>{task.tip}</p>
    </Card>
  );
}

const directions = [
  { label: "Up", move: -4, icon: ArrowUp }, { label: "Right", move: 1, icon: ArrowRight },
  { label: "Down", move: 4, icon: ArrowDown }, { label: "Left", move: -1, icon: ArrowLeft },
] as const;
const startCell = 12;
const goalCell = 2;
const blockedCell = 9;

function RobotRoutes() {
  const [commands, setCommands] = useState<number[]>([]);
  const [run, setRun] = useState<{ cell: number; feedback: string; success: boolean } | null>(null);

  function execute() {
    let cell = startCell;
    for (const index of commands) {
      const next = cell + directions[index].move;
      if (next < 0 || next >= 16 || (index === 1 && cell % 4 === 3) || (index === 3 && cell % 4 === 0) || next === blockedCell) {
        setRun({ cell, feedback: "The robot reached an edge or a barrier. Change the route and try again.", success: false });
        return;
      }
      cell = next;
    }
    setRun({ cell, feedback: cell === goalCell ? "Excellent coding! Your robot reached the star." : "The robot needs more steps or a different turn.", success: cell === goalCell });
  }

  return (
    <Card title="Robot Routes" tone="green">
      <p>Send the robot from the bottom-left tile to the star in row 1, column 3. Go around the barrier in row 3, column 2.</p>
      <div className="gigalearn-robot-grid" aria-label="Four by four robot board">
        {Array.from({ length: 16 }, (_, cell) => (
          <div key={cell} data-barrier={cell === blockedCell} data-robot={cell === (run?.cell ?? startCell)}>
            {cell === (run?.cell ?? startCell) ? <Bot aria-label="Robot" /> : cell === goalCell ? <span aria-label="Goal">★</span> : cell === blockedCell ? <span aria-label="Barrier">×</span> : null}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {directions.map(({ label, icon: Icon }, index) => (
          <button key={label} type="button" className={control} aria-label={`Add ${label.toLowerCase()}`}
            disabled={commands.length >= 10}
            onClick={() => { setCommands([...commands, index]); setRun(null); }}><Icon aria-hidden /></button>
        ))}
      </div>
      <p className="gigalearn-practical-results" aria-live="polite">{commands.map((index) => directions[index].label).join(" → ") || "Your commands"}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={primary} disabled={!commands.length} onClick={execute}>Run commands</button>
        <button type="button" className={control} disabled={!commands.length}
          onClick={() => { setCommands(commands.slice(0, -1)); setRun(null); }}>Undo command</button>
        <button type="button" className={control} onClick={() => { setCommands([]); setRun(null); }}>Start again</button>
      </div>
      {run && <p role="status">{run.feedback} Robot position: row {Math.floor(run.cell / 4) + 1}, column {run.cell % 4 + 1}.</p>}
      {run?.success && <LearningAward title="Robot Coder award" detail="You used ordered instructions to reach the goal." tone="green" />}
      <p>Make a small grid on paper and give a partner directions to move a counter.</p>
    </Card>
  );
}

const sortingItems = [
  { name: "Mango", fruit: true }, { name: "Pencil", fruit: false }, { name: "Orange", fruit: true },
  { name: "School bag", fruit: false }, { name: "Banana", fruit: true },
];

function SortByRule() {
  const [picks, setPicks] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const correct = sortingItems.every(({ name, fruit }) => picks.includes(name) === fruit);
  return (
    <Card title="Sort by a Rule" tone="green">
      <p>Build a filter that keeps only fruit. Tap every item that matches the rule.</p>
      <div className="gigalearn-experiment-choices">
        {sortingItems.map(({ name }) => (
          <button key={name} type="button" className={control} aria-pressed={picks.includes(name)}
            onClick={() => { setPicks(picks.includes(name) ? picks.filter((item) => item !== name) : [...picks, name]); setChecked(false); }}>{name}</button>
        ))}
      </div>
      <p className="gigalearn-practical-results" aria-live="polite">Kept by your filter: {picks.join(", ") || "None yet"}</p>
      <button type="button" className={primary} onClick={() => setChecked(true)}>Check filter</button>
      {checked && (correct ? <LearningAward title="Rule Maker award" detail="You kept every fruit and left the other objects out." tone="green" />
        : <p role="status">Check each item against the same rule. Have you kept all the fruit?</p>)}
      <p>Use the same filter idea for another collection, such as objects you can write with.</p>
    </Card>
  );
}

const patterns = [
  { cells: ["Blue", "Gold", "Blue", "Gold"], answer: "Blue" },
  { cells: ["Pink", "Pink", "Green", "Pink", "Pink"], answer: "Green" },
  { cells: ["Gold", "Green", "Pink", "Gold", "Green"], answer: "Pink" },
];

function ColourPatterns() {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const pattern = patterns[round];
  const correct = picked === pattern.answer;
  const done = correct && round === patterns.length - 1;
  return (
    <Card title="Colour Patterns" tone="gold">
      <p>Say the colours in order. Choose the colour that should come next.</p>
      <div className="flex flex-wrap gap-2">
        {pattern.cells.map((colour, index) => (
          <span key={index} className="gigalearn-pattern-cell" data-colour={colour}>{colour}</span>
        ))}
        <span className="gigalearn-pattern-cell">{correct ? picked : "?"}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {["Blue", "Gold", "Green", "Pink"].map((colour) => (
          <button key={colour} type="button" className={control} data-learn-tone={colour.toLowerCase()}
            disabled={correct} aria-pressed={picked === colour} onClick={() => setPicked(colour)}>{colour}</button>
        ))}
      </div>
      {picked && <p role="status">{correct ? "Brilliant! You completed the repeating pattern." : "Find the group of colours that keeps repeating."}</p>}
      {correct && !done && <button type="button" className={control} onClick={() => { setRound(round + 1); setPicked(null); }}>Next pattern</button>}
      {done && <>
        <LearningAward title="Pattern Artist award" detail="You completed three different patterns." tone="gold" />
        <button type="button" className={control} onClick={() => { setRound(0); setPicked(null); }}>Play again</button>
      </>}
      <p>Draw and colour a repeating pattern of your own.</p>
    </Card>
  );
}

export const FOUNDATION_ACTIVITIES = {
  math: [
    { id: "ten", label: "Make Ten" }, { id: "shares", label: "Fair Shares" }, { id: "tens", label: "Tens and Ones" },
  ],
  reading: [
    { id: "sentence", label: "Sentence Builder" }, { id: "rhyme", label: "Rhyme Pairs" }, { id: "phonics", label: "Phonics Sound Match" },
  ],
  computing: [
    { id: "route", label: "Robot Routes" }, { id: "sort", label: "Sort by a Rule" },
  ],
  arts: [{ id: "pattern", label: "Colour Patterns" }],
} as const;

export function FoundationPractical({ activity }: { activity: string }) {
  switch (activity) {
    case "ten":
    case "shares":
    case "tens":
      return <NumberBench task={numberTasks[activity]} />;
    case "sentence":
      return <SentenceBuilder />;
    case "rhyme":
    case "phonics":
      return <SoundPractice task={soundTasks[activity]} />;
    case "route":
      return <RobotRoutes />;
    case "sort":
      return <SortByRule />;
    case "pattern":
      return <ColourPatterns />;
    default:
      return null;
  }
}
