import { useState } from "react";
import type { DashboardState, Rarity, SealKind, Species, Status, TaxonomyEntry } from "./types.js";
import { Sprite } from "./sprite.js";

const RARITY_COUNT: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 3, legendary: 4 };
const dexNo = (n: number): string => `#${String(n).padStart(3, "0")}`;

export function TypeBadge({ entry }: { entry: TaxonomyEntry }) {
  return (
    <span className="badge" style={{ background: entry.color }}>
      {entry.label}
    </span>
  );
}

export function RarityDots({ rarity }: { rarity: Rarity }) {
  const filled = RARITY_COUNT[rarity];
  return (
    <span className={`rarity rarity-${rarity}`} title={rarity}>
      {"●".repeat(filled)}
      <span className="dim">{"○".repeat(4 - filled)}</span>
    </span>
  );
}

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill pill-${status}`}>{status === "nemesis" ? "NEMESIS" : status}</span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function TrainerCard({ trainer }: { trainer: DashboardState["trainer"] }) {
  const next = trainer.next;
  const pct = next
    ? Math.min(
        100,
        Math.round(((trainer.xp - next.floor) / Math.max(1, next.ceil - next.floor)) * 100),
      )
    : 100;
  return (
    <div className="trainer">
      <div className="trainer-top">
        <span className="trainer-name">{trainer.name}</span>
        <span className="trainer-rank">{trainer.rank}</span>
      </div>
      <div className="trainer-flavor">“{trainer.title}”</div>
      <div className="xpbar">
        <div className="xpbar-fill" style={{ width: `${String(pct)}%` }} />
      </div>
      <div className="xp-label">
        {next
          ? `${String(trainer.xp)} XP · ${String(Math.max(0, next.ceil - trainer.xp))} to ${next.title}`
          : `${String(trainer.xp)} XP · max rank`}
      </div>
      <div className="trainer-stats">
        <Stat label="Caught" value={trainer.caught} />
        <Stat label="Sealed" value={trainer.sealed} />
        <Stat label="Sightings" value={trainer.encounters} />
        <Stat label="Streak" value={trainer.streak.current} />
      </div>
      {trainer.badges.length > 0 && (
        <div className="badges">
          {trainer.badges.map((b) => (
            <span key={b.id} className="trophy">
              🏅 {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RegionalMeter({
  regional,
  taxonomy,
}: {
  regional: DashboardState["regional"];
  taxonomy: DashboardState["taxonomy"];
}) {
  return (
    <div className="regional">
      <div className="section-title">
        Regional dex · {regional.covered}/{regional.total}
        {regional.complete ? " ✓" : ""}
      </div>
      <div className="regional-grid">
        {regional.byType.map((t) => {
          const entry = taxonomy[t.type];
          const on = t.count > 0;
          return (
            <div
              key={t.type}
              className={`region-cell ${on ? "on" : "off"}`}
              title={`${entry.label}: ${String(t.count)}`}
              style={on ? { borderColor: entry.color } : undefined}
            >
              <span
                className="region-dot"
                style={{ background: on ? entry.color : "transparent" }}
              />
              {entry.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function DexGrid({
  state,
  selectedId,
  onSelect,
}: {
  state: DashboardState;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [type, setType] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = state.species.filter(
    (s) =>
      (type === "all" || s.type === type) &&
      (rarity === "all" || s.rarity === rarity) &&
      (status === "all" || s.status === status),
  );
  const emptySlots = Math.max(2, Math.ceil((filtered.length + 2) / 6) * 6 - filtered.length);

  return (
    <div className="dexgrid-wrap">
      <div className="filters">
        <Select value={type} onChange={setType} options={["all", ...state.bugTypes]} />
        <Select value={rarity} onChange={setRarity} options={["all", ...state.rarities]} />
        <Select value={status} onChange={setStatus} options={["all", ...state.statuses]} />
      </div>
      <div className="dexgrid">
        {filtered.map((s) => (
          <button
            key={s.id}
            className={`cell status-${s.status} ${s.id === selectedId ? "sel" : ""}`}
            onClick={() => onSelect(s.id)}
            style={{ borderColor: state.taxonomy[s.type].color }}
          >
            <Sprite seed={s.id} color={state.taxonomy[s.type].color} size={48} />
            <span className="cell-num">{dexNo(s.dexNumber)}</span>
            <span className="cell-name">{s.name}</span>
          </button>
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${String(i)}`} className="cell empty">
            ?
          </div>
        ))}
      </div>
    </div>
  );
}

