import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createSSRApp } from 'vue'
import type { Component } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createServer } from 'vite'
import type { ViteDevServer } from 'vite'
import type { Profile } from '../src/types/profile.ts'
import type { Application } from '../src/types/application.ts'
import { createCoverLetterData } from '../src/utils/mergeApplication.ts'

let server: ViteDevServer
before(async () => {
  server = await createServer({
    appType: 'custom',
    server: { middlewareMode: true, watch: null, hmr: false, ws: false },
  })
})
after(async () => {
  await server?.close()
})

async function render(path: string, props: Record<string, unknown>): Promise<string> {
  const module = await server.ssrLoadModule(`/src/${path}.vue`)
  const html = await renderToString(createSSRApp(module.default as Component, props))
  // Content assertions are independent of Vue's generated scoped-style IDs.
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/ data-v-[\w-]+(?:="")?/g, '')
}

test('both documents start and render with the actual profile and selected application', async () => {
  const { renderDocument } = (await server.ssrLoadModule(
    '/src/entry-server.ts',
  )) as typeof import('../src/entry-server.ts')
  for (const kind of ['resume', 'cover-letter'] as const) {
    const { html } = await renderDocument(kind)
    assert.match(html, /<article\b/)
  }
})

function blankProfile(): Profile {
  return {
    personalInfo: {
      name: '',
      professionalTitle: '',
      location: '',
      phone: '',
      email: '',
      links: [{ id: 'hidden-link', label: '', url: 'https://example.com' }],
      workAuthorization: '',
    },
    summary: '',
    experience: [
      {
        id: 'job',
        role: '',
        company: '',
        location: '',
        startDate: '',
        endDate: '',
        bullets: ['', ' '],
      },
    ],
    skills: [{ id: 'skills', label: '', items: ['', ' '] }],
    projects: [{ id: 'project', name: '', url: '', repository: '', description: '' }],
    education: [
      {
        id: 'school',
        qualification: '',
        institution: '',
        location: '',
        startDate: '',
        endDate: '',
        details: ['', ' '],
      },
    ],
    certifications: [{ id: 'certificate', name: '', issuer: '', date: '', url: '' }],
    languages: [{ id: 'language', name: '', proficiency: '' }],
    sectionOrder: [
      'summary',
      'experience',
      'skills',
      'projects',
      'education',
      'certifications',
      'languages',
    ],
  }
}

test('blank display fields hide empty resume sections, entries, bullets and contact header', async () => {
  const html = await render('pages/Resume', { resume: blankProfile() })
  assert.match(html, /<article/)
  assert.doesNotMatch(html, /<header|<section|<h[123]|<li\b|<a\b| · | — | – /)
})

test('projects hide blank live and repository links without empty anchors or link areas', async () => {
  const project = { id: 'thisisme', name: 'This is me', url: '', repository: '', description: '' }
  const plain = await render('components/resume/ProjectsSection', { projects: [project] })
  assert.match(plain, /<b>This is me<\/b>/)
  assert.doesNotMatch(plain, /<a\b|project-links| — |Live|Repository/)
  const descriptionOnly = await render('components/resume/ProjectsSection', {
    projects: [{ ...project, name: '', description: 'Description only.' }],
  })
  assert.match(descriptionOnly, /Description only\./)
  assert.doesNotMatch(descriptionOnly, /<b>| — |<a\b|project-links/)
})

test('projects show independent Live and Repository links with the correct destinations', async () => {
  const project = {
    id: 'catfolio',
    name: 'Catfolio',
    url: '',
    repository: '',
    description: 'Project details.',
  }
  const cases = [
    { url: 'https://example.com/demo', repository: '', labels: ['Live'] },
    { url: '', repository: 'https://github.com/example/catfolio', labels: ['Repository'] },
    {
      url: 'https://example.com/demo',
      repository: 'https://github.com/example/catfolio',
      labels: ['Live', 'Repository'],
    },
  ]
  for (const { url, repository, labels } of cases) {
    const html = await render('components/resume/ProjectsSection', {
      projects: [{ ...project, url, repository }],
    })
    const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    assert.deepEqual(
      anchors.map((anchor) => anchor[2]?.trim()),
      labels,
    )
    assert.deepEqual(
      anchors.map((anchor) => anchor[1]?.match(/href="([^"]+)"/)?.[1]),
      [url, repository].filter(Boolean),
    )
    assert.match(html, /project-links/)
    assert.match(html, /<b>Catfolio<\/b>/)
    assert.match(html, / — Project details\./)
    assert.doesNotMatch(html, /href=""|>\s*<\/a>|<a\b[^>]*>Catfolio<\/a>/)
  }
})

