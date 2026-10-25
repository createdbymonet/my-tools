<script setup lang="ts">
import { computed } from 'vue'
import type { Experience } from '../../types/profile'
import PlaceholderText from '../shared/PlaceholderText.vue'
const props = defineProps<{ experience: Experience[] }>()
const entries = computed(() =>
  props.experience
    .map((entry) => ({
      ...entry,
      heading: [entry.role, entry.company].filter((text) => text.trim()).join(' · '),
      dates: [entry.startDate, entry.endDate].filter((text) => text.trim()).join(' – '),
      bullets: entry.bullets.filter((text) => text.trim()),
    }))
    .filter(
      (entry) => entry.heading || entry.dates || entry.location.trim() || entry.bullets.length,
    ),
)
</script>

<template>
  <section v-if="entries.length" class="resume-section" aria-labelledby="experience-heading">
    <h2 id="experience-heading">Experience</h2>
    <div v-for="entry in entries" :key="entry.id" class="experience-entry">
      <div v-if="entry.heading || entry.dates" class="entry-heading">
        <h3 v-if="entry.heading">
          <PlaceholderText :text="entry.heading" />
        </h3>
        <span v-if="entry.dates" class="dates">
          {{ entry.dates }}
        </span>
      </div>
      <p v-if="entry.location.trim()" class="sub">
        <PlaceholderText :text="entry.location" />
      </p>
      <ul v-if="entry.bullets.length">
        <li v-for="(bullet, index) in entry.bullets" :key="index">
          <PlaceholderText :text="bullet" />
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
@media print {
  .experience-entry {
    break-inside: avoid;
  }
}
</style>
