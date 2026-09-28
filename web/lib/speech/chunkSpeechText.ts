/** Split speech into short pieces so mobile engines do not cut off mid-sentence. */

const DEFAULT_CHUNK_CHARS = 180;

export function chunkSpeechText(text: string, maxChars = DEFAULT_CHUNK_CHARS): string[] {
  const plain = text.replace(/\s+/g, " ").trim();
  if (!plain) return [];
  if (plain.length <= maxChars) return [plain];

  const sentences = plain.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  const pushLong = (bit: string) => {
    const words = bit.split(" ");
    let line = "";
    for (const word of words) {
      if (!word) continue;
      if (word.length > maxChars) {
        if (line) {
          chunks.push(line);
          line = "";
        }
        for (let i = 0; i < word.length; i += maxChars) {
          const slice = word.slice(i, i + maxChars).trim();
          if (slice) chunks.push(slice);
        }
        continue;
      }
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars) {
        if (line) chunks.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) chunks.push(line);
  };

  for (const sentence of sentences) {
    const bit = sentence.trim();
    if (!bit) continue;
    if (bit.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      pushLong(bit);
      continue;
    }
    const next = current ? `${current} ${bit}` : bit;
    if (next.length > maxChars) {
      chunks.push(current);
      current = bit;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
