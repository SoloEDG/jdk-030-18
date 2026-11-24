export { rugMove } from "./lib/engine";
export {
  AXIS_DELTA,
  axisOfDir,
  catchLooseBox,
  effectiveLayers,
  endStrip,
  exposedTile,
  oppositeDir,
  resolveBox,
  stripIndex,
  topmostBoxAt,
  viewCell,
  bundleAt,
} from "./lib/geometry";
export type { CellView, ExposedLayer } from "./lib/geometry";
export { groundOpen, isPassable, describeBlock } from "./lib/passable";
export { useRugSection } from "./model/useRugSection";
export { default as RugPanel } from "./ui/RugPanel.vue";
