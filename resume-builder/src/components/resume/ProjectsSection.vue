<script setup lang="ts">
import { computed } from 'vue'
import type { Project } from '../../types/profile'
import { safeLink } from '../../utils/safeLink'
import PlaceholderText from '../shared/PlaceholderText.vue'
const props = defineProps<{ projects: Project[] }>()
const entries = computed(() =>
  props.projects
    .map((project) => ({
      ...project,
      liveUrl: safeLink(project.url),
      repositoryUrl: safeLink(project.repository),
    }))
    .filter(
      (project) =>
        project.name.trim() ||
        project.description.trim() ||
        project.liveUrl ||
        project.repositoryUrl,
    ),
)
</script>

<template>
  <section v-if="entries.length" class="resume-section" aria-labelledby="projects-heading">
    <h2 id="projects-heading">Personal Projects</h2>
    <p v-for="project in entries" :key="project.id" class="project-entry">
      <b v-if="project.name.trim()"><PlaceholderText :text="project.name" /></b>
      <span v-if="project.liveUrl || project.repositoryUrl" class="project-links">
        <a
          v-if="project.liveUrl"
          :href="project.liveUrl"
          :aria-label="project.name.trim() ? `${project.name} live site` : 'Live site'"
          >Live</a
        >
        <a
          v-if="project.repositoryUrl"
          :href="project.repositoryUrl"
          :aria-label="
            project.name.trim() ? `${project.name} source repository` : 'Source repository'
          "
          >Repository</a
        >
      </span>
      <template v-if="project.description.trim()"
        ><template v-if="project.name.trim() || project.liveUrl || project.repositoryUrl">
          — </template
        ><PlaceholderText :text="project.description"
      /></template>
    </p>
  </section>
</template>

<style scoped lang="scss">
.project-links {
  display: inline-flex;
  gap: 6px;
  font-size: 8.8pt;
  color: var(--muted);
  white-space: nowrap;

  a {
    text-decoration: underline;
  }
}

.project-entry > b + .project-links {
  margin-left: 6px;
}

@media print {
  .project-entry {
    break-inside: avoid;
  }

  .project-links a {
    text-decoration: none;
  }
}
</style>
