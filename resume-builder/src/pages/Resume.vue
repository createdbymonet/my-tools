<script setup lang="ts">
import type { ResumeData } from '../types/documents'
import DocumentHeader from '../components/shared/DocumentHeader.vue'
import SummarySection from '../components/resume/SummarySection.vue'
import ExperienceSection from '../components/resume/ExperienceSection.vue'
import SkillsSection from '../components/resume/SkillsSection.vue'
import ProjectsSection from '../components/resume/ProjectsSection.vue'
import EducationSection from '../components/resume/EducationSection.vue'
import CertificationSection from '../components/resume/CertificationSection.vue'
import LanguagesSection from '../components/resume/LanguagesSection.vue'
defineProps<{ resume: ResumeData }>()
</script>

<template>
  <article class="document resume-document" aria-label="Resume">
    <DocumentHeader :personal-info="resume.personalInfo" />
    <main class="document-content resume-content">
      <template v-for="section in resume.sectionOrder" :key="section">
        <SummarySection v-if="section === 'summary'" :summary="resume.summary" />
        <ExperienceSection v-else-if="section === 'experience'" :experience="resume.experience" />
        <SkillsSection v-else-if="section === 'skills'" :skills="resume.skills" />
        <ProjectsSection v-else-if="section === 'projects'" :projects="resume.projects" />
        <EducationSection v-else-if="section === 'education'" :education="resume.education" />
        <CertificationSection
          v-else-if="section === 'certifications'"
          :certifications="resume.certifications"
        />
        <LanguagesSection v-else-if="section === 'languages'" :languages="resume.languages" />
      </template>
    </main>
  </article>
</template>
