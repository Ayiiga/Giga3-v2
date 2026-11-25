"use client";

import { Apple, Backpack, ChevronLeft, ChevronRight, Dog, Hand, Maximize2, Minimize2, PawPrint, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { discoveryAudioPath, discoveryDecks, type DiscoveryDeck } from "./discoveryObjects";

export function useDiscoveryAudio() {
  const player = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState(false);

  function stop() {
    player.current?.pause();
    player.current = null;
  }

  useEffect(() => () => {
    player.current?.pause();
  }, []);

  function play(cue: string) {
    stop();
    const next = new Audio(`${discoveryAudioPath}/${cue}.mp3`);
    player.current = next;
    setAudioError(false);
    void next.play().catch(() => {
      if (player.current === next) setAudioError(true);
    });
  }
  return { play, stop, audioError };
}

const control = "gigalearn-control px-3 py-2";

const deckButtons = [
  { id: "fruit", label: "Fruits", icon: Apple, tone: "gold" },
  { id: "domestic", label: "Domestic animals", icon: Dog, tone: "blue" },
  { id: "wildlife", label: "Wildlife", icon: PawPrint, tone: "green" },
  { id: "body", label: "Body parts", icon: Hand, tone: "pink" },
  { id: "things", label: "Home and school", icon: Backpack, tone: "blue" },
] as const;

export function DiscoveryPictureLesson({ onPlay }: { onPlay: () => void }) {
  const [deck, setDeck] = useState<DiscoveryDeck>("fruit");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const { play, stop, audioError } = useDiscoveryAudio();
  const pictures = discoveryDecks[deck];
  const picture = pictures[index]!;

  function resetCard(next: number) {
    stop();
    setIndex(next);
    setRevealed(false);
    setZoomed(false);
  }

  return (
    <section className="gigalearn-play-panel gigalearn-picture-lesson space-y-3" aria-label="Look and say">
      <div className="gigalearn-picture-decks" role="group" aria-label="Choose pictures">
        {deckButtons.map(({ id, label, icon: Icon, tone }) => (
          <button
            key={id}
            className={control}
            type="button"
            data-learn-tone={tone}
            aria-pressed={deck === id}
            onClick={() => { setDeck(id); resetCard(0); }}
          >
            <Icon aria-hidden /> {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="gigalearn-picture-zoom gigalearn-focus"
        aria-label={zoomed ? "Zoom out" : "Zoom picture"}
        aria-pressed={zoomed}
        onClick={() => setZoomed(!zoomed)}
      >
        <img src={picture.image} alt={revealed ? picture.name : "Object to guess"} width="768" height="768" />
        <span className="gigalearn-zoom-symbol">{zoomed ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}</span>
      </button>
      <div className="gigalearn-picture-word" aria-live="polite">
        {revealed ? <strong>{picture.name}</strong> : "What’s this?"}
      </div>
      <div className="gigalearn-picture-actions">
        <button className={control} type="button" aria-label="Previous picture" disabled={index === 0} onClick={() => resetCard(index - 1)}>
          <ChevronLeft aria-hidden />
        </button>
        <button className={control} type="button" data-learn-tone="blue" onClick={() => play("guess")}>
          <Volume2 aria-hidden className="h-4 w-4" /> Hear question
        </button>
        <button
          className={control + " gigalearn-control--primary"}
          data-learn-tone="green"
          type="button"
          onClick={() => { setRevealed(true); play(picture.id); }}
        >
          <Volume2 aria-hidden className="h-5 w-5" /> {revealed ? "Hear again" : "Hear name"}
        </button>
        <button className={control} type="button" aria-label="Next picture" disabled={index === pictures.length - 1} onClick={() => resetCard(index + 1)}>
          <ChevronRight aria-hidden />
        </button>
      </div>
      {audioError && <p role="status" className="text-sm">Audio could not play. A grown-up can say the word aloud.</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm" aria-label="Picture progress">{index + 1} / {pictures.length}</span>
        {deck === "fruit" && revealed && (
          <button className={control} data-learn-tone="pink" type="button" onClick={onPlay}>Play Fruit Finder</button>
        )}
      </div>
    </section>
  );
}
