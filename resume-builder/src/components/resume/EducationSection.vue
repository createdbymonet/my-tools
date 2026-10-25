<script setup lang="ts">
import { computed } from 'vue'
import type { Education } from '../../types/profile'
import PlaceholderText from '../shared/PlaceholderText.vue'
const props = defineProps<{ education: Education[] }>()
const entries = computed(() =>
  props.education
    .map((entry) => ({
      ...entry,
      dates: [entry.startDate, entry.endDate].filter((text) => text.trim()).join(' – '),
      detailLine: [
        [entry.institution, entry.location].filter((text) => text.trim()).join(', '),
        ...entry.details,
      ]
        .filter((text) => text.trim())
        .join(' · '),
    }))
    .filter((entry) => entry.qualification.trim() || entry.dates || entry.detailLine),
)
</script>

<template>
  <section v-if="entries.length" class="resume-section" aria-labelledby="education-heading">
    <h2 id="education-heading">Education</h2>
    <div v-for="entry in entries" :key="entry.id" class="education-entry">
      <div v-if="entry.qualification.trim() || entry.dates" class="entry-heading">
        <h3 v-if="entry.qualification.trim()">
          <PlaceholderText :text="entry.qualification" />
        </h3>
        <span v-if="entry.dates" class="dates">
          {{ entry.dates }}
        </span>
      </div>
      <p v-if="entry.detailLine" class="sub">
        <PlaceholderText :text="entry.detailLine" />
      </p>
    </div>
  </section>
</template>

<style scoped lang="scss">
@media print {
  .education-entry {
    break-inside: avoid;
  }
}
</style>
