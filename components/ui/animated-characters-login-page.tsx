"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, X } from "lucide-react";
import Logo from "@/components/Logo";
import { brand } from "@/lib/data";
import { PasswordStrengthInput, getPasswordScore } from "@/components/ui/password-strength-input";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }: PupilProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calc = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const p = pupilRef.current.getBoundingClientRect();
    const dx = mouseX - (p.left + p.width / 2);
    const dy = mouseY - (p.top + p.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const a = Math.atan2(dy, dx);
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
  };
  const pos = calc();
  return (
    <div ref={pupilRef} className="rounded-full" style={{ width: size, height: size, backgroundColor: pupilColor, transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 0.1s ease-out" }} />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY }: EyeBallProps) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calc = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const e = eyeRef.current.getBoundingClientRect();
    const dx = mouseX - (e.left + e.width / 2);
    const dy = mouseY - (e.top + e.height / 2);
    const dist = Math.min(Math.sqrt(dx ** 2 + dy ** 2), maxDistance);
    const a = Math.atan2(dy, dx);
    return { x: Math.cos(a) * dist, y: Math.sin(a) * dist };
  };
  const pos = calc();
  return (
    <div ref={eyeRef} className="flex items-center justify-center rounded-full transition-all duration-150" style={{ width: size, height: isBlinking ? 2 : size, backgroundColor: eyeColor, overflow: "hidden" }}>
      {!isBlinking && (
        <div className="rounded-full" style={{ width: pupilSize, height: pupilSize, backgroundColor: pupilColor, transform: `translate(${pos.x}px, ${pos.y}px)`, transition: "transform 0.1s ease-out" }} />
      )}
    </div>
  );
};

export function Component({
  onSuccess,
  onClose,
  mode = "login",
}: {
  onSuccess?: () => void;
  onClose?: () => void;
  mode?: "login" | "register";
}) {
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const rand = () => Math.random() * 4000 + 3000;
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => { setIsPurpleBlinking(true); setTimeout(() => { setIsPurpleBlinking(false); schedule(); }, 150); }, rand());
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const rand = () => Math.random() * 4000 + 3000;
    const schedule = (): ReturnType<typeof setTimeout> =>
      setTimeout(() => { setIsBlackBlinking(true); setTimeout(() => { setIsBlackBlinking(false); schedule(); }, 150); }, rand());
    const t = schedule();
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => { setIsPurplePeeking(true); setTimeout(() => setIsPurplePeeking(false), 800); }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    }
    setIsPurplePeeking(false);
  }, [password, showPassword, isPurplePeeking]);

  const calcPos = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const dx = mouseX - (rect.left + rect.width / 2);
    const dy = mouseY - (rect.top + rect.height / 3);
    return {
      faceX: Math.max(-15, Math.min(15, dx / 20)),
      faceY: Math.max(-10, Math.min(10, dy / 30)),
      bodySkew: Math.max(-6, Math.min(6, -dx / 120)),
    };
  };
  const purplePos = calcPos(purpleRef);
  const blackPos = calcPos(blackRef);
  const yellowPos = calcPos(yellowRef);
  const orangePos = calcPos(orangeRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    // PROTOTYP: Mock-Login. Später durch echte Authentifizierung ersetzen.
    if (email === "erik@gmail.com" && password === "1234") {
      onSuccess?.();
    } else {
      setError("E-Mail oder Passwort ist falsch. Bitte erneut versuchen.");
    }
    setIsLoading(false);
  };

  // Registrierung (Prototyp)
  const score = getPasswordScore(password);
  const canRegister = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && score === 4;
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (canRegister) onSuccess?.();
  };

  // Lustige Sprechblase, die das Passwort beim Erstellen kommentiert
  const speech = !isRegister
    ? null
    : password.length === 0
      ? "Tipp ein Passwort — ich schau auch nicht 🙈"
      : score <= 1
        ? "Interessantes Passwort … mutig! 🤔"
        : score === 2
          ? "Geht schon — aber sicherer wäre besser!"
          : score === 3
            ? "Schon ziemlich stark! 💪"
            : "Perfekt — richtig sicher! 🔒";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Linke Seite — dunkel mit Charakteren */}
      <div className="relative hidden flex-col justify-between bg-night p-12 text-canvas lg:flex">
        <div className="relative z-20">
          <Logo textClassName="text-lg" />
        </div>

        <div className="relative z-20 flex h-[500px] items-end justify-center">
          {/* Sprechblase — kommentiert das Passwort beim Erstellen */}
          {speech && (
            <div
              key={speech}
              className="bubble-pop absolute left-1/2 top-6 z-30 max-w-[18rem] -translate-x-1/2 rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-ink shadow-lg"
            >
              {speech}
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
            </div>
          )}
          <div className="relative" style={{ width: 550, height: 400 }}>
            <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: 70, width: 180, height: isTyping || (password.length > 0 && !showPassword) ? 440 : 400, backgroundColor: "#6C3FF5", borderRadius: "10px 10px 0 0", zIndex: 1, transform: password.length > 0 && showPassword ? "skewX(0deg)" : isTyping || (password.length > 0 && !showPassword) ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)` : `skewX(${purplePos.bodySkew || 0}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-8 transition-all duration-700 ease-in-out" style={{ left: password.length > 0 && showPassword ? 20 : isLookingAtEachOther ? 55 : 45 + purplePos.faceX, top: password.length > 0 && showPassword ? 35 : isLookingAtEachOther ? 65 : 40 + purplePos.faceY }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} forceLookX={password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined} forceLookY={password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} pupilColor="#2D2D2D" isBlinking={isPurpleBlinking} forceLookX={password.length > 0 && showPassword ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined} forceLookY={password.length > 0 && showPassword ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
              </div>
            </div>

            <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: 240, width: 120, height: 310, backgroundColor: "#2D2D2D", borderRadius: "8px 8px 0 0", zIndex: 2, transform: password.length > 0 && showPassword ? "skewX(0deg)" : isLookingAtEachOther ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)` : isTyping || (password.length > 0 && !showPassword) ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)` : `skewX(${blackPos.bodySkew || 0}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-6 transition-all duration-700 ease-in-out" style={{ left: password.length > 0 && showPassword ? 10 : isLookingAtEachOther ? 32 : 26 + blackPos.faceX, top: password.length > 0 && showPassword ? 28 : isLookingAtEachOther ? 12 : 32 + blackPos.faceY }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} pupilColor="#2D2D2D" isBlinking={isBlackBlinking} forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} pupilColor="#2D2D2D" isBlinking={isBlackBlinking} forceLookX={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? 0 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : isLookingAtEachOther ? -4 : undefined} />
              </div>
            </div>

            <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: 0, width: 240, height: 200, zIndex: 3, backgroundColor: "#FF9B6B", borderRadius: "120px 120px 0 0", transform: password.length > 0 && showPassword ? "skewX(0deg)" : `skewX(${orangePos.bodySkew || 0}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-8 transition-all duration-200 ease-out" style={{ left: password.length > 0 && showPassword ? 50 : 82 + (orangePos.faceX || 0), top: password.length > 0 && showPassword ? 85 : 90 + (orangePos.faceY || 0) }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
              </div>
            </div>

            <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out" style={{ left: 310, width: 140, height: 230, backgroundColor: "#E8D754", borderRadius: "70px 70px 0 0", zIndex: 4, transform: password.length > 0 && showPassword ? "skewX(0deg)" : `skewX(${yellowPos.bodySkew || 0}deg)`, transformOrigin: "bottom center" }}>
              <div className="absolute flex gap-6 transition-all duration-200 ease-out" style={{ left: password.length > 0 && showPassword ? 20 : 52 + (yellowPos.faceX || 0), top: password.length > 0 && showPassword ? 35 : 40 + (yellowPos.faceY || 0) }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={password.length > 0 && showPassword ? -5 : undefined} forceLookY={password.length > 0 && showPassword ? -4 : undefined} />
              </div>
              <div className="absolute h-[4px] w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out" style={{ left: password.length > 0 && showPassword ? 10 : 40 + (yellowPos.faceX || 0), top: password.length > 0 && showPassword ? 88 : 88 + (yellowPos.faceY || 0) }} />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-white/50">
          <span>Admin-Bereich</span>
          <span>{brand.name}</span>
        </div>
        <div className="absolute right-1/4 top-1/4 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Rechte Seite — Formular */}
      <div className="relative flex items-center justify-center bg-canvas p-8">
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Schließen" className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-ink cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        )}
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center">
            <h1 className="mb-2 font-display text-3xl font-semibold tracking-tight">
              {isRegister ? "Konto erstellen" : "Willkommen zurück"}
            </h1>
            <p className="text-sm text-muted">{isRegister ? "Legen Sie Ihre Zugangsdaten an" : "Bitte melden Sie sich an"}</p>
          </div>

          {isRegister ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Name</Label>
                <Input id="reg-name" type="text" placeholder="Vor- und Nachname" value={name} autoComplete="off"
                  onChange={(e) => setName(e.target.value)} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">E-Mail</Label>
                <Input id="reg-email" type="email" placeholder="name@beispiel.de" value={email} autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required className="h-12" />
              </div>
              <PasswordStrengthInput value={password} onChange={setPassword} />
              <Button type="submit" className="w-full" size="lg" disabled={!canRegister}>
                Konto erstellen
              </Button>
              <p className="text-center text-xs text-muted">Prototyp — noch ohne Backend.</p>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input id="email" type="email" placeholder="name@beispiel.de" value={email} autoComplete="off"
                    onChange={(e) => setEmail(e.target.value)} onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)} required className="h-12" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Passwort</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)} required className="h-12 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-ink cursor-pointer">
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <Label htmlFor="remember" className="cursor-pointer font-normal">30 Tage angemeldet bleiben</Label>
                  </div>
                  <a href="#" className="text-sm font-medium text-accent hover:underline">Passwort vergessen?</a>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? "Anmelden …" : "Anmelden"}
                </Button>
              </form>
              <p className="mt-6 text-center text-xs text-muted">Prototyp — Testzugang: erik@gmail.com / 1234</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Component;
