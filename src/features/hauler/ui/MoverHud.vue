<script setup lang="ts">
import { BOX_LABEL, type BoxKind } from "@/shared/types";

defineProps<{ counts: Record<string, number> }>();
const kinds: BoxKind[] = ["timber", "iron", "glass"];
</script>

<template>
  <section class="panel mover" aria-label="推动说明">
    <h2>推动</h2>
    <p class="lede">
      方向键或 WASD 移动一格，只能推不能拉。站在毯端朝毯内按方向即沿格缝卷起，站在卷束上按反方向则反向铺开。
    </p>
    <ul class="counts">
      <li v-for="kind in kinds" :key="kind">
        <span :class="['chip', kind]">{{ BOX_LABEL[kind] }}</span>
        × {{ counts[kind] ?? 0 }}
      </li>
    </ul>
  </section>
</template>
