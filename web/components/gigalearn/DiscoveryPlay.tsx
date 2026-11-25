"use client";

import { Headphones, Music2, RotateCcw, Volume2 } from "lucide-react";
import { useState } from "react";
import { LearningAward } from "./LearningAward";
import { useDiscoveryAudio } from "./DiscoveryPictureLesson";
import { discoveryFruits, discoveryPhotoPath } from "./discoveryObjects";

const rounds = [1, 2, 0, 3, 4, 5, 6, 7] as const;
const leftTargets = new Set([1, 4, 5, 7]);

export function DiscoveryPlay({ onPractise }: { onPractise: () => void }) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const { play, stop, audioError } = useDiscoveryAudio();
  const targetIndex = rounds[round];
  const target = targetIndex === undefined ? null : discoveryFruits[targetIndex];
  const correct = target !== null && picked === target.id;

  function goNext() {
    stop();
    setPicked(null);
    setRound(round + 1);
  }

  const distractor = targetIndex === undefined ? null : discoveryFruits[(targetIndex + 3) % discoveryFruits.length]!;
  const choices = target && distractor ? (leftTargets.has(round) ? [target, distractor] : [distractor, target]) : [];

  return (
    <section className="gigalearn-play-panel space-y-3" aria-labelledby="fruit-finder">
      <h3 className="text-xl font-bold" id="fruit-finder">Fruit Finder</h3>
      {target ? (
        <>
          <button
            type="button"
            className="gigalearn-control gigalearn-control--primary w-full px-3 py-2"
            data-learn-tone="blue"
            onClick={() => play(`find-${target.id}`)}
          >
            <Volume2 className="h-5 w-5" aria-hidden /> Find the {target.name.toLowerCase()}
          </button>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Fruit pictures">
            {choices.map((fruit) => (
              <button
                key={fruit.id}
                className="gigalearn-control gigalearn-fruit-card gigalearn-big-fruit"
                type="button"
                data-learn-tone="gold"
                aria-label={fruit.name}
                aria-pressed={picked === fruit.id}
                disabled={correct}
                onClick={() => {
                  setPicked(fruit.id);
                  play(fruit.id === target.id ? target.id : "try-again");
                }}
              >
                <img src={`${discoveryPhotoPath}/${fruit.image}`} alt="" width="320" height="320" />
              </button>
            ))}
          </div>
          <div className="gigalearn-play-message text-base font-semibold" aria-live="polite">
            {picked && (correct ? `Well spotted! ${target.name}.` : "Try the other picture.")}
          </div>
          {audioError && <p role="status" className="text-sm">Audio could not play. A grown-up can say the fruit name.</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Fruit {round + 1} of {rounds.length}</p>
            <button
              className="gigalearn-control gigalearn-control--primary px-3"
              data-learn-tone="green"
              type="button"
              disabled={!correct}
              onClick={goNext}
            >
              {round === rounds.length - 1 ? "See my award" : "Find the next fruit"}
            </button>
          </div>
        </>
      ) : (
        <>
          <LearningAward title="Fruit Finder award" detail={`You matched all ${rounds.length} fruits!`} />
          <div className="flex flex-wrap gap-2">
            <button className="gigalearn-control px-3" type="button" onClick={() => { setPicked(null); setRound(0); }}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Play again
            </button>
            <button className="gigalearn-control px-3" type="button" onClick={onPractise}>Practise names</button>
          </div>
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
      <p>{track === "song" ? "Listen and clap along." : "Listen to the spoken rhyme, then say it together."}</p>
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
      <details className="gigalearn-play-details">
        <summary className="font-semibold">Words for grown-ups</summary>
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
      </details>
    </section>
  );
}
