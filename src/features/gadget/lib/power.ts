import { topmostBoxAt, viewCell } from "@/features/rug/lib/geometry";
import type { GameDocument } from "@/shared/types";

export function plateHeld(document: GameDocument, plateId: string): boolean {
  const plate = document.level.plates.find((item) => item.id === plateId);
  if (!plate) return false;
  const view = viewCell(document, plate.x, plate.y);
  // 踏板被卷进条带后不再外露，任何箱子都压不到它。
  const plateLayer = view.sequence.find(
    (layer) => layer.kind === "plate" && layer.ref === plate.id,
  );
  if (!plateLayer) return false;
  const box = topmostBoxAt(document, plate.x, plate.y);
  return Boolean(box && box.kind === plate.accept);
}

export function evaluateGadgets(document: GameDocument): void {
  const doorPower = new Set<string>();
  const floorPower = new Set<string>();
  for (const plate of document.level.plates) {
    const held = plateHeld(document, plate.id);
    plate.powered = held;
    if (!held) continue;
    for (const id of plate.doorIds) doorPower.add(id);
    for (const id of plate.floorIds) floorPower.add(id);
  }
  for (const door of document.level.doors) door.open = doorPower.has(door.id);
  for (const floor of document.level.floors) floor.active = floorPower.has(floor.id);
}

export function poweredSummary(document: GameDocument): string {
  const plates = document.level.plates.filter((plate) => plate.powered).length;
  const doors = document.level.doors.filter((door) => door.open).length;
  const floors = document.level.floors.filter((floor) => floor.active).length;
  const rugs = document.level.rugs.filter((rug) => Boolean(rug.bundle)).length;
  const rugText = rugs > 0 ? ` · ${rugs} 张毯卷成束` : "";
  return `${plates} 块踏板供电 · ${doors} 扇门打开 · ${floors} 处地板变形${rugText}`;
}
