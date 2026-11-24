import { inBounds } from "@/features/atlas/lib/grid";
import { topmostBoxAt, viewCell } from "./geometry";
import { sameCell } from "@/shared/document";
import type { GameDocument, Vec } from "@/shared/types";

export interface PassQuery {
  ignoreBoxId?: string;
  ignorePlayer?: boolean;
  /** 搬运员本人走上卷束时为真；推箱经过时保持假，箱子永远不能压卷束。 */
  allowBundle?: boolean;
}

/** 只看地面本体（图块与地板变形）是否落脚可靠；门、箱另算。 */
export function groundOpen(document: GameDocument, x: number, y: number): boolean {
  if (!inBounds(document.level, x, y)) return false;
  const level = document.level;
  const view = viewCell(document, x, y);
  let tile = level.tiles[y][x];
  let patchId: string | null = null;
  for (const layer of view.sequence) {
    if (layer.kind === "ground") tile = layer.ref as typeof tile;
    if (layer.kind === "floor") patchId = layer.ref;
  }
  const patch = patchId
    ? level.floors.find((floor) => floor.id === patchId)
    : level.floors.find((floor) => floor.x === x && floor.y === y);
  if (patch?.morph === "seal" && patch.active) return false;
  if (patch?.morph === "bridge" && patch.active) return true;
  return tile !== "wall" && tile !== "gap";
}

export function isPassable(document: GameDocument, at: Vec, query: PassQuery = {}): boolean {
  if (!inBounds(document.level, at.x, at.y)) return false;
  const view = viewCell(document, at.x, at.y);
  // 卷束格：人可以站上去操纵卷铺，箱子和其他情况一律不可落脚。
  if (view.bundle && !query.allowBundle) return false;
  if (!groundOpen(document, at.x, at.y)) return false;
  for (const layer of view.sequence) {
    if (layer.kind !== "door") continue;
    const door = document.level.doors.find((item) => item.id === layer.ref);
    if (door && !door.open) return false;
  }
  const box = topmostBoxAt(document, at.x, at.y);
  if (box && box.id !== query.ignoreBoxId) return false;
  if (!query.ignorePlayer && sameCell(document.level.player, at)) return false;
  return true;
}

export function describeBlock(document: GameDocument, at: Vec): string {
  if (!inBounds(document.level, at.x, at.y)) return "边界";
  const view = viewCell(document, at.x, at.y);
  if (view.bundle) return "卷束占格";
  if (!groundOpen(document, at.x, at.y)) return "地面封闭";
  for (const layer of view.sequence) {
    if (layer.kind !== "door") continue;
    const door = document.level.doors.find((item) => item.id === layer.ref);
    if (door && !door.open) return "门闩关闭";
  }
  if (topmostBoxAt(document, at.x, at.y)) return "箱子占据";
  if (sameCell(document.level.player, at)) return "人占据";
  return "可通行";
}
