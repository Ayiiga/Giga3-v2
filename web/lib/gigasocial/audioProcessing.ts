"use client";

import { resolveAudioContentType } from "@/lib/gigasocial/constants";

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i] ?? 0));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function trimAudioBuffer(buffer: AudioBuffer, maxDurationSec: number): AudioBuffer {
  const frameCount = Math.min(
    buffer.length,
    Math.max(1, Math.floor(buffer.sampleRate * maxDurationSec))
  );
  const trimmed = new AudioBuffer({
    length: frameCount,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    trimmed.copyToChannel(buffer.getChannelData(channel).subarray(0, frameCount), channel);
  }
  return trimmed;
}

/** Normalize MIME from file metadata or extension; throws if unsupported. */
export function assertSupportedAudioFile(file: File): string {
  const contentType = resolveAudioContentType(file);
  if (!contentType) {
    throw new Error("Unsupported audio type. Use MP3, M4A, WAV, or OGG.");
  }
  return contentType;
}

/**
 * Ensures audio is at most `maxDurationSec` long. Longer clips are trimmed to WAV.
 */
export async function prepareAudioForPhotoPost(
  file: File,
  maxDurationSec: number
): Promise<{ file: File; durationSec: number; trimmed: boolean }> {
  const contentType = assertSupportedAudioFile(file);
  const normalized =
    file.type === contentType ? file : new File([file], file.name, { type: contentType });

  const arrayBuffer = await normalized.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const durationSec = decoded.duration;
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      throw new Error("Could not verify audio duration. Try another file.");
    }
    if (durationSec <= maxDurationSec + 0.05) {
      return { file: normalized, durationSec, trimmed: false };
    }

    const trimmedBuffer = trimAudioBuffer(decoded, maxDurationSec);
    const wavBlob = audioBufferToWav(trimmedBuffer);
    const baseName = normalized.name.replace(/\.[^.]+$/, "") || "music";
    const trimmedFile = new File([wavBlob], `${baseName}-15s.wav`, { type: "audio/wav" });
    return { file: trimmedFile, durationSec: maxDurationSec, trimmed: true };
  } finally {
    await audioContext.close();
  }
}
