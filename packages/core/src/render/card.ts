import type { BugType } from "../taxonomy/index.js";
import type { Flair } from "../schema/index.js";
import { createPainter, defaultColorEnabled, type Painter } from "./paint.js";

export interface CardNext {
  title: string;
  /** Current rank's XP floor (start of the bar). */
  floor: number;
  /** Next rank's XP threshold (end of the bar). */
  ceil: number;
  sealsNeeded: number;
  regionalNeeded: boolean;
}

export interface CardNemesis {
  id: string;
  name: string;
  type: BugType;
  encounters: number;
}

export interface CardData {
  name: string;
  rankTitle: string;
  rankFlavor: string;
  xp: number;
  caught: number;
  sealed: number;
  streak: number;
  badges: string[];
  next?: CardNext;
  nemeses: CardNemesis[];
}

function xpBar(xp: number, next: CardNext | undefined, p: Painter, width = 12): string {
  if (!next) return `${p.dim("max rank")}`;
  const span = Math.max(1, next.ceil - next.floor);
  const into = Math.min(span, Math.max(0, xp - next.floor));
  const filled = Math.round((into / span) * width);
  const bar = "▓".repeat(filled) + "░".repeat(width - filled);
  const extra: string[] = [];
  if (next.sealsNeeded > 0)
    extra.push(`${next.sealsNeeded} seal${next.sealsNeeded === 1 ? "" : "s"}`);
  if (next.regionalNeeded) extra.push("regional dex");
  const suffix = extra.length > 0 ? ` (+ ${extra.join(", ")})` : "";
  return `${p.c.cyan(bar)} ${into}/${span} to ${next.title}${suffix}`;
}

function nemesisSection(data: CardData, p: Painter): string[] {
  if (data.nemeses.length === 0) return [];
  const lines = [p.c.red(`⚠ Active Nemeses (${data.nemeses.length}):`)];
  for (const n of data.nemeses) {
    lines.push(`   ${p.type(n.type, n.name)} ×${n.encounters} — seal: /bugdex:seal ${n.id}`);
  }
  return lines;
}

/**
 * Render the trainer card at the given flair level. `off` is a single, plain
 * line; `medium` is a few coloured lines; `high` adds a framed Pokédex look.
 */
export function renderCard(
  data: CardData,
  flair: Flair,
  painter: Painter = createPainter(flair !== "off" && defaultColorEnabled()),
): string {
  if (flair === "off") {
    return `${data.name} — ${data.rankTitle} · ${data.xp} XP · ${data.caught} caught, ${data.sealed} sealed`;
  }

  const p = painter;
  const lines: string[] = [];

  if (flair === "high") {
    lines.push(p.heading(`╭─ BugDex Trainer ${"─".repeat(20)}`));
    lines.push(`│ 🎒 ${p.heading(data.name)} — ${data.rankTitle}`);
    lines.push(`│ ${p.dim(`"${data.rankFlavor}"`)}`);
    lines.push(`│ ${xpBar(data.xp, data.next, p)}`);
    lines.push(`│ Caught ${data.caught} · Sealed ${data.sealed} · 🔥 ${data.streak}`);
    if (data.badges.length > 0) lines.push(`│ Badges: ${data.badges.join(", ")}`);
    lines.push(`╰${"─".repeat(37)}`);
  } else {
    lines.push(`🎒 ${p.heading(data.name)} — ${data.rankTitle}  ${p.dim(`"${data.rankFlavor}"`)}`);
    lines.push(`   ${xpBar(data.xp, data.next, p)}`);
    lines.push(`   Caught ${data.caught} · Sealed ${data.sealed} · streak ${data.streak}`);
  }

  const nemeses = nemesisSection(data, p);
  if (nemeses.length > 0) lines.push("", ...nemeses);
  return lines.join("\n");
}
