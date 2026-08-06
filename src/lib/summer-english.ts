/**
 * Shared constants + helpers for the Summer English course.
 * Keeping this in one place means future lessons only need new rows in the
 * database (or the admin video dashboard) — no page redesign required.
 */

export const SUMMER_ENGLISH_SLUG = "summer-english";

/**
 * Full published syllabus for the 6-week Summer English course.
 * Certificates unlock only when every one of these lessons is completed
 * (quiz passed + assignment submitted). Raise/lower as lessons are added.
 */
export const SUMMER_ENGLISH_TOTAL_LESSONS = 12;

export const PASS_PERCENT = 70;

export const SUBMISSION_BUCKET = "submissions";

export const ACCEPTED_UPLOAD_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

export const ACCEPTED_UPLOAD_LABEL = "PDF, DOCX, JPG or PNG";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Extracts the 11-character YouTube video id from any common URL shape. */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/,
  );
  return m ? m[1] : null;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export const VOWELS = ["A", "E", "I", "O", "U"];

export interface AlphabetCard {
  letter: string;
  word: string;
  emoji: string;
}

export const ALPHABET_CARDS: AlphabetCard[] = [
  { letter: "A", word: "Apple", emoji: "🍎" },
  { letter: "B", word: "Ball", emoji: "⚽" },
  { letter: "C", word: "Cat", emoji: "🐱" },
  { letter: "D", word: "Dog", emoji: "🐶" },
  { letter: "E", word: "Egg", emoji: "🥚" },
  { letter: "F", word: "Fish", emoji: "🐟" },
  { letter: "G", word: "Goat", emoji: "🐐" },
  { letter: "H", word: "Hat", emoji: "👒" },
  { letter: "I", word: "Ice", emoji: "🧊" },
  { letter: "J", word: "Jug", emoji: "🫖" },
  { letter: "K", word: "Kite", emoji: "🪁" },
  { letter: "L", word: "Lion", emoji: "🦁" },
  { letter: "M", word: "Mango", emoji: "🥭" },
  { letter: "N", word: "Nest", emoji: "🪹" },
  { letter: "O", word: "Orange", emoji: "🍊" },
  { letter: "P", word: "Pen", emoji: "🖊️" },
  { letter: "Q", word: "Queen", emoji: "👑" },
  { letter: "R", word: "Rain", emoji: "🌧️" },
  { letter: "S", word: "Sun", emoji: "☀️" },
  { letter: "T", word: "Tree", emoji: "🌳" },
  { letter: "U", word: "Umbrella", emoji: "☂️" },
  { letter: "V", word: "Van", emoji: "🚐" },
  { letter: "W", word: "Water", emoji: "💧" },
  { letter: "X", word: "Box", emoji: "📦" },
  { letter: "Y", word: "Yam", emoji: "🍠" },
  { letter: "Z", word: "Zebra", emoji: "🦓" },
];

/** Speaks a letter and its example word using the browser voice, if available. */
export function speakCard(card: AlphabetCard) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(`${card.letter}. ${card.letter} for ${card.word}.`);
  u.lang = "en-GB";
  u.rate = 0.8;
  u.pitch = 1.1;
  synth.speak(u);
}
