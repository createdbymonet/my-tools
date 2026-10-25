import './styles/document.scss'
import './styles/print.scss'
import { createApp } from 'vue'
import DocumentApp from './DocumentApp.vue'
import { profile } from './data/currentApplication'

export function mountDocument(kind: 'resume' | 'cover-letter') {
  document.title = [profile.personalInfo.name, kind === 'resume' ? 'Resume' : 'Cover Letter']
    .filter((text) => text.trim())
    .join(' – ')
  createApp(DocumentApp, { kind }).mount('#app')
}
