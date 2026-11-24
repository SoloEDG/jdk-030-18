import { tileCenter } from "./grid";
import { viewCell } from "@/features/rug/lib/geometry";
import type {
  Box,
  Door,
  FloorPatch,
  GameDocument,
  Plate,
  Rug,
  RugLayer,
  TileKind,
} from "@/shared/types";

export const TILE = 46;

const ink = "#1c1610";
const plank = "#3a2a1c";
const brass = "#c9a36a";
const moss = "#7d9b6a";
const rust = "#b56a32";
const steel = "#8a93a0";
const glass = "#7ec8c8";
const pit = "#0b0907";
const rugA = "#7a3b46";
const rugB = "#5e2c35";
const rugEdge = "#c98a6a";

export function sizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  tile = TILE,
): CanvasRenderingContext2D {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const w = width * tile;
  const h = height * tile;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export function paintStage(ctx: CanvasRenderingContext2D, document: GameDocument, tile = TILE): void {
  const { level } = document;
  ctx.clearRect(0, 0, level.width * tile, level.height * tile);
  ctx.fillStyle = pit;
  ctx.fillRect(0, 0, level.width * tile, level.height * tile);

  // 先画平展条带（地毯本体），卷入条带所在格不铺毯。
  for (const rug of level.rugs) {
    for (const strip of rug.strips) {
      if (strip.flat) paintRugStrip(ctx, strip.x, strip.y, rug.axis, strip.facing, tile);
    }
  }

  // 每格按真实外露层序自下而上绘制；被卷走、被夹住的层一律不画。
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const view = viewCell(document, x, y);
      if (view.bundle) {
        paintPitCell(ctx, x, y, tile);
        continue;
      }
      for (const layer of view.sequence) paintLayer(ctx, document, layer, tile);
    }
  }

  for (const rug of level.rugs) {
    if (rug.bundle) paintBundle(ctx, rug, tile);
  }
  paintPlayer(
    ctx,
    level.player.x,
    level.player.y,
    tile,
    document.attempt.status === "cleared",
  );
}

function paintPitCell(ctx: CanvasRenderingContext2D, x: number, y: number, tile: number): void {
  const px = x * tile;
  const py = y * tile;
  ctx.fillStyle = pit;
  ctx.fillRect(px, py, tile, tile);
  ctx.strokeStyle = "rgba(201,163,106,0.2)";
  ctx.strokeRect(px + 6, py + 6, tile - 12, tile - 12);
}

function paintRugStrip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  axis: "x" | "y",
  facing: 0 | 1,
  tile: number,
): void {
  const px = x * tile;
  const py = y * tile;
  ctx.fillStyle = facing === 0 ? rugA : rugB;
  ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4);
  ctx.strokeStyle = rugEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 3, py + 3, tile - 6, tile - 6);
  // 织纹沿轴方向。
  ctx.strokeStyle = "rgba(232,215,184,0.16)";
  ctx.beginPath();
  if (axis === "x") {
    for (const off of [12, 23, 34]) {
      ctx.moveTo(px + 5, py + off);
      ctx.lineTo(px + tile - 5, py + off);
    }
  } else {
    for (const off of [12, 23, 34]) {
      ctx.moveTo(px + off, py + 5);
      ctx.lineTo(px + off, py + tile - 5);
    }
  }
  ctx.stroke();
  if (facing === 1) {
    ctx.strokeStyle = "rgba(201,138,106,0.85)";
    ctx.beginPath();
    ctx.arc(px + tile / 2, py + tile / 2, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function paintLayer(
  ctx: CanvasRenderingContext2D,
  document: GameDocument,
  layer: { kind: RugLayer["kind"]; ref: string; stripId: string | null; x: number; y: number },
  tile: number,
): void {
  const level = document.level;
  if (layer.kind === "ground") {
    paintTile(ctx, { x: layer.x, y: layer.y }, layer.ref as TileKind, tile);
    return;
  }
  if (layer.kind === "floor") {
    const floor = level.floors.find((item) => item.id === layer.ref);
    if (floor) paintFloor(ctx, floor, tile);
    return;
  }
  if (layer.kind === "door") {
    const door = level.doors.find((item) => item.id === layer.ref);
    if (door) paintDoor(ctx, door, tile);
    return;
  }
  if (layer.kind === "plate") {
    const plate = level.plates.find((item) => item.id === layer.ref);
    if (plate) paintPlate(ctx, plate, tile);
    return;
  }
  const box = level.boxes.find((item) => item.id === layer.ref);
  if (box) paintBox(ctx, box, tile);
}

function paintTile(
  ctx: CanvasRenderingContext2D,
  at: { x: number; y: number },
  kind: TileKind,
  tile: number,
): void {
  const px = at.x * tile;
  const py = at.y * tile;
  if (kind === "wall") {
    ctx.fillStyle = plank;
    ctx.fillRect(px, py, tile, tile);
    ctx.strokeStyle = "#2a1d14";
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 4, py + 4, tile - 8, tile - 8);
    ctx.fillStyle = "rgba(201,163,106,0.18)";
    ctx.fillRect(px + 8, py + 10, tile - 16, 3);
    return;
  }
  if (kind === "gap") {
    paintPitCell(ctx, at.x, at.y, tile);
    return;
  }
  ctx.fillStyle = kind === "goal" ? "#2c2618" : "#4a3b2a";
  ctx.fillRect(px + 1, py + 1, tile - 2, tile - 2);
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.strokeRect(px + 1, py + 1, tile - 2, tile - 2);
  if (kind === "goal") {
    ctx.strokeStyle = moss;
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 10, py + 10, tile - 20, tile - 20);
    ctx.fillStyle = "rgba(125,155,106,0.35)";
    ctx.fillRect(px + 16, py + 16, tile - 32, tile - 32);
  }
}

