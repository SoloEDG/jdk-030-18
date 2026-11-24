import { sameCell } from "@/shared/document";
import { topmostBoxAt } from "@/features/rug/lib/geometry";
import type { Box, GameDocument, Vec } from "@/shared/types";

export type Occupant = "player" | "box" | null;

/** 只返回格上真正外露、可以被搬运员碰到的箱子。 */
export function boxAt(document: GameDocument, at: Vec, ignoreId?: string): Box | undefined {
  const box = topmostBoxAt(document, at.x, at.y);
  if (!box || box.id === ignoreId) return undefined;
  return box;
}

export function occupantAt(document: GameDocument, at: Vec, ignoreBoxId?: string): Occupant {
  if (boxAt(document, at, ignoreBoxId)) return "box";
  if (sameCell(document.level.player, at)) return "player";
  return null;
}

export function boxesByKind(document: GameDocument): Record<string, number> {
  const counts: Record<string, number> = { timber: 0, iron: 0, glass: 0 };
  for (const box of document.level.boxes) counts[box.kind] += 1;
  return counts;
}
