<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ text: string }>()
const parts = computed(() => props.text.split(/(\[[^\]]+\])/g).filter(Boolean))
</script>

<template>
  <template v-for="(part, index) in parts" :key="index">
    <mark v-if="part.startsWith('[') && part.endsWith(']')" class="fill">
      {{ part }}
    </mark>
    <template v-else>
      {{ part }}
    </template>
  </template>
</template>

<style scoped lang="scss">
.fill {
  background: #fff2a8;
  color: #24201f;
  padding: 0 2px;
  border-radius: 2px;
  font: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
</style>
