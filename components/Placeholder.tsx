import Image from "next/image";
import { CameraIcon } from "./icons";
import { Tilt } from "@/components/ui/motion";

type Props = {
  caption?: string;
  className?: string;
  /** Tailwind aspect ratio class, e.g. "aspect-[4/5]" */
  ratio?: string;
  arch?: boolean;
  rounded?: string;
  /** Echtes Foto aus /public. Ohne src bleibt der Platzhalter stehen. */
  src?: string;
  /** Alt-Text — Pflicht, sobald src gesetzt ist; sonst dient caption als Fallback. */
  alt?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * Bild-Slot in einheitlicher Form. Mit `src` wird das Foto gezeigt,
 * ohne `src` derselbe Rahmen als Platzhalter — Größe/Ratio/Rundung bleiben gleich.
 */
export default function Placeholder({
  caption,
  className = "",
  ratio = "aspect-[4/5]",
  arch = false,
  rounded = "rounded-2xl",
  src,
  alt,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: Props) {
  if (src) {
    return (
      <div
        className={`group relative overflow-hidden border border-line ${ratio} ${
          arch ? "arch" : rounded
        } ${className}`}
      >
        <Image
          src={src}
          alt={alt || caption || ""}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
        />
      </div>
    );
  }

  return (
    <div
      className={`ph-pattern relative flex items-center justify-center overflow-hidden border border-line-strong ${ratio} ${
        arch ? "arch" : rounded
      } ${className}`}
    >
      <div className="flex flex-col items-center gap-2 px-6 text-center text-muted">
        <Tilt>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-surface/70 text-ink-soft">
            <CameraIcon className="h-5 w-5" />
          </span>
        </Tilt>
        {caption && <span className="max-w-[14rem] text-xs leading-snug">{caption}</span>}
      </div>
    </div>
  );
}
