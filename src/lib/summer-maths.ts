/**
 * Shared constants + helpers for the Summer Mathematics course.
 * Content lives in the database (course / lessons / quizzes / assignments), so
 * future maths lessons only need new rows — no page redesign required.
 */

export const SUMMER_MATHS_SLUG = "summer-maths";

/** Full published syllabus for the 6-week Summer Mathematics course. */
export const SUMMER_MATHS_TOTAL_LESSONS = 12;

export interface VocabularyWord {
  word: string;
  meaning: string;
}

/** Lesson 1 vocabulary with child-friendly explanations. */
export const NUMBER_VOCABULARY: VocabularyWord[] = [
  { word: "Number", meaning: "A number tells us how many things there are, like 3 apples." },
  { word: "Count", meaning: "To count is to say numbers in order: 1, 2, 3, 4…" },
  { word: "One", meaning: "One means a single thing — just 1." },
  { word: "Ten", meaning: "Ten is 10 — like all the fingers on both of your hands." },
  { word: "Twenty", meaning: "Twenty is 20 — that is two groups of ten." },
  { word: "Thirty", meaning: "Thirty is 30 — that is three groups of ten." },
  { word: "Forty", meaning: "Forty is 40 — that is four groups of ten." },
  { word: "Fifty", meaning: "Fifty is 50 — that is five groups of ten." },
  { word: "More", meaning: "More means a bigger number. 8 is more than 5." },
  { word: "Less", meaning: "Less means a smaller number. 4 is less than 9." },
  { word: "Equal", meaning: "Equal means exactly the same amount. 6 = 6." },
];

const ONES = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty"];

/** Turns 1–50 into its English word, e.g. 25 → "Twenty-Five". */
export function numberToWords(n: number): string {
  if (n < 20) return ONES[n] ?? String(n);
  const tens = Math.floor(n / 10);
  const rest = n % 10;
  return rest === 0 ? TENS[tens] : `${TENS[tens]}-${ONES[rest]}`;
}

const EMOJIS = ["🍎", "⭐", "🎈", "🐦", "🍌", "🎁", "🌻", "🐟", "🚗", "🧸", "🍇", "🎉"];

export interface NumberCard {
  value: number;
  words: string;
  emoji: string;
}

/** Interactive number cards 1–50 used in the Lesson 1 fun activity. */
export const NUMBER_CARDS: NumberCard[] = Array.from({ length: 50 }, (_, i) => {
  const value = i + 1;
  return {
    value,
    words: numberToWords(value),
    emoji: value === 50 ? "🎉" : EMOJIS[i % EMOJIS.length],
  };
});

/** Speaks a number and its word using the browser voice, if available. */
export function speakNumber(card: NumberCard) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(`${card.value}. ${card.words}.`);
  u.lang = "en-GB";
  u.rate = 0.8;
  u.pitch = 1.1;
  synth.speak(u);
}
