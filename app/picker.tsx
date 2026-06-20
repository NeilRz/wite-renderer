"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Model, Product } from "@/lib/data";
import type { Shot, OutfitKey, MakeupKey, HairKey } from "@/lib/prompt";
import { SETTING_PRESETS, POSE_PRESETS } from "@/lib/presets";

const OUTFIT_CHOICES: { key: OutfitKey; label: string }[] = [
  { key: "", label: "Auto (l'IA choisit)" },
  { key: "classique", label: "Classique" },
  { key: "soiree", label: "Soirée" },
  { key: "sportif", label: "Sportif" },
  { key: "urban", label: "Urban" },
  { key: "outdoor", label: "Outdoor" },
  { key: "boho", label: "Boho" },
  { key: "sexy", label: "Sexy" },
];

const MAKEUP_CHOICES: { key: MakeupKey; label: string }[] = [
  { key: "", label: "Auto (l'IA choisit)" },
  { key: "naturel", label: "Naturel" },
  { key: "elegant", label: "Élégant" },
  { key: "party", label: "Party" },
  { key: "sexy", label: "Sexy" },
  { key: "soiree", label: "Soirée" },
  { key: "travail", label: "Travail" },
];

const HAIR_CHOICES: { key: HairKey; label: string }[] = [
  { key: "", label: "Auto (selon mannequin)" },
  { key: "classique", label: "Classique" },
  { key: "sophistique", label: "Sophistiqué" },
  { key: "sport", label: "Sport" },
  { key: "laches", label: "Cheveux relâchés" },
  { key: "queue", label: "Queue de cheval" },
  { key: "chignon", label: "Chignon" },
  { key: "sexy", label: "Sexy" },
];

interface Props {
  models: Model[];
  belts: Product[];
  buckles: Product[];
}

interface HistoryItem {
  dataUrl: string;
  modelId: string;
  beltId: string;
  buckleId: string;
  ts: number;
}

const SHOT_OPTIONS: { key: Shot; label: string }[] = [
  { key: "waist", label: "Ceinture en gros plan" },
  { key: "half", label: "Buste + visage" },
  { key: "full", label: "Plein pied" },
];

const SETTING_KEYS = Object.keys(SETTING_PRESETS);
const POSE_KEYS = Object.keys(POSE_PRESETS);

