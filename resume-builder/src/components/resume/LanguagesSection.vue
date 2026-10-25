<script setup lang="ts">
import { computed } from 'vue'
import type { Language } from '../../types/profile'
import PlaceholderText from '../shared/PlaceholderText.vue'
const props = defineProps<{ languages: Language[] }>()
const entries = computed(() =>
  props.languages
    .map((entry) => ({
      id: entry.id,
      text: entry.name.trim()
        ? entry.proficiency.trim()
          ? `${entry.name} (${entry.proficiency})`
          : entry.name
        : entry.proficiency,
    }))
    .filter((entry) => entry.text.trim()),
)
</script>

<template>
  <section v-if="entries.length" class="resume-section" aria-labelledby="languages-heading">
    <h2 id="languages-heading">Languages</h2>
    <p>
      <template v-for="(entry, index) in entries" :key="entry.id"
        ><template v-if="index"> · </template><PlaceholderText :text="entry.text"
      /></template>
    </p>
  </section>
</template>