function SealForm({
  species,
  onSeal,
  busy,
  error,
}: {
  species: Species;
  onSeal: (id: string, kind: SealKind, reference: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [kind, setKind] = useState<SealKind>("test");
  const [reference, setReference] = useState("");
  const nemesis = species.status === "nemesis";

  return (
    <div className={`seal-form ${nemesis ? "is-nemesis" : ""}`}>
      <div className="section-title">{nemesis ? "⚠ Seal this Nemesis" : "Seal it"}</div>
      <div className="seal-row">
        <select value={kind} onChange={(e) => setKind(e.target.value as SealKind)}>
          <option value="test">test</option>
          <option value="lint-rule">lint-rule</option>
          <option value="type">type</option>
          <option value="assertion">assertion</option>
        </select>
        <input
          placeholder="reference, e.g. tests/guard.test.ts"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
        />
        <button
          disabled={busy || reference.trim().length === 0}
          onClick={() => onSeal(species.id, kind, reference.trim())}
        >
          Seal
        </button>
      </div>
      {error && <div className="err">{error}</div>}
    </div>
  );
}

export function EntryDetail({
  species,
  taxonomy,
  onSeal,
  busy,
  error,
}: {
  species: Species | null;
  taxonomy: DashboardState["taxonomy"];
  onSeal: (id: string, kind: SealKind, reference: string) => void;
  busy: boolean;
  error: string | null;
}) {
  if (!species) return <div className="entry empty-entry">Select a species to inspect.</div>;
  const entry = taxonomy[species.type];

  return (
    <div className="entry">
      <div className="entry-head">
        <Sprite seed={species.id} color={entry.color} size={96} />
        <div>
          <div className="entry-num">{dexNo(species.dexNumber)}</div>
          <div className="entry-name">{species.name}</div>
          <div className="entry-common">{species.commonName}</div>
        </div>
      </div>
      <div className="entry-meta">
        <TypeBadge entry={entry} />
        <RarityDots rarity={species.rarity} />
        <span className="sev">sev {species.severity}</span>
        <StatusPill status={species.status} />
      </div>
      {species.description && <p className="entry-desc">{species.description}</p>}
      {species.cwe && <div className="entry-cwe">{species.cwe}</div>}
      <div className="fix">
        <div className="section-title">Known fix</div>
        <p>{species.fix.summary || "—"}</p>
        {species.fix.patch && <pre>{species.fix.patch}</pre>}
      </div>
      <div className="entry-foot">
        Seen ×{species.encounters.length}
        {species.tags.length > 0 && <> · {species.tags.join(", ")}</>}
      </div>
      {species.status === "sealed" && species.seal ? (
        <div className="sealed-box">
          🔒 Sealed via {species.seal.kind}: <code>{species.seal.reference}</code>
        </div>
      ) : (
        <SealForm species={species} onSeal={onSeal} busy={busy} error={error} />
      )}
    </div>
  );
}

export function NemesisBoard({
  species,
  taxonomy,
  onSelect,
}: {
  species: Species[];
  taxonomy: DashboardState["taxonomy"];
  onSelect: (id: string) => void;
}) {
  const nemeses = species.filter((s) => s.status === "nemesis");
  if (nemeses.length === 0) return null;
  return (
    <div className="nemesis-board">
      <div className="section-title">⚠ Nemesis board ({nemeses.length})</div>
      {nemeses.map((s) => (
        <button
          key={s.id}
          className="nemesis-row"
          onClick={() => onSelect(s.id)}
          style={{ borderColor: taxonomy[s.type].color }}
        >
          <strong>{s.name}</strong>
          <span className="dim">
            {taxonomy[s.type].label} · ×{s.encounters.length}
          </span>
          <span className="how">click to seal →</span>
        </button>
      ))}
    </div>
  );
}
