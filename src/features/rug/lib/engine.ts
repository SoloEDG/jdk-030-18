import { inBounds } from "@/features/atlas/lib/grid";
import { axisOfDir, oppositeDir, viewCell } from "./geometry";
import { addVec, sameCell } from "@/shared/document";
import {
  DIR_VEC,
  type Box,
  type Dir,
  type GameDocument,
  type MoveResult,
  type Rug,
  type RugStrip,
} from "@/shared/types";

export type RugStop = "ok" | "jam" | "blocked";

function stripAt(rug: Rug, x: number, y: number): RugStrip | undefined {
  return rug.strips.find((strip) => strip.x === x && strip.y === y);
}

/** 卷束或平展条带在目标格是否被另一卷的上层夹货卡住。 */
function crossingJam(document: GameDocument, self: Rug, x: number, y: number): boolean {
  const view = viewCell(document, x, y);
  if (view.bundle && view.bundle.id !== self.id) return true;
  for (const strip of view.strips) {
    const owner = document.level.rugs.find((rug) =>
      rug.strips.some((item) => item.id === strip.id),
    );
    if (!owner || owner.id === self.id) continue;
    // 只有夹着货的上层平展条带才卡得住本卷。
    if (strip.stack.some((layer) => layer.kind === "box")) return true;
  }
  return false;
}

function looseBoxAt(document: GameDocument, x: number, y: number): Box | undefined {
  return document.level.boxes.find(
    (box) => box.stripId === "" && box.x === x && box.y === y,
  );
}

/**
 * 沿格缝卷动：先碰到哪一排就把谁卷在里面，循环直到出界、被垂直卷卡住，
 * 或卷完整张毯。受阻时停在最先受阻的那排，之前真正卷起的部分保留。
 */
function roll(document: GameDocument, rug: Rug, dir: Dir, edge: RugStrip): MoveResult {
  const delta = DIR_VEC[dir];
  let target = addVec({ x: edge.x, y: edge.y }, delta);
  let stop: RugStop = "ok";
  let rows = 1;
  edge.innerId = null;
  edge.facing = edge.facing === 0 ? 1 : 0;
  for (const layer of edge.stack) {
    if (layer.kind !== "box") continue;
    const box = document.level.boxes.find((item) => item.id === layer.ref);
    if (box) box.facing = edge.facing;
  }
  rug.bundle = { x: edge.x, y: edge.y };
  rug.front = edge.id;

  while (inBounds(document.level, target.x, target.y)) {
    const strip = stripAt(rug, target.x, target.y);
    if (!strip || !strip.flat) {
      stop = "blocked";
      break;
    }
    if (crossingJam(document, rug, target.x, target.y)) {
      stop = "jam";
      break;
    }
    // 松散地待在这一排的货随排卷入，压在条带已有夹持层的上面。
    const loose = looseBoxAt(document, target.x, target.y);
    if (loose) {
      strip.stack.push({ kind: "box", ref: loose.id, x: loose.x, y: loose.y });
      loose.stripId = strip.id;
    }
    strip.flat = false;
    strip.facing = strip.facing === 0 ? 1 : 0;
    for (const layer of strip.stack) {
      if (layer.kind !== "box") continue;
      const box = document.level.boxes.find((item) => item.id === layer.ref);
      if (box) box.facing = strip.facing;
    }
    // 新卷入的条带在最外层；它先揭出后，下一层是之前的 front。
    strip.innerId = rug.front;
    rug.front = strip.id;
    rows += 1;
    rug.bundle = { x: target.x, y: target.y };
    target = addVec(target, delta);
  }

  // 下一排就受阻：边排没真正卷成，恢复平展，整次不动。
  if (rows === 1 && stop !== "ok") {
    edge.flat = true;
    edge.facing = edge.facing === 0 ? 1 : 0;
    for (const layer of edge.stack) {
      if (layer.kind !== "box") continue;
      const box = document.level.boxes.find((item) => item.id === layer.ref);
      if (box) box.facing = edge.facing;
    }
    edge.innerId = null;
    rug.bundle = null;
    rug.front = null;
    return {
      moved: false,
      pushed: false,
      rugId: rug.id,
      rugRows: 0,
      reason: stop === "jam" ? "rug-jammed" : "rug-blocked",
    };
  }

  rug.rollDir = dir;
  rug.rolled = rug.strips.every((strip) => !strip.flat);
  document.level.player = { x: rug.bundle!.x, y: rug.bundle!.y };
  return { moved: true, pushed: false, rugId: rug.id, rugRows: rows };
}

