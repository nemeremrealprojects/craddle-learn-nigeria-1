import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { youtubeId } from "@/lib/summer-english";

/**
 * Lightweight YouTube embed: shows the poster image first and only loads the
 * official YouTube iframe player after a tap. Keeps lesson pages fast on
 * slower connections, and always plays inside the site (never a new tab).
 */
export function YouTubeEmbed({ url, title, poster }: { url: string; title: string; poster?: string | null }) {
  const id = youtubeId(url);
  const [play, setPlay] = useState(false);

  if (!id) {
    return (
      <video className="h-full w-full" src={url} controls preload="metadata" playsInline poster={poster ?? undefined} />
    );
  }

  if (play) {
    return (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlay(true)}
      aria-label={`Play video: ${title}`}
      className="group relative h-full w-full"
    >
      <img
        src={poster || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt={`Video thumbnail: ${title}`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <span className="absolute inset-0 grid place-items-center bg-navy/35 transition group-hover:bg-navy/25">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-3 font-bold text-gold-foreground shadow-gold">
          <PlayCircle className="h-6 w-6" /> Play lesson video
        </span>
      </span>
    </button>
  );
}
