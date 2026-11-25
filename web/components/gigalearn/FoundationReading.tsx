"use client";

import { useEffect, useRef, useState } from "react";
import { speakWithGigaLearnVoice, stopGigaLearnVoice } from "@/lib/gigalearn/speechSynthesis";

const story = "Mansa had three mangoes. She put two in a bowl for her brother. She kept one to eat after school.";

export function FoundationReading() {
  const [choice, setChoice] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const audioRequest = useRef<symbol | null>(null);

  useEffect(() => () => {
    if (audioRequest.current) stopGigaLearnVoice();
    audioRequest.current = null;
  }, []);

  async function readStory() {
    if (playing) {
      audioRequest.current = null;
      stopGigaLearnVoice();
      setPlaying(false);
      return;
    }
    const request = Symbol();
    audioRequest.current = request;
    setPlaying(true);
    setAudioError(false);
    const spoken = await speakWithGigaLearnVoice({ text: story, voiceId: "english" }).catch(() => false);
    if (audioRequest.current === request) {
      audioRequest.current = null;
      setPlaying(false);
      setAudioError(!spoken);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-4 sm:p-6" aria-labelledby="foundation-reading">
      <h3 id="foundation-reading" className="text-xl font-bold">Mansa and the mangoes</h3>
      <p>Say the /m/ sound with your lips together. Listen for it at the start of Mansa and mangoes.</p>
      <p className="rounded-xl border border-border p-3 text-lg leading-relaxed">{story}</p>
      <button type="button" className="gigalearn-control gigalearn-control--primary px-4" data-learn-tone="pink" onClick={() => void readStory()}>
        {playing ? "Stop reading" : "Read the story aloud"}
      </button>
      {audioError && <p role="status">Audio is unavailable on this device. You can read the story above with an adult.</p>}
      <fieldset className="space-y-2">
        <legend className="font-semibold">Why did Mansa put mangoes in the bowl?</legend>
        <div className="grid gap-2">
          {["To share them with her brother", "To take all three to school", "To keep them all for herself"].map((answer) => (
            <button
              key={answer}
              className="gigalearn-control gigalearn-control--choice px-4 py-2"
              data-learn-tone="pink"
              type="button"
              aria-pressed={choice === answer}
              onClick={() => setChoice(answer)}
            >
              {answer}
            </button>
          ))}
        </div>
        <p role="status" className="min-h-12">
          {choice === null ? "" : choice === "To share them with her brother"
            ? "Yes. The second sentence says the two mangoes were for her brother."
            : "Read the second sentence again. Who were the two mangoes for?"}
        </p>
      </fieldset>
      <p>Retell the story to a partner. Change the fruit and tell them who gets each piece.</p>
    </section>
  );
}
