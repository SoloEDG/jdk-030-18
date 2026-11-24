export type Dir = "n" | "e" | "s" | "w";
export type TileKind = "wall" | "floor" | "goal" | "gap";
export type BoxKind = "timber" | "iron" | "glass";
export type FloorMorph = "bridge" | "seal";
export type AttemptStatus = "playing" | "cleared";
export type RugAxis = "x" | "y";
export type RugFacing = 0 | 1;
export type RugLayerKind = "ground" | "box" | "plate" | "door" | "floor";

export interface Vec {
  x: number;
  y: number;
}

export interface Box {
  id: string;
  kind: BoxKind;
  x: number;
  y: number;
  /** 卷毯翻面次数的奇偶：0 朝上，1 倒扣（仅在被条带夹持时有意义）。 */
  facing: RugFacing;
  /** 夹持该箱的条带 id；空字符串表示松散地待在地面坐标上。 */
  stripId: string;
}

export interface RugLayer {
  kind: RugLayerKind;
  /** ground 层引用的图块种类；其余层引用对应实体的 id。 */
  ref: string;
  /** 进入条带时所在的原始地面坐标。 */
  x: number;
  y: number;
}

export interface RugStrip {
  id: string;
  /** 条带平展时固定覆盖的格缝坐标。 */
  x: number;
  y: number;
  flat: boolean;
  /** 被卷过的次数奇偶，决定反铺后夹持物的上下与朝向。 */
  facing: RugFacing;
  /** 自下而上的夹持层；平展时即该格的真实层叠。 */
  stack: RugLayer[];
  /** 最近一次反铺到顶层的次序，越大越靠上。 */
  depth: number;
  /** 卷束中位于本层外侧、反铺时先揭出的条带 id。 */
  innerId: string | null;
}

export interface Rug {
  id: string;
  axis: RugAxis;
  /** 条带沿轴方向的最小、最大格坐标。 */
  min: number;
  max: number;
  /** 条带整体平展，或已收成一束（占据单格）。 */
  rolled: boolean;
  /** 卷束当前所在格；平展时为 null。 */
  bundle: Vec | null;
  /** 卷束最外层条带 id，反铺时先揭它。 */
  front: string | null;
  /** 上一次卷动方向，反铺时取其反向。 */
  rollDir: Dir | null;
  strips: RugStrip[];
}

export interface Plate {
  id: string;
  x: number;
  y: number;
  accept: BoxKind;
  doorIds: string[];
  floorIds: string[];
  powered: boolean;
}

export interface Door {
  id: string;
  x: number;
  y: number;
  open: boolean;
}

export interface FloorPatch {
  id: string;
  x: number;
  y: number;
  morph: FloorMorph;
  active: boolean;
}

export interface RuntimeLevel {
  id: string;
  title: string;
  blurb: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  player: Vec;
  boxes: Box[];
  plates: Plate[];
  doors: Door[];
  floors: FloorPatch[];
  rugs: Rug[];
  /** 全局反铺次序计数，决定同一坐标多条条带的上下。 */
  laySeq: number;
}

export interface Attempt {
  steps: number;
  status: AttemptStatus;
}

export interface LevelRecord {
  bestSteps: number;
  clearedAt: number;
}

export interface GameDocument {
  version: 1;
  currentLevelId: string;
  level: RuntimeLevel;
  attempt: Attempt;
  records: Record<string, LevelRecord>;
}

export interface MoveResult {
  moved: boolean;
  pushed: boolean;
  boxId?: string;
  rugId?: string;
  /** 本次卷铺实际经过的条带排数。 */
  rugRows?: number;
  reason?:
    | "blocked"
    | "cleared"
    | "idle"
    | "rug-jammed"
    | "rug-blocked"
    | "rug-idle";
}

export const BOX_LABEL: Record<BoxKind, string> = {
  timber: "木箱",
  iron: "铁箱",
  glass: "玻璃箱",
};

export const DIR_VEC: Record<Dir, Vec> = {
  n: { x: 0, y: -1 },
  e: { x: 1, y: 0 },
  s: { x: 0, y: 1 },
  w: { x: -1, y: 0 },
};
