<script setup lang="ts">
import { computed } from 'vue'
import type { Certification } from '../../types/profile'
import { safeLink } from '../../utils/safeLink'
import PlaceholderText from '../shared/PlaceholderText.vue'
const props = defineProps<{ certifications: Certification[] }>()
const entries = computed(() =>
  props.certifications
    .map((entry) => ({
      ...entry,
      details: [entry.issuer, entry.date].filter((text) => text.trim()),
    }))
    .filter((entry) => entry.name.trim() || entry.details.length),
)
</script>

<template>
  <section v-if="entries.length" class="resume-section" aria-labelledby="certification-heading">
    <h2 id="certification-heading">Certifications</h2>
    <p v-for="certification in entries" :key="certification.id" class="certification-entry">
      <b v-if="certification.name.trim()">
        <a v-if="safeLink(certification.url)" :href="safeLink(certification.url)">
          <PlaceholderText :text="certification.name" />
        </a>
        <PlaceholderText v-else :text="certification.name" />
      </b>
      <template v-for="(detail, index) in certification.details" :key="index">
        <template v-if="certification.name.trim() || index"> | </template>
        <PlaceholderText :text="detail" />
      </template>
    </p>
  </section>
</template>

<style scoped lang="scss">
@media print {
  .certification-entry {
    break-inside: avoid;
  }
}
</style>
