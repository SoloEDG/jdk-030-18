<script setup lang="ts">
import { computed } from "vue";
import { useRugSection } from "../model/useRugSection";
import type { GameDocument } from "@/shared/types";

const props = defineProps<{ document: GameDocument }>();
const { sections } = useRugSection(computed(() => props.document));
</script>

<template>
  <section class="panel rug-section" aria-label="卷毯断面">
    <h2>卷毯断面</h2>
    <p v-if="sections.length === 0" class="lede">本关没有卷毯。</p>
    <div v-for="rug in sections" :key="rug.id" class="rug">
      <h3>
        {{ rug.id }} · {{ rug.axis === "x" ? "横向" : "纵向" }}
        <span :class="['state', rug.rolled ? 'rolled' : 'flat']">
          <template v-if="!rug.rolled">平展</template>
          <template v-else-if="rug.fullyRolled">全卷 {{ rug.bundle }}</template>
          <template v-else>半卷 {{ rug.bundle }}</template>
        </span>
      </h3>
      <ul class="strips">
        <li v-for="row in rug.rows" :key="row.stripId" :class="row.state">
          <div class="strip-head">
            <b>{{ row.home }}</b>
            <span class="tag">{{ row.state === "flat" ? "外露" : "卷入" }}</span>
            <span class="tag" :data-flip="row.facing">
              {{ row.facing === 0 ? "正面" : "翻面" }}
            </span>
          </div>
          <ol v-if="row.layers.length" class="layers">
            <li v-for="(layer, i) in row.layers" :key="`${layer.ref}-${i}`">
              <span class="depth">{{ row.layers.length - i }}</span>
              {{ layer.label }}
            </li>
          </ol>
          <p v-else class="empty">空条带</p>
        </li>
      </ul>
    </div>
    <p class="hint">断面自下而上编号；卷入中的格不在棋盘上外露，翻面条带的层序整体颠倒。</p>
  </section>
</template>

<style scoped>
.rug { border-top: 1px solid var(--line); padding-top: 8px; margin-top: 8px; }
.state { font-weight: 400; opacity: 0.75; margin-left: 6px; }
.state.rolled { color: var(--rust); }
.state.flat { color: var(--moss); }
.strips { display: grid; gap: 6px; max-height: 260px; overflow-y: auto; }
.strips li {
  background: #1a140f;
  border: 1px solid var(--line);
  padding: 6px 8px;
  font-size: 12px;
}
.strips li.rolled { border-color: rgba(181, 106, 50, 0.55); }
.strip-head { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.tag {
  border: 1px solid var(--line);
  padding: 0 5px;
  font-size: 11px;
  opacity: 0.85;
}
.tag[data-flip="1"] { color: var(--rust); }
.layers { margin: 0; padding-left: 4px; }
.layers li { display: flex; gap: 6px; align-items: center; border: none; padding: 1px 0; }
.depth {
  width: 16px; height: 16px;
  display: inline-grid; place-items: center;
  border: 1px solid var(--line);
  font-size: 10px;
  color: var(--brass);
}
.empty { margin: 2px 0; opacity: 0.5; }
</style>
