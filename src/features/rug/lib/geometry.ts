import { cellAt, inBounds } from "@/features/atlas/lib/grid";
import type {
  Box,
  Dir,
  GameDocument,
  Rug,
  RugAxis,
  RugLayer,
  RugStrip,
  TileKind,
  Vec,
} from "@/shared/types";

export const AXIS_DELTA: Record<RugAxis, Vec> = {
  x: { x: 1, y: 0 },
  y: { x: 0, y: 1 },
};

export function axisOfDir(dir: Dir): RugAxis {
  return dir === "e" || dir === "w" ? "x" : "y";
}

export function oppositeDir(dir: Dir): Dir {
  const map: Record<Dir, Dir> = { n: "s", s: "n", e: "w", w: "e" };
  return map[dir];
}

/** 条带在轴上的序号。 */
export function stripIndex(rug: Rug, strip: RugStrip): number {
  return rug.axis === "x" ? strip.x : strip.y;
}

export function endStrip(rug: Rug, high: boolean): RugStrip {
  const sorted = [...rug.strips].sort((a, b) => stripIndex(rug, a) - stripIndex(rug, b));
  return high ? sorted[sorted.length - 1] : sorted[0];
}

/** 平展条带的有效夹持层序：翻面条带上下颠倒。 */
export function effectiveLayers(strip: RugStrip): RugLayer[] {
  return strip.facing === 0 ? strip.stack : [...strip.stack].reverse();
}

export interface ExposedLayer {
  kind: RugLayer["kind"];
  ref: string;
  stripId: string | null;
  x: number;
  y: number;
}

export interface CellView {
  x: number;
  y: number;
  /** 自下而上的平展条带（depth 小的在下层）。 */
  strips: RugStrip[];
  /** 占据该格的卷束（若有）。 */
  bundle: Rug | null;
  /** 松散待在该格、不属于任何条带的箱子。 */
  looseBoxes: Box[];
  /** 自下而上的外露层（含未被条带夹持的裸层与松散箱）。 */
  sequence: ExposedLayer[];
}

function flatStripsAt(document: GameDocument, x: number, y: number): RugStrip[] {
  const found: RugStrip[] = [];
  for (const rug of document.level.rugs) {
    const strip = rug.strips.find((item) => item.flat && item.x === x && item.y === y);
    if (strip) found.push(strip);
  }
  return found.sort((a, b) => a.depth - b.depth);
}

export function bundleAt(document: GameDocument, x: number, y: number): Rug | null {
  // 半卷（rolled=false 但 bundle 已存在）同样按卷束占格处理。
  return (
    document.level.rugs.find(
      (rug) => rug.bundle?.x === x && rug.bundle?.y === y,
    ) ?? null
  );
}

export function viewCell(document: GameDocument, x: number, y: number): CellView {
  const level = document.level;
  const strips = flatStripsAt(document, x, y);
  const bundle = bundleAt(document, x, y);
  const looseBoxes = level.boxes.filter(
    (box) => box.stripId === "" && box.x === x && box.y === y,
  );

  const claimed = new Set<string>();
  const entries: { order: number; layer: ExposedLayer }[] = [];
  const KIND_ORDER = { ground: 0, floor: 1, door: 2, plate: 3, box: 4 } as const;
  let groundClaimed = false;
  for (const strip of strips) {
    for (const layer of effectiveLayers(strip)) {
      claimed.add(`${layer.kind}:${layer.ref}`);
      if (layer.kind === "ground") groundClaimed = true;
      entries.push({
        order: KIND_ORDER[layer.kind],
        layer: { ...layer, stripId: strip.id },
      });
    }
  }
  // 未被任何条带夹持的裸层，按固定上下补入。
  if (inBounds(level, x, y) && !groundClaimed) {
    entries.push({
      order: KIND_ORDER.ground,
      layer: { kind: "ground", ref: level.tiles[y][x], stripId: null, x, y },
    });
  }
  for (const floor of level.floors) {
    if (floor.x === x && floor.y === y && !claimed.has(`floor:${floor.id}`)) {
      entries.push({
        order: KIND_ORDER.floor,
        layer: { kind: "floor", ref: floor.id, stripId: null, x, y },
      });
    }
  }
  for (const door of level.doors) {
    if (door.x === x && door.y === y && !claimed.has(`door:${door.id}`)) {
      entries.push({
        order: KIND_ORDER.door,
        layer: { kind: "door", ref: door.id, stripId: null, x, y },
      });
    }
  }
  for (const plate of level.plates) {
    if (plate.x === x && plate.y === y && !claimed.has(`plate:${plate.id}`)) {
      entries.push({
        order: KIND_ORDER.plate,
        layer: { kind: "plate", ref: plate.id, stripId: null, x, y },
      });
    }
  }
  for (const box of looseBoxes) {
    entries.push({
      order: KIND_ORDER.box,
      layer: { kind: "box", ref: box.id, stripId: null, x, y },
    });
  }
  // 稳定排序：同层类保持条带自下而上的录入顺序。
  entries.sort((a, b) => a.order - b.order);
  const sequence = entries.map((entry) => entry.layer);
  return { x, y, strips, bundle, looseBoxes, sequence };
}

export function resolveBox(document: GameDocument, id: string): Box | undefined {
  return document.level.boxes.find((box) => box.id === id);
}

/** 该格最顶层、确实外露的箱子；被夹在两层之间的箱子不在此列。 */
export function topmostBoxAt(document: GameDocument, x: number, y: number): Box | undefined {
  if (!inBounds(document.level, x, y)) return undefined;
  const view = viewCell(document, x, y);
  if (view.bundle) return undefined;
  for (let i = view.sequence.length - 1; i >= 0; i -= 1) {
    const layer = view.sequence[i];
    if (layer.kind === "box") return resolveBox(document, layer.ref);
  }
  return undefined;
}

export function exposedTile(document: GameDocument, x: number, y: number): TileKind | null {
  if (!inBounds(document.level, x, y)) return null;
  const view = viewCell(document, x, y);
  for (let i = view.sequence.length - 1; i >= 0; i -= 1) {
    const layer = view.sequence[i];
    if (layer.kind === "ground") return layer.ref as TileKind;
  }
  return cellAt(document.level, x, y);
}

/** 散货被推上毯格时，由最上层平展条带接住并压在其夹持层顶部。 */
export function catchLooseBox(document: GameDocument, box: Box): void {
  if (box.stripId) return;
  const view = viewCell(document, box.x, box.y);
  if (view.bundle || view.strips.length === 0) return;
  const top = view.strips[view.strips.length - 1];
  top.stack.push({ kind: "box", ref: box.id, x: box.x, y: box.y });
  box.stripId = top.id;
}
