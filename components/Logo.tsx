import { cn } from "@/lib/utils";
import { brand } from "@/lib/data";

// Bildmarke: Clay-Kachel mit Blitz (Elektrohandwerk + Energie). Funktioniert auf hell & dunkel.
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={brand.name}>
      <rect width="24" height="24" rx="7" fill="var(--color-accent)" />
      <path
        d="M13.6 4.8 L7.4 13.1 h3.4 l-0.9 6.1 L16.6 10.6 h-3.4 L13.6 4.8 Z"
        fill="#fff"
      />
    </svg>
  );
}

// Volles Logo: Bildmarke + Wortmarke (Textfarbe erbt → hell & dunkel tauglich).
export default function Logo({
  className,
  markClassName = "h-8 w-8",
  textClassName = "text-xl",
}: {
  className?: string;
  markClassName?: string;
  textClassName?: string;
}) {
  const [first, second] = brand.name.split("//");
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <span className={cn("font-display font-semibold tracking-tight leading-none", textClassName)}>
        {first}
        {second !== undefined && (
          <>
            <span className="text-accent">//</span>
            {second}
          </>
        )}
      </span>
    </span>
  );
}
