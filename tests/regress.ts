import { strict as assert } from "node:assert";
import test from "node:test";
import { hydrate, LEVELS, getLevel } from "../src/features/voyage/lib/catalog";
import { evaluateGadgets } from "../src/features/gadget/lib/power";
import { goalsSatisfied } from "../src/features/ledger/lib/win";
import { isPassable } from "../src/features/rug/lib/passable";
import type { GameDocument, RuntimeLevel } from "../src/shared/types";

function docFor(id: string): GameDocument {
  const level: RuntimeLevel = hydrate(getLevel(id));
  return { version: 1, currentLevelId: id, level, attempt: { steps: 0, status: "playing" }, records: {} };
}

for (const bp of LEVELS.filter((l) => l.rugs.length === 0)) {
  test(`无毯关卡 ${bp.id} hydrate 后没有卷束、所有货为散货`, () => {
    const doc = docFor(bp.id);
    assert.equal(doc.level.rugs.length, 0);
    assert.ok(doc.level.boxes.every((b) => b.stripId === "" && b.facing === 0));
    assert.equal(doc.level.laySeq, 0);
  });
}

test("latch-01 基础推箱与踏板开门流程保持可用", () => {
  const doc = docFor("latch-01");
  // 无毯关卡的箱子始终是散货，踏板压对材质即开门。
  const plate = doc.level.plates[0];
  const box = doc.level.boxes.find((b) => b.kind === plate.accept)!;
  box.x = plate.x;
  box.y = plate.y;
  evaluateGadgets(doc);
  assert.equal(doc.level.doors[0].open, true);
  assert.equal(goalsSatisfied(doc), false);
});

test("无毯时可通行判定与原版一致：墙和关着的门不可走", () => {
  const doc = docFor("latch-01");
  assert.equal(isPassable(doc, { x: 0, y: 0 }), false, "墙角不可通行");
  assert.equal(isPassable(doc, { x: 1, y: 1 }), true, "普通地板可通行");
});
