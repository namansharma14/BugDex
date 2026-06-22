// Local mirror of the `bugdex` dashboard API shapes (kept standalone so the UI
// doesn't depend on the core build at compile time).

export type BugType =
  | "null"
  | "injection"
  | "concurrency"
  | "memory"
  | "logic"
  | "crypto"
  | "auth"
  | "resource"
  | "type"
  | "config";

export type Rarity = "common" | "uncommon" | "rare" | "legendary";
export type Status = "caught" | "recurring" | "nemesis" | "sealed";
export type SealKind = "test" | "lint-rule" | "type" | "assertion";

export interface TaxonomyEntry {
  type: BugType;
  label: string;
  covers: string;
  color: string;
  icon: string;
}

export interface Species {
  id: string;
  dexNumber: number;
  name: string;
  commonName: string;
  type: BugType;
  rarity: Rarity;
  severity: number;
  description: string;
  cwe?: string;
  fix: { summary: string; patch?: string; explanation?: string };
  status: Status;
  seal?: { kind: SealKind; reference: string; sealedAt: string };
  encounters: { at: string; file: string; line?: number }[];
  tags: string[];
}

export interface DashboardState {
  trainer: {
    name: string;
    rank: string;
    title: string;
    xp: number;
    caught: number;
    sealed: number;
    encounters: number;
    streak: { current: number; longest: number };
    badges: { id: string; label: string; earnedAt: string }[];
    next?: {
      title: string;
      floor: number;
      ceil: number;
      sealsNeeded: number;
      regionalNeeded: boolean;
    };
  };
  regional: {
    covered: number;
    total: number;
    complete: boolean;
    byType: { type: BugType; count: number }[];
  };
  species: Species[];
  taxonomy: Record<BugType, TaxonomyEntry>;
  bugTypes: BugType[];
  rarities: Rarity[];
  statuses: Status[];
  config: {
    flair: string;
    minConfidence: string;
    nemesisThreshold: number;
    team: boolean;
    enabledTypes: BugType[];
  };
}
