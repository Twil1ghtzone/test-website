// Minimaler className-Helper (kein clsx/tailwind-merge nötig für unseren Bedarf).
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
