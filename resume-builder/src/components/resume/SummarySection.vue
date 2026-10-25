<script setup lang="ts">
import PlaceholderText from '../shared/PlaceholderText.vue'
defineProps<{ summary: string }>()
</script>

<template>
  <section v-if="summary.trim()" class="resume-section" aria-labelledby="summary-heading">
    <h2 id="summary-heading">Profile</h2>
    <p class="lead"><PlaceholderText :text="summary" /></p>
  </section>
</template>

<style scoped lang="scss">
.lead {
  font-size: 9.8pt;
}
</style>