export function Picker({ models, belts, buckles }: Props) {
  // ---------- selection state ----------
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [outfit, setOutfit] = useState<OutfitKey>("");
  const [makeup, setMakeup] = useState<MakeupKey>("");
  const [hair, setHair] = useState<HairKey>("");
  const [beltId, setBeltId] = useState<string>("");
  const [buckleId, setBuckleId] = useState<string>("");
  const [beltSearch, setBeltSearch] = useState("");
  const [buckleSearch, setBuckleSearch] = useState("");
  const [shot, setShot] = useState<Shot>("waist");
  const [beltMult, setBeltMult] = useState(1.0);
  const [sizeMult, setSizeMult] = useState(1.0);
  const [settingPreset, setSettingPreset] = useState(SETTING_KEYS[0]);
  const [setting, setSetting] = useState(SETTING_PRESETS[SETTING_KEYS[0]]);
  const [posePreset, setPosePreset] = useState(POSE_KEYS[0]);
  const [pose, setPose] = useState(POSE_PRESETS[POSE_KEYS[0]]);
  const [beltDesc, setBeltDesc] = useState("");
  const [buckleDesc, setBuckleDesc] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ---------- generation state ----------
  const [isGenerating, setIsGenerating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- derived data ----------
  const filteredBelts = useMemo(
    () =>
      belts.filter((b) =>
        b.id.toLowerCase().includes(beltSearch.trim().toLowerCase()),
      ),
    [belts, beltSearch],
  );
  const filteredBuckles = useMemo(
    () =>
      buckles.filter((b) =>
        b.id.toLowerCase().includes(buckleSearch.trim().toLowerCase()),
      ),
    [buckles, buckleSearch],
  );
  const beltPicked = useMemo(
    () => belts.find((b) => b.id === beltId) ?? null,
    [belts, beltId],
  );
  const bucklePicked = useMemo(
    () => buckles.find((b) => b.id === buckleId) ?? null,
    [buckles, buckleId],
  );

  // ---------- preset wiring ----------
  function selectSettingPreset(key: string) {
    setSettingPreset(key);
    setSetting(SETTING_PRESETS[key] ?? "");
  }
  function selectPosePreset(key: string) {
    setPosePreset(key);
    setPose(POSE_PRESETS[key] ?? "");
  }

  // ---------- generate ----------
  async function handleGenerate() {
    setErrorMsg(null);
    if (!modelId) return setErrorMsg("Choisis un mannequin.");
    if (!beltId) return setErrorMsg("Choisis une ceinture.");
    if (!buckleId) return setErrorMsg("Choisis une boucle.");
    if (!setting.trim()) return setErrorMsg("Décris le décor.");
    if (!pose.trim()) return setErrorMsg("Décris la pose.");

    setIsGenerating(true);
    setElapsed(0);
    const startedAt = Date.now();
    const tick = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      250,
    );

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          modelId,
          beltId,
          buckleId,
          setting,
          pose,
          shot,
          sizeMult,
          beltMult,
          outfit,
          makeup,
          hair,
          beltDesc: beltDesc.trim() || undefined,
          buckleDesc: buckleDesc.trim() || undefined,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line) as
            | { event: "heartbeat"; elapsed: number }
            | { event: "done"; mimeType: string; imageBase64: string }
            | { event: "error"; message: string };
          if (msg.event === "done") {
            const dataUrl = `data:${msg.mimeType};base64,${msg.imageBase64}`;
            setLatest(dataUrl);
            setHistory((prev) =>
              [
                { dataUrl, modelId, beltId, buckleId, ts: Date.now() },
                ...prev,
              ].slice(0, 20),
            );
          } else if (msg.event === "error") {
            throw new Error(msg.message);
          }
          // heartbeats just keep the connection alive
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setErrorMsg(
          err instanceof Error ? err.message : "Erreur de génération.",
        );
      }
    } finally {
      clearInterval(tick);
      setIsGenerating(false);
      abortRef.current = null;
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  // ---------- UI ----------
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-10">
      {/* Header */}
      <header className="mb-10 flex items-end justify-between border-b border-stone-300 pb-6">
        <div>
          <h1 className="text-4xl font-light tracking-tight">WITE</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-stone-500">
            Générateur de visuels
          </p>
        </div>
        <form action="/api/logout" method="post">
          <button
            type="submit"
            className="text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-800"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[3fr_2fr]">
        {/* LEFT — controls */}
        <div className="space-y-8">
          {/* 1. Mannequin */}
          <Section step="1" title="Mannequin">
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.style_archetype} ({m.age} ans)
                </option>
              ))}
            </select>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-stone-500">
                  Outfit
                </span>
                <select
                  value={outfit}
                  onChange={(e) => setOutfit(e.target.value as OutfitKey)}
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  {OUTFIT_CHOICES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-stone-500">
                  Maquillage
                </span>
                <select
                  value={makeup}
                  onChange={(e) => setMakeup(e.target.value as MakeupKey)}
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  {MAKEUP_CHOICES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-stone-500">
                  Coiffure
                </span>
                <select
                  value={hair}
                  onChange={(e) => setHair(e.target.value as HairKey)}
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  {HAIR_CHOICES.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </Section>

          {/* 2. Belt picker */}
          <Section
            step="2"
            title="Ceinture"
            picked={beltPicked ? `Choisie : ${beltPicked.id}` : null}
          >
            <input
              type="search"
              placeholder="Filtrer par numéro…"
              value={beltSearch}
              onChange={(e) => setBeltSearch(e.target.value)}
              className="mb-3 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <ProductGrid
              items={filteredBelts}
              selectedId={beltId}
              onPick={setBeltId}
            />
          </Section>

          {/* 3. Buckle picker */}
          <Section
            step="3"
            title="Boucle"
            picked={bucklePicked ? `Choisie : ${bucklePicked.id}` : null}
          >
            <input
              type="search"
              placeholder="Filtrer par numéro…"
              value={buckleSearch}
              onChange={(e) => setBuckleSearch(e.target.value)}
              className="mb-3 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            />
            <ProductGrid
              items={filteredBuckles}
              selectedId={buckleId}
              onPick={setBuckleId}
            />
          </Section>

          {/* 4. Setting */}
          <Section step="4" title="Décor">
            <select
              value={settingPreset}
              onChange={(e) => selectSettingPreset(e.target.value)}
              className="mb-2 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {SETTING_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <textarea
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
              rows={4}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </Section>

          {/* 5. Pose */}
          <Section step="5" title="Pose">
            <select
              value={posePreset}
              onChange={(e) => selectPosePreset(e.target.value)}
              className="mb-2 w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              {POSE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <textarea
              value={pose}
              onChange={(e) => setPose(e.target.value)}
              rows={4}
              className="w-full rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </Section>

          {/* 6. Framing */}
          <Section step="6" title="Cadrage">
            <div className="flex flex-wrap gap-2">
              {SHOT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setShot(opt.key)}
                  className={`rounded border px-3 py-2 text-sm ${
                    shot === opt.key
                      ? "border-stone-800 bg-stone-800 text-white"
                      : "border-stone-300 bg-white hover:border-stone-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* 7. Belt width */}
          <Section step="7" title="Largeur de la sangle">
            <SliderRow value={beltMult} onChange={setBeltMult} label="× standard WITE" />
            <p className="mt-1 text-xs text-stone-500">
              1.0 = sangle standard (~2.5 cm). 0.5 = très fine. 2.0 = large.
            </p>
          </Section>

          {/* 8. Buckle size */}
          <Section step="8" title="Taille de la boucle">
            <SliderRow value={sizeMult} onChange={setSizeMult} label="× largeur sangle" />
            <p className="mt-1 text-xs text-stone-500">
              1.0 = boucle aussi large que la sangle. 2.0 = deux fois plus large.
            </p>
          </Section>

          {/* Advanced */}
          <details
            className="rounded border border-stone-300 bg-white px-4 py-3 text-sm"
            open={advancedOpen}
            onToggle={(e) => setAdvancedOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="cursor-pointer select-none font-medium">
              Descriptions précises (optionnel — fidélité produit)
            </summary>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-stone-500">
                  Ceinture
                </span>
                <textarea
                  value={beltDesc}
                  onChange={(e) => setBeltDesc(e.target.value)}
                  placeholder="ex. cuir lisse cognac, ~2.5 cm, finition snap argenté antique"
                  rows={2}
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-stone-500">
                  Boucle
                </span>
                <textarea
                  value={buckleDesc}
                  onChange={(e) => setBuckleDesc(e.target.value)}
                  placeholder="ex. boucle rectangulaire chaîne argent antique, prong horizontal"
                  rows={2}
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2"
                />
              </label>
            </div>
          </details>

          {/* Action */}
          {errorMsg && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {errorMsg}
            </div>
          )}
          <div className="sticky bottom-4 z-10 flex gap-3 rounded-lg border border-stone-300 bg-white/95 p-3 shadow-md backdrop-blur">
            {!isGenerating ? (
              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 rounded bg-stone-900 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white hover:bg-stone-700"
              >
                Générer le visuel
              </button>
            ) : (
              <>
                <div className="flex-1 rounded bg-stone-200 px-6 py-3 text-sm uppercase tracking-wider text-stone-700">
                  Génération en cours… {elapsed}s
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-stone-400 bg-white px-4 py-3 text-sm uppercase tracking-wider hover:border-stone-700"
                >
                  Annuler
                </button>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — output + history */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-stone-500">
              Dernier rendu
            </h2>
            <div className="mt-2 aspect-[3/4] w-full overflow-hidden rounded border border-stone-300 bg-white">
              {latest ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={latest}
                  alt="Dernier rendu"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-stone-400">
                  Aucun rendu pour l'instant
                </div>
              )}
            </div>
            {latest && (
              <a
                href={latest}
                download={`wite-${Date.now()}.png`}
                className="mt-2 inline-block text-xs uppercase tracking-wider text-stone-500 hover:text-stone-800"
              >
                ↓ Télécharger
              </a>
            )}
          </div>

          {history.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-[0.25em] text-stone-500">
                Historique de la session
              </h2>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {history.map((h) => (
                  <button
                    key={h.ts}
                    type="button"
                    onClick={() => setLatest(h.dataUrl)}
                    className="aspect-[3/4] overflow-hidden rounded border border-stone-300 bg-white hover:border-stone-700"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={h.dataUrl}
                      alt={`${h.modelId} / ${h.beltId} / ${h.buckleId}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({
  step,
  title,
  picked,
  children,
}: {
  step: string;
  title: string;
  picked?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider">
          <span className="mr-2 text-stone-400">{step}.</span>
          {title}
        </h3>
        {picked && (
          <span className="text-xs text-stone-500">{picked}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function ProductGrid({
  items,
  selectedId,
  onPick,
}: {
  items: Product[];
  selectedId: string;
  onPick: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-500">
        Aucun résultat.
      </p>
    );
  }
  return (
    <div className="max-h-80 overflow-y-auto rounded border border-stone-200 bg-stone-50 p-2">
      <div className="grid grid-cols-6 gap-2">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className={`aspect-square overflow-hidden rounded border bg-white p-1 transition ${
              selectedId === p.id
                ? "border-stone-900 ring-2 ring-stone-900"
                : "border-stone-200 hover:border-stone-400"
            }`}
            title={p.id}
          >
            <Image
              src={p.url}
              alt={p.id}
              width={120}
              height={120}
              className="h-full w-full object-contain"
              unoptimized
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderRow({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0.5}
        max={2.0}
        step={0.1}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-stone-900"
      />
      <span className="w-16 text-right text-sm tabular-nums">
        {value.toFixed(1)} <span className="text-xs text-stone-500">{label}</span>
      </span>
    </div>
  );
}
