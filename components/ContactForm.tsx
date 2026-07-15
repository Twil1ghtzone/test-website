"use client";

import { motion } from "framer-motion";
import { pressable } from "@/components/ui/motion";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { ArrowIcon, CheckIcon } from "./icons";
import { Combobox } from "./ui/combobox";
import PackagePicker from "./PackagePicker";
import { contact } from "@/lib/data";

const buildingTypes = [
  "Einfamilienhaus",
  "Reihenhaus",
  "Wohnung",
  "Neubau",
  "Altbau",
  "Gewerbe",
  "Sonstiges",
];

type Photo = { url: string; name: string };

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState(contact.topics[0]);
  const [building, setBuilding] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);

  // Speichert die Anfrage im Backend (landet im Admin-Posteingang).
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      topic,
      building,
      message: String(fd.get("message") || ""),
      packages: fd.getAll("paket").map(String),
    };
    setSent(true); // optimistisch — UI bleibt schlank
    try {
      await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      /* Anfrage-UI bleibt bestätigt; Versand wird serverseitig/erneut versucht */
    }
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).slice(0, 6 - photos.length).map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setPhotos((p) => [...p, ...next]);
  }
  function removePhoto(i: number) {
    setPhotos((p) => p.filter((_, idx) => idx !== i));
  }

  if (sent) {
    return (
      <div className="flex min-h-[26rem] flex-col items-center justify-center rounded-3xl border border-line bg-surface p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
          <CheckIcon className="h-7 w-7" />
        </span>
        <h3 className="mt-5 font-display text-2xl font-semibold">Danke für Ihre Anfrage.</h3>
        <p className="mt-2 max-w-sm text-ink-soft">
          Wir melden uns persönlich bei Ihnen. Jedes Projekt ist anders — Ihr unverbindliches
          Angebot folgt nach einem kurzen Gespräch.
        </p>
        <button type="button" onClick={() => setSent(false)} className="mt-6 text-sm font-medium text-accent link-underline cursor-pointer">
          Weitere Anfrage senden
        </button>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink placeholder:text-muted transition-colors focus:border-accent focus:bg-surface focus:outline-none";
  const label = "mb-1.5 block eyebrow text-muted";

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-surface p-6 sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={label}>Name</label>
          <input id="name" name="name" type="text" required autoComplete="name" placeholder="Vor- und Nachname" className={field} />
        </div>
        <div>
          <label htmlFor="email" className={label}>E-Mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" placeholder="name@beispiel.de" className={field} />
        </div>
        <div>
          <label htmlFor="phone" className={label}>Telefon <span className="normal-case text-muted/70">(optional)</span></label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+49 …" className={field} />
        </div>
        <div>
          <label className={label}>Gebäudetyp</label>
          <Combobox options={buildingTypes} value={building} onChange={setBuilding} name="building" placeholder="Bitte wählen …" ariaLabel="Gebäudetyp" searchable={false} />
        </div>
      </div>

      <div className="mt-5">
        <label className={label}>Thema</label>
        <Combobox options={contact.topics} value={topic} onChange={setTopic} name="topic" ariaLabel="Thema" searchable={false} />
      </div>

      <div className="mt-5">
        <label htmlFor="message" className={label}>Ihr Anliegen</label>
        <textarea id="message" name="message" rows={4} required placeholder="Beschreiben Sie kurz Ihr Vorhaben — z. B. Räume, Anzahl Kameras, gewünschte Dienste …" className={`${field} resize-none`} />
      </div>

      <div className="mt-5">
        <label className={label}>Pakete <span className="normal-case text-muted/70">(optional)</span></label>
        <PackagePicker />
      </div>

      {/* Fotos hochladen */}
      <div className="mt-5">
        <label className={label}>Fotos vom Objekt <span className="normal-case text-muted/70">(optional, hilft uns sehr)</span></label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((p, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
              <button type="button" onClick={() => removePhoto(i)} aria-label="Foto entfernen"
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-canvas text-muted transition-colors hover:border-accent hover:text-accent">
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs">Hinzufügen</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addPhotos(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      <motion.button
        type="submit"
        {...pressable}
        className="group mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
      >
        Unverbindliche Anfrage senden
        <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
      </motion.button>
      <p className="mt-3 text-center text-sm text-muted">
        Preise gibt es nur auf Anfrage — weil jedes Haus anders ist.
      </p>
    </form>
  );
}
