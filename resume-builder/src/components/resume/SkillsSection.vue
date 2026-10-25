<script setup lang="ts">
import { computed } from 'vue'
import type { Skill } from '../../types/profile'
import PlaceholderText from '../shared/PlaceholderText.vue'
const props = defineProps<{ skills: Skill[] }>()
const groups = computed(() =>
  props.skills
    .map((group) => ({
      ...group,
      items: group.items.filter((text) => text.trim()),
    }))
    .filter((group) => group.label.trim() || group.items.length),
)
</script>

<template>
  <section v-if="groups.length" class="resume-section" aria-labelledby="skills-heading">
    <h2 id="skills-heading">Skills</h2>
    <div v-for="group in groups" :key="group.id" class="skill-group">
      <p v-if="group.label.trim()" class="skill-label"><PlaceholderText :text="group.label" /></p>
      <ul v-if="group.items.length" class="tags">
        <li v-for="(item, index) in group.items" :key="index"><PlaceholderText :text="item" /></li>
      </ul>
    </div>
  </section>
</template>

<style scoped lang="scss">
.skill-label {
  font-weight: 600;
  font-size: 9.3pt;
  color: var(--muted);
  margin-top: 4px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 6px;
  margin: 3px 0;
  padding: 0;
  list-style: none;

  li {
    border: 1px solid var(--rule);
    background: #E2E8F0;
    border-radius: 3px;
    padding: 0 6px;
    margin: 0;
    font-size: 9.2pt;
  }
}

@media print {
  .skill-label {
    break-after: avoid;
  }

  .skill-group {
    break-inside: avoid;
  }
}
</style>
