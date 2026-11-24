import { createId } from "@/shared/document";
import type {
  BoxKind,
  FloorMorph,
  RuntimeLevel,
  Rug,
  RugAxis,
  RugLayer,
  RugStrip,
  TileKind,
} from "@/shared/types";

export interface RugBlueprint {
  id: string;
  axis: RugAxis;
  /** 垂直轴方向的固定格坐标。 */
  line: number;
  /** 沿轴方向覆盖的起止格坐标（含两端）。 */
  from: number;
  to: number;
}

export interface LevelBlueprint {
  id: string;
  title: string;
  blurb: string;
  rows: string[];
  player: { x: number; y: number };
  boxes: { kind: BoxKind; x: number; y: number }[];
  plates: {
    accept: BoxKind;
    x: number;
    y: number;
    doorIds: string[];
    floorIds: string[];
  }[];
  doors: { id: string; x: number; y: number }[];
  floors: { id: string; x: number; y: number; morph: FloorMorph }[];
  rugs: RugBlueprint[];
}

function tilesOf(rows: string[]): TileKind[][] {
  return rows.map((row) =>
    [...row].map((ch) => {
      if (ch === "#") return "wall";
      if (ch === "*") return "goal";
      if (ch === "~") return "gap";
      return "floor";
    }),
  );
}

