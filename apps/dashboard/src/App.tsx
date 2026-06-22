import { useEffect, useState, type ReactNode } from "react";
import type { DashboardState, SealKind } from "./types.js";
import { fetchState, sealSpecies } from "./api.js";
import { DexGrid, EntryDetail, NemesisBoard, RegionalMeter, TrainerCard } from "./components.js";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="pokedex">
      <div className="pokedex-top">
        <span className="lamp big" />
        <span className="lamp red" />
        <span className="lamp yellow" />
        <span className="lamp green" />
        <span className="brand">BugDex</span>
      </div>
      <div className="pokedex-body">{children}</div>
    </div>
  );
}

export function App() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sealError, setSealError] = useState<string | null>(null);

  useEffect(() => {
    fetchState()
      .then((s) => {
        setState(s);
        setSelectedId(s.species[0]?.id ?? null);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (loadError) {
    return (
      <Frame>
        <div className="loading">Couldn’t reach the BugDex API: {loadError}</div>
      </Frame>
    );
  }
  if (!state) {
    return (
      <Frame>
        <div className="loading">Loading BugDex…</div>
      </Frame>
    );
  }

  const selected = state.species.find((s) => s.id === selectedId) ?? null;

  const onSeal = (id: string, kind: SealKind, reference: string): void => {
    setBusy(true);
    setSealError(null);
    sealSpecies(id, kind, reference)
      .then((next) => setState(next))
      .catch((e: unknown) => setSealError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  };

  return (
    <Frame>
      {state.species.length === 0 ? (
        <div className="loading">
          Your dex is empty. Catch a bug with <code>bugdex catch</code> or hunt one with{" "}
          <code>/bugdex:scan</code>.
        </div>
      ) : (
        <div className="layout">
          <aside className="left">
            <TrainerCard trainer={state.trainer} />
            <RegionalMeter regional={state.regional} taxonomy={state.taxonomy} />
            <NemesisBoard
              species={state.species}
              taxonomy={state.taxonomy}
              onSelect={setSelectedId}
            />
          </aside>
          <main className="center">
            <EntryDetail
              species={selected}
              taxonomy={state.taxonomy}
              onSeal={onSeal}
              busy={busy}
              error={sealError}
            />
          </main>
          <section className="right">
            <DexGrid state={state} selectedId={selectedId} onSelect={setSelectedId} />
          </section>
        </div>
      )}
    </Frame>
  );
}
