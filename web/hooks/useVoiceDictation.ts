"use client";

import { speechErrorMessage } from "@/lib/chat/voiceDictationErrors";
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionCtor = new () => SpeechRecognition;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

async function ensureMicrophonePermission(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return null;
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return speechErrorMessage("not-allowed");
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return speechErrorMessage("audio-capture");
    }
    return "Could not access the microphone. Check browser permissions and try again.";
  }
}

type UseVoiceDictationOptions = {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  onListeningChange?: (listening: boolean) => void;
};

export function useVoiceDictation({
  onTranscript,
  onError,
  onListeningChange,
}: UseVoiceDictationOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const callbacksRef = useRef({ onTranscript, onError, onListeningChange });
  callbacksRef.current = { onTranscript, onError, onListeningChange };

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
  }, []);

  const setListeningState = useCallback((next: boolean) => {
    setListening(next);
    callbacksRef.current.onListeningChange?.(next);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListeningState(false);
  }, [setListeningState]);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      callbacksRef.current.onError?.(
        "Voice input is not supported in this browser. Try Chrome or Safari."
      );
      return false;
    }

    const permissionError = await ensureMicrophonePermission();
    if (permissionError) {
      callbacksRef.current.onError?.(permissionError);
      return false;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore stale instance */
    }

    const recognition = new Ctor();
    recognition.lang =
      typeof navigator !== "undefined" && navigator.language
        ? navigator.language
        : "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result?.isFinal) continue;
        const chunk = result[0]?.transcript?.trim();
        if (chunk) finalText = finalText ? `${finalText} ${chunk}` : chunk;
      }
      if (finalText) callbacksRef.current.onTranscript(finalText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        callbacksRef.current.onError?.(speechErrorMessage(event.error));
      }
      setListeningState(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListeningState(false);
      recognitionRef.current = null;
    };

    try {
      recognitionRef.current = recognition;
      recognition.start();
      setListeningState(true);
      return true;
    } catch {
      callbacksRef.current.onError?.("Could not start voice input. Try again.");
      setListeningState(false);
      recognitionRef.current = null;
      return false;
    }
  }, [setListeningState]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    void start();
  }, [listening, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return { supported, listening, toggle, stop, start };
}
