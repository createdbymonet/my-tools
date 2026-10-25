<script setup lang="ts">
import DocumentShell from './components/shared/DocumentShell.vue'
import Resume from './pages/Resume.vue'
import CoverLetter from './pages/CoverLetter.vue'
import { profile, application } from './data/currentApplication'
import { createResumeData, createCoverLetterData } from './utils/mergeApplication'

const props = defineProps<{ kind: 'resume' | 'cover-letter' }>()
const resume = createResumeData(profile, application)
const letter = createCoverLetterData(profile, application)
const hasPlaceholders = /\[[^\]]+\]/.test(JSON.stringify(props.kind === 'resume' ? resume : letter))
</script>

<template>
  <DocumentShell
    :kind="kind"
    :company="application.company.name"
    :has-placeholders="hasPlaceholders"
  >
    <Resume v-if="kind === 'resume'" :resume="resume" />
    <CoverLetter v-else :letter="letter" />
  </DocumentShell>
</template>