test('link-only projects remain visible without a name, description or dangling separator', async () => {
  const html = await render('components/resume/ProjectsSection', {
    projects: [
      {
        id: 'repository-only',
        name: '',
        url: '',
        repository: 'https://github.com/example/project',
        description: '',
      },
    ],
  })
  assert.match(html, /<section/)
  assert.match(html, /<a\b[^>]*href="https:\/\/github\.com\/example\/project"[^>]*>Repository<\/a>/)
  assert.doesNotMatch(html, /<b>| — |href=""/)
})

test('invalid project links do not create anchors or placeholder link areas', async () => {
  const html = await render('components/resume/ProjectsSection', {
    projects: [
      {
        id: 'invalid-links',
        name: 'Project',
        url: 'javascript:alert(1)',
        repository: 'https://github.com/[username]/project',
        description: '',
      },
    ],
  })
  assert.match(html, /<b>Project<\/b>/)
  assert.doesNotMatch(html, /<a\b|project-links|Live|Repository|\[username\]/)
})

test('partially blank entries retain content without dangling separators, parentheses or empty bullets', async () => {
  const resume = blankProfile()
  resume.experience = [
    {
      id: 'job',
      role: '',
      company: 'Company',
      location: '',
      startDate: '',
      endDate: 'Present',
      bullets: ['', 'Work accomplished.', ' '],
    },
  ]
  resume.education = [
    {
      id: 'school',
      qualification: '',
      institution: '',
      location: 'Japan',
      startDate: '',
      endDate: '',
      details: ['', 'Distinction'],
    },
  ]
  resume.certifications = [{ id: 'certificate', name: '', issuer: '', date: '2026', url: '' }]
  resume.languages = [
    { id: 'english', name: 'English', proficiency: '' },
    { id: 'other', name: '', proficiency: 'Intermediate' },
  ]
  const html = await render('pages/Resume', { resume })
  assert.match(html, /<h3>Company<\/h3>/)
  assert.match(html, /class="dates">Present<\/span>/)
  assert.match(html, /<li>Work accomplished\.<\/li>/)
  assert.equal((html.match(/<li>/g) ?? []).length, 1)
  assert.match(html, /Japan · Distinction/)
  assert.match(html, /class="certification-entry">2026<\/p>/)
  assert.match(html, /English · Intermediate/)
  assert.doesNotMatch(html, / – |\(\)|<h3><\/h3>|> · |>, /)
})

test('blank contact fields leave only populated labels without empty links or separators', async () => {
  const personalInfo = blankProfile().personalInfo
  personalInfo.links.push({ id: 'github', label: 'GitHub', url: '' })
  const html = await render('components/shared/DocumentHeader', {
    personalInfo,
  })
  assert.match(html, /class="contact">\s*GitHub\s*<\/p>/)
  assert.doesNotMatch(html, /<h1|professional-title|authorization|<a\b| · /)
})

test('blank cover-letter fields remain hidden without generated greeting, date or sign-off', async () => {
  const profile = blankProfile()
  const application: Application = {
    company: { name: '', position: '', location: '', hiringManager: 'Reference only' },
    resume: {},
    coverLetter: {
      date: '',
      recipient: '',
      greeting: '',
      opening: '',
      body: ['', ' '],
      closing: '',
      signOff: '',
    },
  }
  const empty = await render('pages/CoverLetter', {
    letter: createCoverLetterData(profile, application),
  })
  assert.doesNotMatch(
    empty,
    /<header|<p\b|<time|letter-recipient|Dear|Hiring Manager|Reference only|Sincerely|Re:/,
  )
  application.coverLetter.body = ['', 'Body paragraph.', ' ']
  const bodyOnly = await render('pages/CoverLetter', {
    letter: createCoverLetterData(profile, application),
  })
  assert.match(bodyOnly, /<p>Body paragraph\.<\/p>/)
  assert.equal((bodyOnly.match(/<p>/g) ?? []).length, 1)
  assert.doesNotMatch(bodyOnly, /letter-recipient|letter-greeting|letter-signature|<time/)
})
