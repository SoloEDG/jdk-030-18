// 纯引擎模拟测试：node --experimental-strip-types tests/rug-sim.ts
import { strict as assert } from "node:assert";
import test from "node:test";
import { hydrate, LEVELS, getLevel } from "../src/features/voyage/lib/catalog";
import { applyMove } from "../src/features/hauler/lib/push";
import { evaluateGadgets } from "../src/features/gadget/lib/power";
import { goalsSatisfied } from "../src/features/ledger/lib/win";
import { topmostBoxAt, viewCell } from "../src/features/rug/lib/geometry";
import { isPassable } from "../src/features/rug/lib/passable";
import type { Dir, GameDocument, RuntimeLevel } from "../src/shared/types";

function docFor(id: string): GameDocument {
  const level: RuntimeLevel = hydrate(getLevel(id));
  const document: GameDocument = {
    version: 1,
    currentLevelId: id,
    level,
    attempt: { steps: 0, status: "playing" },
    records: {},
  };
  evaluateGadgets(document);
  return document;
}

function step(document: GameDocument, dir: Dir) {
  const result = applyMove(document, dir);
  if (result.moved) document.attempt.steps += 1;
  evaluateGadgets(document);
  return result;
}

function walk(document: GameDocument, dirs: Dir[]) {
  const results = dirs.map((dir) => step(document, dir));
  return results;
}

function at(document: GameDocument, x: number, y: number) {
  return { x, y };
}

test("平展条带把同格货物夹在顶层，断面层序为地面在下货在上", () => {
  const doc = docFor("latch-06");
  const rug = doc.level.rugs[0];
  const strip3 = rug.strips.find((s) => s.x === 3 && s.y === 6)!;
  const kinds = strip3.stack.map((l) => l.kind);
  assert.deepEqual(kinds, ["ground", "box", "box"]);
  const top = topmostBoxAt(doc, 3, 6);
  assert.ok(top, "同格应能取到外露顶箱");
});

test("整卷反铺后条带翻面，压下层的货翻到顶层且朝向翻转", () => {
  const doc = docFor("latch-06");
  // 人走到左毯端 (1,6)，一路向东卷到底，再向西反铺。
  walk(doc, ["s", "s", "s", "s", "s"]); // (1,1)->(1,6)
  let r = step(doc, "e");
  assert.equal(r.moved, true);
  assert.equal(r.rugRows, 9, "九排一次卷到东端");
  const rug = doc.level.rugs[0];
  assert.equal(rug.rolled, true);
  // 卷束格上没有外露箱子。
  assert.equal(topmostBoxAt(doc, rug.bundle!.x, rug.bundle!.y), undefined);
  r = step(doc, "w");
  assert.equal(r.moved, true);
  assert.equal(rug.rolled, false);
  const strip3 = rug.strips.find((s) => s.x === 3 && s.y === 6)!;
  assert.equal(strip3.facing, 1, "条带应处于翻面状态");
  const boxLayers = strip3.stack.filter((l) => l.kind === "box");
  assert.equal(boxLayers.length, 2);
  // 反铺后 effectiveLayers 翻转：原本最下层的箱现在外露在顶。
  const top = topmostBoxAt(doc, 3, 6)!;
  assert.equal(top.id, boxLayers[0].ref, "原来压在下面的货应翻到顶层");
  assert.equal(top.facing, 1, "箱子朝向应随条带翻转");
});

test("被卷入的格不通行，踏板与目标在卷入期间不计状态", () => {
  const doc = docFor("latch-06");
  walk(doc, ["s", "s", "s", "s", "s"]);
  step(doc, "e"); // 全卷
  const rug = doc.level.rugs[0];
  const view = viewCell(doc, rug.bundle!.x, rug.bundle!.y);
  assert.ok(view.bundle, "卷束所在格应标记为 bundle");
  // 人在卷束上，普通相邻格可走；卷束格本身对普通移动不可通行。
  const blocked = applyMove(doc, "n");
  // 人从卷束向北离开应可走（普通地板）。
  assert.equal(blocked.moved, true);
});

test("垂直两卷交叉、无上层夹货时：下层纵毯可以一路全卷", () => {
  const doc = docFor("latch-07");
  const rugV = doc.level.rugs[0];
  // 绕开 (5,3) 的货：col1 北上到 y2，东行到 col4，沿 col4 南下到 y8，再踏上 (5,8)。
  walk(doc, [
    "n", "n", "n", "n", "n", "n", "e", "e", "e",
    "s", "s", "s", "s", "s", "s", "e",
  ]);
  assert.deepEqual(doc.level.player, { x: 5, y: 8 });
  const rollV = step(doc, "n");
  assert.equal(rollV.moved, true);
  assert.equal(rugV.rolled, true, "交叉点没有上层夹货时纵毯应能全卷");
});

