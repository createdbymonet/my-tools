<script setup lang="ts">
import type { CoverLetterDocument } from '../types/documents'
import DocumentHeader from '../components/shared/DocumentHeader.vue'
import LetterContent from '../components/cover-letter/LetterContent.vue'
defineProps<{ letter: CoverLetterDocument }>()
</script>

<template>
  <article class="document cover-letter-document" aria-label="Cover letter">
    <DocumentHeader :personal-info="letter.personalInfo" />
    <LetterContent :letter="letter" />
  </article>
</template>
