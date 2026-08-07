import { useState } from "react";
import { Volume2 } from "lucide-react";
import { NUMBER_CARDS, speakNumber, type NumberCard } from "@/lib/summer-maths";

/** Interactive 1–50 number cards: tap a number to hear it and see the quantity. */
export function NumberCards() {
  const [active, setActive] = useState<NumberCard>(NUMBER_CARDS[0]);

  const shown = Math.min(active.value, 12);

  return (
    <div className="rounded-2xl border-2 border-gold/30 bg-gold/5 p-4 sm:p-6">
      <h3 className="font-display text-xl font-bold text-navy">🔢 Fun activity — Number cards 1–50</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap any number to hear it, read it in words and see how many that is.
      </p>

      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {NUMBER_CARDS.map((card) => {
          const isActive = active.value === card.value;
          const isTen = card.value % 10 === 0;
          return (
            <button
              key={card.value}
              type="button"
              onClick={() => {
                setActive(card);
                speakNumber(card);
              }}
              aria-label={`${card.value} — ${card.words}`}
              className={`aspect-square rounded-xl border-2 text-base font-bold transition active:scale-95 sm:text-lg ${
                isActive
                  ? "scale-105 border-navy bg-navy text-navy-foreground shadow-elegant"
                  : isTen
                    ? "border-gold/60 bg-card text-gold-foreground hover:bg-gold/10"
                    : "border-border bg-card text-navy hover:bg-accent"
              }`}
            >
              {card.value}
            </button>
          );
        })}
      </div>

      <div
        key={active.value}
        className="mt-4 animate-fade-in rounded-xl border border-border bg-card p-5 text-center"
      >
        <div className="font-display text-3xl font-bold text-navy">
          {active.value} → {active.words}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-1 text-2xl sm:text-3xl" aria-hidden="true">
          {Array.from({ length: shown }, (_, i) => (
            <span key={i}>{active.emoji}</span>
          ))}
        </div>
        {active.value > shown && (
          <p className="mt-2 text-sm text-muted-foreground">
            …that is {active.value} {active.emoji} altogether!
          </p>
        )}
        <button
          type="button"
          onClick={() => speakNumber(active)}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-navy-foreground"
        >
          <Volume2 className="h-4 w-4" /> Say the number
        </button>
      </div>
    </div>
  );
}