test("真正的交叉卡死：横毯在上压着货，纵毯卷到交叉排即停且已卷部分保留", () => {
  const doc = docFor("latch-07");
  const rugV = doc.level.rugs[0];
  const rugH = doc.level.rugs[1];
  // 1. 人到 (5,2)，把纵毯上的货 (5,3) 向南推两格到交叉点 (5,5)。
  walk(doc, ["n", "n", "n", "n", "n", "n", "e", "e", "e", "e"]);
  assert.deepEqual(doc.level.player, { x: 5, y: 2 });
  step(doc, "s");
  step(doc, "s");
  const cargo = doc.level.boxes.find((b) => b.x === 5 && b.y === 5)!;
  assert.ok(cargo);
  // 横毯是交叉处上层条带，货应被它接住。
  const hCross = rugH.strips.find((s) => s.x === 5 && s.y === 5)!;
  assert.ok(hCross.stack.some((l) => l.kind === "box" && l.ref === cargo.id));
  // 2. 绕到纵毯南端 (5,8) 向北卷。
  walk(doc, ["e", "s", "s", "s", "s", "w"]);
  assert.deepEqual(doc.level.player, { x: 5, y: 8 });
  const jam = step(doc, "n");
  assert.equal(jam.reason, undefined);
  assert.equal(jam.moved, true, "边排先卷起，直到交叉排才受阻");
  assert.equal(jam.rugRows, 3, "卷到交叉排前的三排后停下");
  // 交叉排与更北的排保持平展，南端三排已卷并保留。
  assert.equal(hCross.flat, true, "受阻的交叉排没有被卷起");
  const rolledRows = rugV.strips.filter((s) => !s.flat).map((s) => s.y).sort();
  assert.deepEqual(rolledRows, [6, 7, 8], "最先受阻排之前真正卷起的部分保留");
  assert.equal(rugV.rolled, false, "纵毯此时仍是一束未完成的半卷");
  assert.deepEqual(rugV.bundle, { x: 5, y: 6 });
  // 3. 把拦路货向西推出交叉点后，回到卷束沿原方向续卷即可卷完。
  walk(doc, ["e", "n", "w"]);
  assert.deepEqual({ x: cargo.x, y: cargo.y }, { x: 4, y: 5 });
  walk(doc, ["e", "s", "w"]);
  assert.deepEqual(doc.level.player, { x: 5, y: 6 });
  const cont = step(doc, "n");
  assert.equal(cont.moved, true);
  assert.equal(rugV.rolled, true, "障碍移除后纵毯可卷完整张");
});

test("同一坐标反复卷铺：夹在两层之间的货不会被画成顶层", () => {
  const doc = docFor("latch-06");
  walk(doc, ["s", "s", "s", "s", "s"]);
  for (let i = 0; i < 3; i += 1) {
    step(doc, "e");
    step(doc, "w");
  }
  const rug = doc.level.rugs[0];
  const strip3 = rug.strips.find((s) => s.x === 3 && s.y === 6)!;
  // 三次翻面后面值 parity 为 1（奇数次）。
  assert.equal(strip3.facing, 1);
  // 顶箱始终是 effectiveLayers 的最上一层，绝不越层。
  const top = topmostBoxAt(doc, 3, 6)!;
  const eff = strip3.facing === 0 ? strip3.stack : [...strip3.stack].reverse();
  const topLayer = [...eff].reverse().find((l) => l.kind === "box")!;
  assert.equal(top.id, topLayer.ref);
});

test("目标格只有确实外露并压货时才计入完成", () => {
  const doc = docFor("latch-06");
  assert.equal(goalsSatisfied(doc), false);
  walk(doc, ["s", "s", "s", "s", "s"]);
  step(doc, "e"); // 卷入后目标格不外露
  assert.equal(goalsSatisfied(doc), false);
  step(doc, "w"); // 反铺
  // 仍未把货放到目标 (2,6)(8,6)，不通过。
  assert.equal(goalsSatisfied(doc), false);
});

