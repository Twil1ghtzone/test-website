import { CameraIcon } from "./icons";

type Props = {
  caption?: string;
  className?: string;
  /** Tailwind aspect ratio class, e.g. "aspect-[4/5]" */
  ratio?: string;
  arch?: boolean;
  rounded?: string;
};

/**
 * Eleganter Foto-Platzhalter. Später 1:1 durch <Image> ersetzen:
 * dieselbe Größe/Ratio/Rundung beibehalten.
 */
export default function Placeholder({
  caption,
  className = "",
  ratio = "aspect-[4/5]",
  arch = false,
  rounded = "rounded-2xl",
}: Props) {
  return (
    <div
      className={`ph-pattern relative flex items-center justify-center overflow-hidden border border-line-strong ${ratio} ${
        arch ? "arch" : rounded
      } ${className}`}
    >
      <div className="flex flex-col items-center gap-2 px-6 text-center text-muted">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface/70 text-ink-soft">
          <CameraIcon className="h-5 w-5" />
        </span>
        {caption && <span className="max-w-[14rem] text-xs leading-snug">{caption}</span>}
      </div>
    </div>
  );
}
