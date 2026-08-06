import { useState } from "react";
import { Volume2 } from "lucide-react";
import { ALPHABET_CARDS, VOWELS, speakCard, type AlphabetCard } from "@/lib/summer-english";

/** Interactive A–Z cards: tap a letter to hear its sound and see a picture word. */
export function AlphabetCards() {
  const [active, setActive] = useState<AlphabetCard>(ALPHABET_CARDS[0]);

  return (
    <div className="rounded-2xl border-2 border-gold/30 bg-gold/5 p-4 sm:p-6">
      <h3 className="font-display text-xl font-bold text-navy">🎈 Fun activity — Alphabet cards</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap any letter to hear its sound and see a picture word.
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-9">
        {ALPHABET_CARDS.map((card) => {
          const isVowel = VOWELS.includes(card.letter);
          const isActive = active.letter === card.letter;
          return (
            <button
              key={card.letter}
              type="button"
              onClick={() => {
                setActive(card);
                speakCard(card);
              }}
              aria-label={`${card.letter} for ${card.word}`}
              className={`aspect-square rounded-xl border-2 text-lg font-bold transition active:scale-95 sm:text-xl ${
                isActive
                  ? "border-navy bg-navy text-navy-foreground shadow-elegant"
                  : isVowel
                    ? "border-gold/60 bg-card text-gold-foreground hover:bg-gold/10"
                    : "border-border bg-card text-navy hover:bg-accent"
              }`}
            >
              {card.letter}
              <span className="block text-[10px] font-semibold opacity-70">{card.letter.toLowerCase()}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-5 text-center sm:flex-row sm:text-left">
        <div className="text-5xl" aria-hidden="true">
          {active.emoji}
        </div>
        <div className="flex-1">
          <div className="font-display text-2xl font-bold text-navy">
            {active.letter} {active.letter.toLowerCase()} — {active.word}
          </div>
          <p className="text-sm text-muted-foreground">
            {VOWELS.includes(active.letter) ? "This letter is a vowel." : "This letter is a consonant."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => speakCard(active)}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground"
        >
          <Volume2 className="h-4 w-4" /> Play sound
        </button>
      </div>
    </div>
  );
}