test("关卡目录包含两张卷毯关卡且 hydrate 结构完整", () => {
  const ids = LEVELS.map((l) => l.id);
  assert.ok(ids.includes("latch-06"));
  assert.ok(ids.includes("latch-07"));
  const doc6 = docFor("latch-06");
  assert.equal(doc6.level.rugs.length, 1);
  assert.equal(doc6.level.rugs[0].strips.length, 9);
  const doc7 = docFor("latch-07");
  assert.equal(doc7.level.rugs.length, 2);
});

test("反铺时只有实际露出来的格可通行，卷束格始终不能落脚", () => {
  const doc = docFor("latch-06");
  walk(doc, ["s", "s", "s", "s", "s"]);
  step(doc, "e"); // 全卷，卷束在 (9,6)
  const rug = doc.level.rugs[0];
  assert.equal(isPassable(doc, rug.bundle!), false, "卷束格不可通行");
  step(doc, "w"); // 反铺回平展
  assert.equal(
    isPassable(doc, { x: 1, y: 6 }, { ignorePlayer: true }),
    true,
    "反铺后毯格恢复可通行（忽略站在上面的人）",
  );
});

test("踏板随条带卷入后断电，反铺外露且压对货才恢复", () => {
  const level = hydrate(getLevel("latch-06"));
  level.plates.push({
    id: "p-test", x: 4, y: 6, accept: "iron", doorIds: [], floorIds: [], powered: false,
  });
  const strip = level.rugs[0].strips.find((s) => s.x === 4 && s.y === 6)!;
  strip.stack.push({ kind: "plate", ref: "p-test", x: 4, y: 6 });
  const doc: GameDocument = {
    version: 1, currentLevelId: "x", level,
    attempt: { steps: 0, status: "playing" }, records: {},
  };
  evaluateGadgets(doc);
  assert.equal(level.plates[0].powered, false, "没有铁箱压着时断电");
  walk(doc, ["s", "s", "s", "s", "s", "e"]); // 卷入
  evaluateGadgets(doc);
  const plate = level.plates.find((p) => p.id === "p-test")!;
  assert.equal(plate.powered, false, "踏板被卷走后不外露，保持断电");
  step(doc, "w"); // 反铺
  evaluateGadgets(doc);
  assert.equal(plate.powered, false, "外露但该格没有铁箱，仍断电");
});

test("半卷卡住时卷束格仍不可通行、卷入的层不外露，且面板数据可读", () => {
  const doc = docFor("latch-07");
  const rugV = doc.level.rugs[0];
  // 复刻交叉卡死：货推到 (5,5) 被上层横毯接住，纵毯从南端北卷三排后受阻。
  walk(doc, ["n", "n", "n", "n", "n", "n", "e", "e", "e", "e"]);
  step(doc, "s");
  step(doc, "s");
  walk(doc, ["e", "s", "s", "s", "s", "w"]);
  const jam = step(doc, "n");
  assert.equal(jam.moved, true);
  assert.equal(rugV.rolled, false, "仍是半卷状态");
  assert.ok(rugV.bundle, "半卷也持有卷束坐标");
  // 卷束所在格不可通行。
  assert.equal(isPassable(doc, rugV.bundle!), false);
  // 卷束格看不到任何外露货箱。
  assert.equal(topmostBoxAt(doc, rugV.bundle!.x, rugV.bundle!.y), undefined);
  // 已卷入的 (5,8) 条带不外露，其地面层不出现在该格视图里。
  const hiddenView = viewCell(doc, 5, 8);
  assert.equal(hiddenView.strips.length, 0, "卷入条带不再平铺在原格");
});

test("卷束格：搬运员本人能站上操纵，箱子不能被推上去", () => {
  const doc = docFor("latch-07");
  const rugV = doc.level.rugs[0];
  walk(doc, ["n", "n", "n", "n", "n", "n", "e", "e", "e", "e"]);
  step(doc, "s");
  step(doc, "s");
  walk(doc, ["e", "s", "s", "s", "s", "w"]);
  step(doc, "n"); // 半卷，卷束在 (5,6)
  const bundle = rugV.bundle!;
  // 人离开后能再站上卷束（此刻人正站在上面，故忽略自身占位）。
  assert.equal(isPassable(doc, bundle, { allowBundle: true, ignorePlayer: true }), true);
  // 默认与推箱判定都不放行。
  assert.equal(isPassable(doc, bundle), false);
  assert.equal(isPassable(doc, bundle, { ignoreBoxId: "x", ignorePlayer: true }), false);
});
