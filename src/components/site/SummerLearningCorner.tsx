import { useEffect, useRef, useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { youtubeId } from "@/lib/summer-english";
import { cn } from "@/lib/utils";

const VIDEO_URL = "https://www.youtube.com/watch?v=mVhh0oATqBI";
const VIDEO_TITLE = "Featured Summer Video – Helping children learn through music and fun.";

export function SummerLearningCorner() {
  const sectionRef = useRef<HTMLElement>(null);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);

  const id = youtubeId(VIDEO_URL);
  const embedUrl = id
    ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
    : null;
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const thumbnailUrl = id
    ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg`
    : null;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fallback: ensure content is visible even if observers are blocked.
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-summer-yellow via-background to-summer-sky py-16 md:py-20",
        visible ? "animate-fade-in" : "opacity-0",
      )}
      aria-labelledby="summer-title"
    >
      {/* Decorative illustrations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <Sun className="absolute -right-8 -top-8 h-32 w-32 text-summer-yellow-dark opacity-60 md:h-48 md:w-48" />
        <Cloud className="absolute left-4 top-10 h-16 w-24 text-white opacity-80 md:left-12 md:top-16 md:h-20 md:w-32" />
        <Cloud className="absolute bottom-16 right-8 h-14 w-20 text-white opacity-70 md:bottom-24 md:right-20 md:h-16 md:w-24" />
        <Children className="absolute bottom-0 left-8 h-24 w-32 text-navy/10 md:left-24 md:h-32 md:w-44" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-summer-sky-dark backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-summer-yellow-dark" />
          Holiday learning
        </span>

        <h2
          id="summer-title"
          className="mt-4 font-display text-3xl font-bold text-navy md:text-4xl"
        >
          ☀️ Summer Learning Corner
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground md:text-lg">
          Learning continues even during the holidays! Enjoy this fun educational summer song
          specially selected for our pupils.
        </p>

        <div className="mt-8">
          <div className="mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-summer-sky/30 bg-black/5 shadow-elegant">
            {playing && embedUrl ? (
              <iframe
                className="h-full w-full"
                src={embedUrl}
                title={VIDEO_TITLE}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                className="group relative grid h-full w-full place-items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-summer-sky-dark focus-visible:ring-offset-2"
                aria-label={`Play video: ${VIDEO_TITLE}`}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="absolute inset-0 bg-navy/10 transition group-hover:bg-navy/20" />
                <span className="relative z-10 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient text-gold-foreground shadow-gold transition group-hover:scale-105 group-focus-visible:scale-105 md:h-20 md:w-20">
                  <Play className="h-7 w-7 fill-current md:h-8 md:w-8" />
                </span>
              </button>
            )}
          </div>

          <p className="mt-4 text-sm font-medium text-muted-foreground">{VIDEO_TITLE}</p>

          {id ? (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-summer-sky bg-white/70 px-5 py-2.5 text-sm font-semibold text-navy backdrop-blur transition hover:bg-white hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-summer-sky-dark focus-visible:ring-offset-2"
            >
              Watch on YouTube <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Sun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
      <circle cx="50" cy="50" r="22" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = 50 + Math.cos(angle) * 28;
        const y1 = 50 + Math.sin(angle) * 28;
        const x2 = 50 + Math.cos(angle) * 40;
        const y2 = 50 + Math.sin(angle) * 40;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="5" strokeLinecap="round" />;
      })}
    </svg>
  );
}

function Cloud({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 80" fill="currentColor" aria-hidden="true">
      <path d="M85 62H25c-11 0-20-9-20-20 0-10 7-18 17-19C23 11 36 2 52 2c14 0 26 8 31 20 3-1 6-2 10-2 13 0 24 11 24 24s-11 24-24 24h-8z" />
    </svg>
  );
}

function Children({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 100" fill="currentColor" aria-hidden="true">
      <circle cx="35" cy="28" r="10" />
      <rect x="25" y="40" width="20" height="28" rx="6" />
      <circle cx="80" cy="24" r="10" />
      <rect x="70" y="36" width="20" height="32" rx="6" />
      <circle cx="125" cy="30" r="10" />
      <rect x="115" y="42" width="20" height="26" rx="6" />
      <rect x="20" y="70" width="120" height="8" rx="4" />
    </svg>
  );
}