export const LEVELS: LevelBlueprint[] = [
  {
    id: "latch-01",
    title: "门闩入门",
    blurb: "木箱压上木踏板才会开门。多出来的箱子用来压住开关。",
    rows: [
      "#########",
      "#.......#",
      "#.......#",
      "#.......#",
      "#.......#",
      "###...###",
      "#......*#",
      "#......*#",
      "#########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 3 },
      { kind: "timber", x: 4, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    plates: [{ accept: "timber", x: 3, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 4, y: 5 }],
    floors: [],
    rugs: [],
  },
  {
    id: "latch-02",
    title: "认材",
    blurb: "铁踏板只认铁箱。木箱压上去门不会动。",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "####...###",
      "#.......*#",
      "#.......*#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 5, y: 4 },
      { kind: "iron", x: 6, y: 3 },
      { kind: "timber", x: 3, y: 7 },
    ],
    plates: [{ accept: "iron", x: 6, y: 4, doorIds: ["d1"], floorIds: [] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [],
    rugs: [],
  },
  {
    id: "latch-03",
    title: "架桥",
    blurb: "木踏板升起缺口上的桥板。铁箱过桥后，木箱去压本侧目标。",
    rows: [
      "###########",
      "#........*#",
      "#.........#",
      "#.........#",
      "#~~~~~~~~~#",
      "#.........#",
      "#........*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 3, y: 2 },
      { kind: "iron", x: 4, y: 3 },
    ],
    plates: [{ accept: "timber", x: 3, y: 3, doorIds: [], floorIds: ["b1", "b2", "b3"] }],
    doors: [],
    floors: [
      { id: "b1", x: 3, y: 4, morph: "bridge" },
      { id: "b2", x: 4, y: 4, morph: "bridge" },
      { id: "b3", x: 5, y: 4, morph: "bridge" },
    ],
    rugs: [],
  },
  {
    id: "latch-04",
    title: "封廊",
    blurb: "先把一只木箱送进左侧目标，再压踏板。踏板会封住那条廊并打开右侧的门。",
    rows: [
      "##########",
      "#........#",
      "#........#",
      "#........#",
      "#........#",
      "##.##..###",
      "#*......*#",
      "#........#",
      "##########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 6 },
      { kind: "timber", x: 4, y: 2 },
      { kind: "timber", x: 6, y: 4 },
    ],
    plates: [{ accept: "timber", x: 4, y: 3, doorIds: ["d1"], floorIds: ["s1"] }],
    doors: [{ id: "d1", x: 5, y: 5 }],
    floors: [{ id: "s1", x: 2, y: 5, morph: "seal" }],
    rugs: [],
  },
  {
    id: "latch-05",
    title: "双色闸",
    blurb: "玻璃踏板与木踏板各管一扇门。两只箱子都要过闸到达目标。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "##...#...##",
      "#.........#",
      "#*.......*#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 2 },
    boxes: [
      { kind: "timber", x: 2, y: 2 },
      { kind: "glass", x: 8, y: 2 },
      { kind: "timber", x: 3, y: 3 },
      { kind: "glass", x: 7, y: 3 },
    ],
    plates: [
      { accept: "timber", x: 2, y: 3, doorIds: ["west"], floorIds: [] },
      { accept: "glass", x: 8, y: 3, doorIds: ["east"], floorIds: [] },
    ],
    doors: [
      { id: "west", x: 3, y: 4 },
      { id: "east", x: 7, y: 4 },
    ],
    floors: [],
    rugs: [],
  },
  {
    id: "latch-06",
    title: "卷毯翻货",
    blurb:
      "踩住毯端沿格缝往里卷，整排连货带板卷进卷束；反向铺开后条带翻面，同排被压在下层的货会翻到上面，才能推去目标。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.*.....*.#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 1 },
    // (3,6) 同排叠两只：铁箱先在下层、木箱在上层；翻面后铁箱外露才能被推走。
    boxes: [
      { kind: "iron", x: 3, y: 6 },
      { kind: "timber", x: 3, y: 6 },
      { kind: "timber", x: 7, y: 6 },
    ],
    plates: [],
    doors: [],
    floors: [],
    rugs: [{ id: "rug-h", axis: "x", line: 6, from: 1, to: 9 }],
  },
  {
    id: "latch-07",
    title: "十字卡卷",
    blurb:
      "两条折返带十字交叉。横卷压着纵卷要提的货时，拉这头会停在最先卡住的那排；挪开拦路货续卷后，把散货推到右下目标。",
    rows: [
      "###########",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#.........#",
      "#......*..#",
      "#.........#",
      "###########",
    ],
    player: { x: 1, y: 8 },
    // 纵毯条带上的货会在交叉处被横毯压住；(2,7) 的散货最终送去目标 (7,7)。
    boxes: [
      { kind: "timber", x: 5, y: 3 },
      { kind: "timber", x: 2, y: 7 },
    ],
    plates: [],
    doors: [],
    floors: [],
    rugs: [
      { id: "rug-v", axis: "y", line: 5, from: 1, to: 8 },
      { id: "rug-h", axis: "x", line: 5, from: 1, to: 9 },
    ],
  },
];

export function getLevel(id: string): LevelBlueprint {
  const found = LEVELS.find((level) => level.id === id);
  if (!found) throw new Error(`未知关卡 ${id}`);
  return found;
}

export function hydrate(blueprint: LevelBlueprint): RuntimeLevel {
  const boxes = blueprint.boxes.map((box) => ({
    ...box,
    id: createId(box.kind),
    facing: 0 as const,
    stripId: "",
  }));
  const plates = blueprint.plates.map((plate, index) => ({
    ...plate,
    id: `p-${blueprint.id}-${index}`,
    powered: false,
  }));
  const doors = blueprint.doors.map((door) => ({ ...door, open: false }));
  const floors = blueprint.floors.map((floor) => ({ ...floor, active: false }));

  // 每个毯格先收集覆盖到的条带，地面层归最下条带，实体归最上条带。
  const rugs: Rug[] = blueprint.rugs.map((spec, rugIndex) => {
    const count = Math.abs(spec.to - spec.from) + 1;
    const step = spec.to >= spec.from ? 1 : -1;
    const strips: RugStrip[] = [];
    for (let i = 0; i < count; i += 1) {
      const along = spec.from + step * i;
      const x = spec.axis === "x" ? along : spec.line;
      const y = spec.axis === "y" ? along : spec.line;
      strips.push({
        id: `strip-${spec.id}-${i}`,
        x,
        y,
        flat: true,
        facing: 0,
        stack: [],
        depth: rugIndex + 1,
        innerId: null,
      });
    }
    return {
      id: spec.id,
      axis: spec.axis,
      min: Math.min(spec.from, spec.to),
      max: Math.max(spec.from, spec.to),
      rolled: false,
      bundle: null,
      front: null,
      rollDir: null,
      strips,
    };
  });

  const stripsAt = (x: number, y: number): RugStrip[] => {
    const found: RugStrip[] = [];
    for (const rug of rugs) {
      const strip = rug.strips.find((item) => item.x === x && item.y === y);
      if (strip) found.push(strip);
    }
    return found.sort((a, b) => a.depth - b.depth);
  };

  // 地面图块夹进最下层条带。
  for (let y = 0; y < blueprint.rows.length; y += 1) {
    for (let x = 0; x < blueprint.rows[0].length; x += 1) {
      const covering = stripsAt(x, y);
      const lowest = covering[0];
      if (lowest) {
        lowest.stack.push({ kind: "ground", ref: blueprint.rows[y][x] === "#" ? "wall"
          : blueprint.rows[y][x] === "*" ? "goal"
          : blueprint.rows[y][x] === "~" ? "gap"
          : "floor", x, y });
      }
    }
  }
  const claimOnTop = (layer: RugLayer, x: number, y: number): void => {
    const covering = stripsAt(x, y);
    const top = covering[covering.length - 1];
    if (top) top.stack.push(layer);
  };
  for (const floor of floors) {
    claimOnTop({ kind: "floor", ref: floor.id, x: floor.x, y: floor.y }, floor.x, floor.y);
  }
  for (const door of doors) {
    claimOnTop({ kind: "door", ref: door.id, x: door.x, y: door.y }, door.x, door.y);
  }
  for (const plate of plates) {
    claimOnTop({ kind: "plate", ref: plate.id, x: plate.x, y: plate.y }, plate.x, plate.y);
  }
  for (const box of boxes) {
    const covering = stripsAt(box.x, box.y);
    const top = covering[covering.length - 1];
    if (top) {
      top.stack.push({ kind: "box", ref: box.id, x: box.x, y: box.y });
      box.stripId = top.id;
    }
  }

  return {
    id: blueprint.id,
    title: blueprint.title,
    blurb: blueprint.blurb,
    width: blueprint.rows[0].length,
    height: blueprint.rows.length,
    tiles: tilesOf(blueprint.rows),
    player: { ...blueprint.player },
    boxes,
    plates,
    doors,
    floors,
    rugs,
    laySeq: rugs.length,
  };
}
