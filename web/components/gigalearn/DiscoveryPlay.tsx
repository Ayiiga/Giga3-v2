"use client";

import { Headphones, Music2, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { LearningAward } from "./LearningAward";

const photoPath = "/gigalearn/media/ghana/kg2/hq";
const fruits = [
  { id: "mango", name: "Mango", image: "mango.webp", clue: "Find the mango. Its skin can be green, yellow, or orange." },
  { id: "orange", name: "Orange", image: "orange.webp", clue: "Find the orange. Look for a round fruit with a dimpled peel." },
  { id: "banana", name: "Banana", image: "bananas-four.webp", clue: "Find the bananas. Look for the long, curved fruits." },
] as const;
const rounds = [fruits[1], fruits[2], fruits[0]];

export function DiscoveryPlay() {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const target = rounds[round];
  const correct = picked === target?.id;

  return (
    <section className="gigalearn-play-panel space-y-4" aria-labelledby="fruit-finder">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-amber-600" aria-hidden />
        <h3 className="text-xl font-bold" id="fruit-finder">Fruit Finder</h3>
      </div>
      {target ? (
        <>
          <p className="font-semibold">{target.clue}</p>
          <div className="grid grid-cols-3 gap-2" aria-label="Fruit pictures">
            {fruits.map((fruit) => (
              <button
                key={fruit.id}
                className="gigalearn-control gigalearn-fruit-card"
                type="button"
                data-learn-tone={fruit.id === "mango" ? "green" : fruit.id === "orange" ? "gold" : "blue"}
                aria-label={fruit.name}
                aria-pressed={picked === fruit.id}
                disabled={correct}
                onClick={() => setPicked(fruit.id)}
              >
                <img src={`${photoPath}/${fruit.image}`} alt="" width="160" height="120" />
                <span className="text-xs">{fruit.name}</span>
              </button>
            ))}
          </div>
          <div className="gigalearn-play-message" aria-live="polite">
            {picked && (correct
              ? `Well spotted! You found the ${target.name.toLowerCase()}.`
              : "Nice try. Look at the shape and skin, then pick another picture.")}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Fruit {round + 1} of {rounds.length}</p>
            <button
              className="gigalearn-control gigalearn-control--primary px-3"
              data-learn-tone="green"
              type="button"
              disabled={!correct}
              onClick={() => { setPicked(null); setRound(round + 1); }}
            >
              {round === rounds.length - 1 ? "See my award" : "Find the next fruit"}
            </button>
          </div>
        </>
      ) : (
        <>
          <LearningAward title="Fruit Finder award" detail="You matched all three fruits by looking closely." />
          <p>With an adult, look at a fruit at home or at the market. Say its name, then describe its shape and skin.</p>
          <button
            className="gigalearn-control px-3"
            type="button"
            onClick={() => { setPicked(null); setRound(0); }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Play again
          </button>
        </>
      )}
    </section>
  );
}

const tracks = {
  song: { src: "/gigalearn/activities/count-and-clap.mp3", title: "Count and Clap", icon: Music2 },
  rhyme: { src: "/gigalearn/media/ghana/kg2/rhyme-mango-en.mp3", title: "Mango Sweet", icon: Headphones },
} as const;

export function DiscoveryMusic() {
  const [track, setTrack] = useState<keyof typeof tracks>("song");
  const [audioError, setAudioError] = useState(false);
  const selected = tracks[track];
  return (
    <section className="gigalearn-play-panel gigalearn-music-panel space-y-4" aria-labelledby="music-play">
      <h3 className="text-xl font-bold" id="music-play">Songs and rhymes</h3>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a track">
        {(["song", "rhyme"] as const).map((id) => {
          const Icon = tracks[id].icon;
          return (
            <button
              className="gigalearn-control px-3"
              data-learn-tone={id === "song" ? "pink" : "gold"}
              key={id}
              aria-pressed={id === track}
              type="button"
              onClick={() => { setTrack(id); setAudioError(false); }}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {tracks[id].title}
            </button>
          );
        })}
      </div>
      <p>{track === "song" ? "Sing or say these lines and clap along to the tune." : "Listen to the spoken rhyme, then say it together."}</p>
      <audio
        key={selected.src}
        aria-label={track === "song" ? "Count and Clap instrumental" : "Mango Sweet spoken rhyme"}
        src={selected.src}
        className="block w-full max-w-full"
        controls
        preload="none"
        onError={() => setAudioError(true)}
      />
      {audioError && <p role="status">Audio could not load. You can still read the words and clap together.</p>}
      <div className="gigalearn-play-message space-y-1 font-semibold">
        {track === "song" ? (
          <>
            <p>One, two, three, clap with me.</p>
            <p>Four and five, hold them high.</p>
            <p>Count the fruit, one by one.</p>
            <p>Count with me, then we’re done.</p>
          </>
        ) : (
          <>
            <p>Mango sweet, mango nice.</p>
            <p>One for you, and one slice!</p>
          </>
        )}
      </div>
    </section>
  );
}
