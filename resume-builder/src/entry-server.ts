import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import DocumentApp from './DocumentApp.vue'
import { profile } from './data/currentApplication'

export async function renderDocument(kind: 'resume' | 'cover-letter') {
  return {
    html: await renderToString(createSSRApp(DocumentApp, { kind })),
    title: [profile.personalInfo.name, kind === 'resume' ? 'Resume' : 'Cover Letter']
      .filter((text) => text.trim())
      .join(' – '),
  }
}
