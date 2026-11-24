import { computed, type Ref } from "vue";
import { effectiveLayers, stripIndex } from "../lib/geometry";
import type { GameDocument, RugLayer, RugStrip } from "@/shared/types";

export interface SectionRow {
  stripId: string;
  home: string;
  state: "flat" | "rolled";
  facing: 0 | 1;
  layers: { kind: RugLayer["kind"]; label: string; ref: string }[];
}

const LAYER_NAME: Record<RugLayer["kind"], string> = {
  ground: "地面",
  box: "货箱",
  plate: "踏板",
  door: "门闩",
  floor: "地板",
};

function layerLabel(document: GameDocument, layer: RugLayer): string {
  if (layer.kind === "ground") return `地面·${layer.ref}`;
  if (layer.kind === "box") {
    const box = document.level.boxes.find((item) => item.id === layer.ref);
    return box ? `货箱·${box.kind}` : "货箱";
  }
  if (layer.kind === "plate") {
    const plate = document.level.plates.find((item) => item.id === layer.ref);
    return plate ? `踏板·${plate.accept}` : "踏板";
  }
  if (layer.kind === "door") return "门闩";
  const floor = document.level.floors.find((item) => item.id === layer.ref);
  return floor ? `地板·${floor.morph}` : "地板";
}

function describeStrip(document: GameDocument, strip: RugStrip): SectionRow {
  return {
    stripId: strip.id,
    home: `(${strip.x},${strip.y})`,
    state: strip.flat ? "flat" : "rolled",
    facing: strip.facing,
    layers: effectiveLayers(strip).map((layer) => ({
      kind: layer.kind,
      label: layerLabel(document, layer),
      ref: layer.ref,
    })),
  };
}

export function useRugSection(document: Ref<GameDocument>) {
  const sections = computed(() =>
    document.value.level.rugs.map((rug) => ({
      id: rug.id,
      axis: rug.axis,
      // bundle 存在即有卷束：区分半卷（还有平展条带）与全卷。
      rolled: Boolean(rug.bundle),
      fullyRolled: rug.rolled,
      bundle: rug.bundle ? `(${rug.bundle.x},${rug.bundle.y})` : null,
      rows: [...rug.strips]
        .sort((a, b) => stripIndex(rug, a) - stripIndex(rug, b))
        .map((strip) => describeStrip(document.value, strip)),
    })),
  );
  return { sections, LAYER_NAME };
}