function paintFloor(ctx: CanvasRenderingContext2D, floor: FloorPatch, tile: number): void {
  const px = floor.x * tile;
  const py = floor.y * tile;
  if (floor.morph === "bridge") {
    ctx.fillStyle = floor.active ? "#6a5638" : "rgba(80,70,50,0.35)";
    ctx.fillRect(px + 8, py + 18, tile - 16, 16);
    ctx.strokeStyle = brass;
    ctx.strokeRect(px + 8, py + 18, tile - 16, 16);
    return;
  }
  if (floor.active) {
    ctx.fillStyle = "rgba(90,40,30,0.72)";
    ctx.fillRect(px + 2, py + 2, tile - 4, tile - 4);
  } else {
    ctx.strokeStyle = "rgba(181,106,50,0.7)";
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(px + 8, py + 8, tile - 16, tile - 16);
    ctx.setLineDash([]);
  }
}

function paintPlate(ctx: CanvasRenderingContext2D, plate: Plate, tile: number): void {
  const px = plate.x * tile + 9;
  const py = plate.y * tile + 9;
  const color = plate.accept === "timber" ? rust : plate.accept === "iron" ? steel : glass;
  ctx.fillStyle = plate.powered ? color : "#241c14";
  ctx.fillRect(px, py, tile - 18, tile - 18);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, tile - 18, tile - 18);
  ctx.fillStyle = plate.powered ? ink : color;
  ctx.font = "11px ui-serif, Palatino, serif";
  ctx.textAlign = "center";
  ctx.fillText(
    plate.accept === "timber" ? "木" : plate.accept === "iron" ? "铁" : "玻",
    px + (tile - 18) / 2,
    py + 22,
  );
}

function paintDoor(ctx: CanvasRenderingContext2D, door: Door, tile: number): void {
  const px = door.x * tile;
  const py = door.y * tile;
  ctx.fillStyle = door.open ? "rgba(201,163,106,0.22)" : "#5b4630";
  ctx.fillRect(px + 14, py + 4, tile - 28, tile - 8);
  ctx.strokeStyle = brass;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 14, py + 4, tile - 28, tile - 8);
  if (!door.open) {
    ctx.beginPath();
    ctx.arc(px + tile / 2 + 6, py + tile / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = brass;
    ctx.fill();
  }
}

function paintBox(ctx: CanvasRenderingContext2D, box: Box, tile: number): void {
  const px = box.x * tile + 8;
  const py = box.y * tile + 8;
  const fill =
    box.kind === "timber" ? rust : box.kind === "iron" ? steel : "rgba(126,200,200,0.55)";
  ctx.fillStyle = fill;
  ctx.fillRect(px, py, tile - 16, tile - 16);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(px, py, tile - 16, tile - 16);
  if (box.kind === "timber") {
    ctx.strokeStyle = "rgba(28,22,16,0.45)";
    ctx.beginPath();
    ctx.moveTo(px + 4, py + 12);
    ctx.lineTo(px + tile - 20, py + 12);
    ctx.moveTo(px + 4, py + 24);
    ctx.lineTo(px + tile - 20, py + 24);
    ctx.stroke();
  }
  if (box.kind === "iron") {
    ctx.fillStyle = "#5c6570";
    ctx.fillRect(px + 6, py + 6, 6, 6);
    ctx.fillRect(px + tile - 34, py + tile - 34, 6, 6);
  }
  // 倒扣的货画一枚翻转标记，朝向可在断面对照。
  if (box.facing === 1) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + (tile - 16) / 2, py + (tile - 16) / 2, 5, 0, Math.PI, true);
    ctx.stroke();
  }
}

function paintBundle(ctx: CanvasRenderingContext2D, rug: Rug, tile: number): void {
  if (!rug.bundle) return;
  const c = tileCenter(rug.bundle.x, rug.bundle.y, tile);
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, tile * 0.36, tile * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = rugB;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = rugEdge;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, tile * 0.22, tile * 0.18, 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(232,215,184,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = rugEdge;
  ctx.font = "10px ui-serif, Palatino, serif";
  ctx.textAlign = "center";
  ctx.fillText("卷", c.x, c.y + 3);
}

function paintPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tile: number,
  cleared: boolean,
): void {
  const c = tileCenter(x, y, tile);
  ctx.beginPath();
  ctx.arc(c.x, c.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = cleared ? moss : brass;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ink;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c.x - 4, c.y - 3, 2, 0, Math.PI * 2);
  ctx.arc(c.x + 4, c.y - 3, 2, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
}
