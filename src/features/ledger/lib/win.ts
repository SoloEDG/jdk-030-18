import { goalCells } from "@/features/atlas/lib/grid";
import { exposedTile, topmostBoxAt, viewCell } from "@/features/rug/lib/geometry";
import type { GameDocument, Vec } from "@/shared/types";

export function filledGoals(document: GameDocument): Vec[] {
  return goalCells(document.level).filter((cell) => {
    // 目标格连同条带被卷走后不算外露，夹在两层之间的货也不计入。
    if (exposedTile(document, cell.x, cell.y) !== "goal") return false;
    return Boolean(topmostBoxAt(document, cell.x, cell.y));
  });
}

export function goalsSatisfied(document: GameDocument): boolean {
  const goals = goalCells(document.level);
  if (goals.length === 0) return false;
  return goals.every((cell) => {
    if (exposedTile(document, cell.x, cell.y) !== "goal") return false;
    const view = viewCell(document, cell.x, cell.y);
    return Boolean(topmostBoxAt(document, cell.x, cell.y)) && !view.bundle;
  });
}

export function coverageLine(document: GameDocument): string {
  const total = goalCells(document.level).length;
  const filled = filledGoals(document).length;
  return `${filled} / ${total} 个目标格已有箱子`;
}
