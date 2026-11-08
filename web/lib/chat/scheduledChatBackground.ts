export const CHAT_BACKGROUND_TIME_ZONE = "Africa/Accra";
export const CHAT_BACKGROUND_WINDOWS = [
  { start: 6 * 60, end: 8 * 60 },
  { start: 15 * 60, end: 16 * 60 },
] as const;

const BACKGROUNDS: Record<string, string> = {
  Wednesday: "/chat-backgrounds/wednesday-heritage.svg",
  Friday: "/chat-backgrounds/friday-makkah.svg",
  Saturday: "/chat-backgrounds/saturday-cross.svg",
  Sunday: "/chat-backgrounds/sunday-catholic.svg",
};

export function getScheduledChatBackground(date: Date): string | null {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CHAT_BACKGROUND_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const image = BACKGROUNDS[values.weekday];
  if (!image) return null;
  const minuteOfDay = Number(values.hour) * 60 + Number(values.minute);
  return CHAT_BACKGROUND_WINDOWS.some(
    ({ start, end }) => minuteOfDay >= start && minuteOfDay < end
  )
    ? image
    : null;
}
