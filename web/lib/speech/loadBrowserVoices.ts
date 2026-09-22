/** Load browser voices; waits for voiceschanged when the first read is empty. */

let voicesChangedHandler: (() => void) | null = null;

function detachVoicesChanged(): void {
  if (typeof window === "undefined" || !voicesChangedHandler) return;
  window.speechSynthesis.removeEventListener("voiceschanged", voicesChangedHandler);
  voicesChangedHandler = null;
}

export function loadBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  const existing = window.speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;

    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      detachVoicesChanged();
      resolve(voices);
    };

    voicesChangedHandler = () => {
      finish(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", voicesChangedHandler);

    window.setTimeout(() => {
      finish(window.speechSynthesis.getVoices());
    }, 700);
  });
}