/** 反向铺开：只在实际露出的格上落层，碰到障碍停在最先受阻的排。 */
function unroll(document: GameDocument, rug: Rug): MoveResult {
  if (!rug.bundle || !rug.front) {
    return { moved: false, pushed: false, rugId: rug.id, rugRows: 0, reason: "rug-idle" };
  }
  let rows = 0;
  let stop: RugStop = "ok";

  while (rug.bundle) {
    const front = rug.strips.find((strip) => strip.id === rug.front);
    if (!front) {
      stop = "blocked";
      break;
    }
    const target = { x: front.x, y: front.y };
    if (!inBounds(document.level, target.x, target.y)) {
      stop = "blocked";
      break;
    }
    if (crossingJam(document, rug, target.x, target.y)) {
      stop = "jam";
      break;
    }
    if (looseBoxAt(document, target.x, target.y)) {
      stop = "blocked";
      break;
    }
    document.level.laySeq += 1;
    front.depth = document.level.laySeq;
    front.flat = true;
    const nextId = front.innerId;
    front.innerId = null;
    rows += 1;
    // 卷束整体退到刚露出的这一排，人随卷束走。
    rug.bundle = { x: target.x, y: target.y };
    document.level.player = { x: target.x, y: target.y };

    const stillRolled = rug.strips.filter((strip) => !strip.flat);
    if (stillRolled.length === 0) {
      rug.rolled = false;
      rug.bundle = null;
      rug.front = null;
      break;
    }
    rug.front = stillRolled.find((strip) => strip.id === nextId)?.id ?? null;
  }

  if (rows === 0) {
    return {
      moved: false,
      pushed: false,
      rugId: rug.id,
      rugRows: 0,
      reason: stop === "jam" ? "rug-jammed" : "rug-blocked",
    };
  }
  return { moved: true, pushed: false, rugId: rug.id, rugRows: rows };
}

/** 半卷状态下沿原卷动方向继续卷，受阻排之前的已卷部分保持不变。 */
function resumeRoll(document: GameDocument, rug: Rug, dir: Dir): MoveResult {
  if (!rug.bundle || !rug.front) {
    return { moved: false, pushed: false, rugId: rug.id, rugRows: 0, reason: "rug-idle" };
  }
  const delta = DIR_VEC[dir];
  let target = addVec(rug.bundle, delta);
  let rows = 0;
  let stop: RugStop = "ok";

  while (inBounds(document.level, target.x, target.y)) {
    const strip = stripAt(rug, target.x, target.y);
    if (!strip || !strip.flat) {
      stop = "blocked";
      break;
    }
    if (crossingJam(document, rug, target.x, target.y)) {
      stop = "jam";
      break;
    }
    const loose = looseBoxAt(document, target.x, target.y);
    if (loose) {
      strip.stack.push({ kind: "box", ref: loose.id, x: loose.x, y: loose.y });
      loose.stripId = strip.id;
    }
    strip.flat = false;
    strip.facing = strip.facing === 0 ? 1 : 0;
    for (const layer of strip.stack) {
      if (layer.kind !== "box") continue;
      const box = document.level.boxes.find((item) => item.id === layer.ref);
      if (box) box.facing = strip.facing;
    }
    strip.innerId = rug.front;
    rug.front = strip.id;
    rows += 1;
    rug.bundle = { x: target.x, y: target.y };
    target = addVec(target, delta);
  }

  if (rows === 0) {
    return {
      moved: false,
      pushed: false,
      rugId: rug.id,
      rugRows: 0,
      reason: stop === "jam" ? "rug-jammed" : "rug-blocked",
    };
  }
  rug.rollDir = dir;
  rug.rolled = rug.strips.every((strip) => !strip.flat);
  document.level.player = { x: rug.bundle!.x, y: rug.bundle!.y };
  return { moved: true, pushed: false, rugId: rug.id, rugRows: rows };
}

/** 玩家在卷束/自由端上按方向时，判定这是一次卷起、续卷还是反铺。 */
export function rugMove(document: GameDocument, dir: Dir): MoveResult | null {
  const player = document.level.player;
  for (const rug of document.level.rugs) {
    if (rug.axis !== axisOfDir(dir)) continue;
    // 卷束存在即视为可卷/可铺状态（半卷或全卷）。
    if (rug.bundle) {
      if (!sameCell(rug.bundle, player)) continue;
      if (rug.rollDir === dir) return resumeRoll(document, rug, dir);
      if (rug.rollDir && dir === oppositeDir(rug.rollDir)) {
        return unroll(document, rug);
      }
      continue;
    }
    // 平展时只能从条带两端、朝毯内的方向起卷。
    const sorted = [...rug.strips].sort((a, b) =>
      rug.axis === "x" ? a.x - b.x : a.y - b.y,
    );
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    // 朝坐标增大方向卷时从低端起，朝减小方向卷时从高端起。
    const edge = dir === "e" || dir === "s" ? low : high;
    const inward = addVec(edge, DIR_VEC[dir]);
    if (!sameCell(edge, player)) continue;
    if (!inBounds(document.level, inward.x, inward.y)) continue;
    rug.bundle = { x: edge.x, y: edge.y };
    rug.front = edge.id;
    edge.flat = false;
    return roll(document, rug, dir, edge);
  }
  return null;
}
