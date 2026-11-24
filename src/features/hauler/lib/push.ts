import { boxAt } from "./occupancy";
import { isPassable } from "@/features/gadget/lib/passable";
import { catchLooseBox } from "@/features/rug/lib/geometry";
import { rugMove } from "@/features/rug/lib/engine";
import { addVec } from "@/shared/document";
import { DIR_VEC, type Dir, type GameDocument, type MoveResult } from "@/shared/types";

export function applyMove(document: GameDocument, dir: Dir): MoveResult {
  if (document.attempt.status === "cleared") {
    return { moved: false, pushed: false, reason: "cleared" };
  }
  const delta = DIR_VEC[dir];

  // 站在毯端或卷束上时，这一步优先交给卷毯。
  const rugResult = rugMove(document, dir);
  if (rugResult) return rugResult;

  const next = addVec(document.level.player, delta);
  const box = boxAt(document, next);
  if (box) {
    const beyond = addVec(box, delta);
    // 箱子永远不能压到卷束上，因此推箱时不放行 bundle 格。
    if (!isPassable(document, beyond, { ignoreBoxId: box.id, ignorePlayer: true })) {
      return { moved: false, pushed: false, reason: "blocked" };
    }
    // 从条带夹持里推出来的货先变成散货。
    if (box.stripId) {
      const stripId = box.stripId;
      const strip = document.level.rugs
        .flatMap((rug) => rug.strips)
        .find((item) => item.id === stripId);
      strip?.stack.splice(
        strip.stack.findIndex((layer) => layer.kind === "box" && layer.ref === box.id),
        1,
      );
      box.stripId = "";
    }
    box.x = beyond.x;
    box.y = beyond.y;
    catchLooseBox(document, box);
    document.level.player = next;
    return { moved: true, pushed: true, boxId: box.id };
  }
  // 人可以站上卷束以便续卷或反铺。
  if (!isPassable(document, next, { allowBundle: true })) {
    return { moved: false, pushed: false, reason: "blocked" };
  }
  document.level.player = next;
  return { moved: true, pushed: false };
}
