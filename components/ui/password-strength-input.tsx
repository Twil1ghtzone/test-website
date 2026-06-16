"use client";

import { useId, useMemo, useState } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const requirements = [
  { regex: /.{8,}/, text: "Mindestens 8 Zeichen" },
  { regex: /[0-9]/, text: "Mindestens 1 Zahl" },
  { regex: /[a-z]/, text: "Mindestens 1 Kleinbuchstabe" },
  { regex: /[A-Z]/, text: "Mindestens 1 Großbuchstabe" },
];

export function getPasswordScore(pass: string) {
  return requirements.filter((r) => r.regex.test(pass)).length;
}

export function PasswordStrengthInput({
  value,
  onChange,
  label = "Passwort",
  placeholder = "Passwort wählen",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  const checks = useMemo(() => requirements.map((r) => ({ met: r.regex.test(value), text: r.text })), [value]);
  const score = checks.filter((c) => c.met).length;

  const color =
    score === 0 ? "bg-line-strong" : score <= 1 ? "bg-red-500" : score <= 2 ? "bg-orange-500" : score === 3 ? "bg-amber-500" : "bg-emerald-500";
  const text =
    score === 0 ? "Passwort eingeben" : score <= 2 ? "Schwaches Passwort" : score === 3 ? "Mittleres Passwort" : "Starkes Passwort";

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-2">
        <Input
          id={id}
          className="h-11 pe-10"
          placeholder={placeholder}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={`${id}-desc`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Passwort verbergen" : "Passwort anzeigen"}
          className="absolute inset-y-0 end-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-ink cursor-pointer"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <div className="mb-3 mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={4}>
        <div className={`h-full ${color} transition-all duration-500 ease-out`} style={{ width: `${(score / 4) * 100}%` }} />
      </div>

      <p id={`${id}-desc`} className="mb-2 text-sm font-medium text-ink">{text}. Muss enthalten:</p>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {c.met ? <Check size={15} className="text-emerald-500" /> : <X size={15} className="text-muted" />}
            <span className={`text-xs ${c.met ? "text-emerald-600" : "text-muted"}`}>{c.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrengthInput;
