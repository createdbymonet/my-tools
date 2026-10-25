import assert from 'node:assert/strict'
import test from 'node:test'
import type { Application, ResumeOverride } from '../src/types/application.ts'
import type { Profile } from '../src/types/profile.ts'
import { createCoverLetterData, createResumeData } from '../src/utils/mergeApplication.ts'

function profile(): Profile {
  return {
    personalInfo: {
      name: 'Moe Oishi',
      professionalTitle: 'Healthcare Software Developer',
      location: 'Calgary, AB',
      email: 'moe@example.com',
      phone: '+1 123 456 7890',
      links: [{ id: 'linkedin', label: 'LinkedIn', url: 'https://example.com/moe' }],
      workAuthorization: '',
    },
    summary: 'Reusable summary',
    skills: [{ id: 'core', label: 'Core', items: ['TypeScript', 'Vue 3'] }],
    experience: [
      {
        id: 'developer',
        role: 'Software Developer',
        company: 'Company A',
        location: 'Tokyo, Japan (Remote)',
        startDate: 'May 2021',
        endDate: 'Present',
        bullets: ['First achievement', 'Second achievement'],
      },
      {
        id: 'nurse',
        role: 'Veterinary Nurse',
        company: 'Hospital',
        location: '',
        startDate: 'Apr 2017',
        endDate: 'Apr 2021',
        bullets: ['Clinical work'],
      },
    ],
    education: [
      {
        id: 'diploma',
        qualification: 'Diploma',
        institution: 'College',
        location: '',
        startDate: '2014',
        endDate: '2017',
        details: ['Basketball distinction'],
      },
    ],
    certifications: [],
    projects: [
      {
        id: 'extension',
        name: 'Extension',
        url: '',
        repository: '',
        description: 'VS Code extension',
      },
      { id: 'svelte', name: 'App', url: '', repository: '', description: 'Svelte app' },
    ],
    languages: [{ id: 'japanese', name: 'Japanese', proficiency: 'native' }],
    sectionOrder: ['summary', 'experience', 'skills', 'projects', 'education', 'languages'],
  }
}

function application(): Application {
  return {
    company: {
      name: 'Sample Company',
      position: 'Software Developer',
      location: '',
      hiringManager: '',
    },
    resume: {},
    coverLetter: {
      date: '',
      recipient: 'Hiring Manager',
      greeting: 'Dear Hiring Manager,',
      opening: 'Opening paragraph.',
      body: ['Body paragraph.'],
      closing: 'Closing paragraph.',
      signOff: 'Sincerely,',
    },
  }
}

test('no overrides preserve data, normalize section order, and return independent objects', () => {
  const source = profile()
  const app = application()
  const before = structuredClone(source)
  const result = createResumeData(source, app)
  assert.deepEqual(result.experience, source.experience)
  assert.deepEqual(result.sectionOrder, [...source.sectionOrder, 'certifications'])
  result.experience[0]!.bullets.push('Changed result')
  result.personalInfo.links[0]!.label = 'Changed result'
  result.education[0]!.details.push('Changed result')
  assert.deepEqual(source, before)
})

test('nested personal and entry patches preserve unspecified fields, replace arrays, and accept empty values', () => {
  const source = profile()
  const app = application()
  app.resume = {
    personalInfo: { professionalTitle: 'Frontend Developer', phone: '', links: [] },
    summary: '',
    experience: { updates: [{ id: 'developer', bullets: ['Tailored achievement'] }] },
    skills: { updates: [{ id: 'core', items: [] }] },
    education: { updates: [{ id: 'diploma', details: [] }] },
  }
  const before = structuredClone({ source, app })
  const result = createResumeData(source, app)
  assert.equal(result.personalInfo.name, source.personalInfo.name)
  assert.equal(result.personalInfo.email, source.personalInfo.email)
  assert.equal(result.personalInfo.professionalTitle, 'Frontend Developer')
  assert.equal(result.personalInfo.phone, '')
  assert.deepEqual(result.personalInfo.links, [])
  assert.equal(result.summary, '')
  assert.deepEqual(result.experience[0], {
    ...source.experience[0],
    bullets: ['Tailored achievement'],
  })
  assert.deepEqual(result.experience[1], source.experience[1])
  assert.deepEqual(result.skills[0]!.items, [])
  assert.deepEqual(result.education[0]!.details, [])
  result.experience[0]!.bullets.push('Local mutation')
  assert.deepEqual({ source, app }, before)
})

test('collection edits remove, add, and partially reorder entries while retaining unlisted entries', () => {
  const app = application()
  app.resume = {
    projects: {
      remove: ['extension'],
      updates: [{ id: 'svelte', name: 'Tailored app' }],
      add: [
        {
          id: 'angular',
          name: 'Angular app',
          url: '',
          repository: '',
          description: 'A new project',
        },
      ],
      order: ['angular'],
    },
    experience: { order: ['nurse'] },
    sectionOrder: ['skills', 'experience'],
  }
  const result = createResumeData(profile(), app)
  assert.deepEqual(
    result.projects.map(({ id }) => id),
    ['angular', 'svelte'],
  )
  assert.equal(result.projects[1]!.description, 'Svelte app')
  assert.equal(result.projects[1]!.name, 'Tailored app')
  assert.deepEqual(
    result.experience.map(({ id }) => id),
    ['nurse', 'developer'],
  )
  assert.deepEqual(result.sectionOrder, [
    'skills',
    'experience',
    'summary',
    'projects',
    'education',
    'languages',
    'certifications',
  ])
})

test('empty ordering lists retain the existing order; removing all entries clears a section', () => {
  const app = application()
  app.resume = {
    projects: { remove: ['extension', 'svelte'] },
    experience: { order: [] },
    sectionOrder: [],
  }
  const result = createResumeData(profile(), app)
  assert.deepEqual(result.projects, [])
  assert.deepEqual(
    result.experience.map(({ id }) => id),
    ['developer', 'nurse'],
  )
  assert.deepEqual(result.sectionOrder, [...profile().sectionOrder, 'certifications'])
})

test('project link overrides preserve the other link and allow explicit clearing without mutation', () => {
  const source = profile()
  source.projects[0]!.url = 'https://example.com/live'
  source.projects[0]!.repository = 'https://github.com/example/project'
  const before = structuredClone(source)
  const app = application()

  app.resume = { projects: { updates: [{ id: 'extension', url: 'https://example.com/new-live' }] } }
  const liveOverride = createResumeData(source, app).projects[0]!
  assert.equal(liveOverride.url, 'https://example.com/new-live')
  assert.equal(liveOverride.repository, source.projects[0]!.repository)
  assert.equal(liveOverride.description, source.projects[0]!.description)

  app.resume = {
    projects: {
      updates: [{ id: 'extension', repository: 'https://github.com/example/new-project' }],
    },
  }
  const repositoryOverride = createResumeData(source, app).projects[0]!
  assert.equal(repositoryOverride.url, source.projects[0]!.url)
  assert.equal(repositoryOverride.repository, 'https://github.com/example/new-project')

  app.resume = { projects: { updates: [{ id: 'extension', repository: '' }] } }
  const clearedRepository = createResumeData(source, app).projects[0]!
  assert.equal(clearedRepository.repository, '')
  assert.equal(clearedRepository.url, source.projects[0]!.url)

  app.resume = { projects: { updates: [{ id: 'extension', url: '', repository: '' }] } }
  const beforeApplication = structuredClone(app)
  const bothCleared = createResumeData(source, app).projects[0]!
  assert.equal(bothCleared.url, '')
  assert.equal(bothCleared.repository, '')
  assert.deepEqual(source, before)
  assert.deepEqual(app, beforeApplication)
})

test('undefined patch values behave as omitted fields', () => {
  const app = application()
  app.resume = {
    personalInfo: {},
    experience: { updates: [{ id: 'developer' }] },
  }
  // Exercise JS callers without weakening the normal optional-property types.
  Object.defineProperty(app.resume.personalInfo, 'phone', { value: undefined, enumerable: true })
  Object.defineProperty(app.resume.experience!.updates![0], 'location', {
    value: undefined,
    enumerable: true,
  })
  const result = createResumeData(profile(), app)
  assert.equal(result.personalInfo.phone, profile().personalInfo.phone)
  assert.equal(result.experience[0]!.location, profile().experience[0]!.location)
})

test('invalid collection references and contradictory or duplicate IDs fail instead of losing data', () => {
  const cases: [ResumeOverride, RegExp][] = [
    [{ experience: { updates: [{ id: 'missing', role: 'Role' }] } }, /unknown ID "missing"/],
    [{ projects: { remove: ['missing'] } }, /unknown ID "missing"/],
    [{ skills: { order: ['missing'] } }, /unknown or removed ID "missing"/],
    [{ projects: { remove: ['extension'], order: ['extension'] } }, /unknown or removed/],
    [
      { projects: { remove: ['extension'], updates: [{ id: 'extension', name: 'Replacement' }] } },
      /also removed/,
    ],
    [
      {
        projects: {
          add: [
            { id: 'svelte', name: 'Duplicate', url: '', repository: '', description: 'Duplicate' },
          ],
        },
      },
      /already exists/,
    ],
    [
      {
        projects: {
          add: [
            { id: 'new', name: 'One', url: '', repository: '', description: 'One' },
            { id: 'new', name: 'Two', url: '', repository: '', description: 'Two' },
          ],
        },
      },
      /duplicate ID/,
    ],
    [{ experience: { updates: [{ id: 'developer' }, { id: 'developer' }] } }, /duplicate ID/],
    [{ projects: { remove: ['extension', 'extension'] } }, /duplicate ID/],
    [{ skills: { order: ['core', 'core'] } }, /duplicate ID/],
    [{ sectionOrder: ['skills', 'skills'] }, /duplicate ID/],
    [
      {
        projects: {
          add: [{ id: ' ', name: 'No ID', url: '', repository: '', description: 'No ID' }],
        },
      },
      /nonempty strings/,
    ],
  ]
  for (const [resume, pattern] of cases) {
    assert.throws(() => createResumeData(profile(), { ...application(), resume }), pattern)
  }
  const invalidProfile = profile()
  invalidProfile.projects.push({ ...invalidProfile.projects[0]! })
  assert.throws(
    () => createResumeData(invalidProfile, application()),
    /projects profile: duplicate ID/,
  )
})

test('cover letters use reusable identity and preserve explicit display fields without inventing content', () => {
  const source = profile()
  const app = application()
  app.company.hiringManager = '  Alex Smith  '
  app.resume = {
    personalInfo: { name: 'Resume-only name', professionalTitle: 'Resume-only title' },
  }
  const result = createCoverLetterData(source, app)
  assert.deepEqual(result.personalInfo, source.personalInfo)
  assert.equal(result.recipient, 'Hiring Manager')
  assert.equal(result.greeting, 'Dear Hiring Manager,')
  assert.equal(result.signOff, 'Sincerely,')
  assert.equal(result.date, '')
  result.personalInfo.links[0]!.label = 'Local change'
  result.company.name = 'Local change'
  result.body.push('Local change')
  assert.equal(source.personalInfo.links[0]!.label, 'LinkedIn')
  assert.equal(app.company.name, 'Sample Company')
  assert.deepEqual(app.coverLetter.body, ['Body paragraph.'])

  app.coverLetter = {
    ...app.coverLetter,
    date: '2026-10-25',
    recipient: '  Recruiting Team  ',
    greeting: 'Hello team,',
    signOff: 'Kind regards,',
  }
  const custom = createCoverLetterData(source, app)
  assert.equal(custom.date, '2026-10-25')
  assert.equal(custom.recipient, '  Recruiting Team  ')
  assert.equal(custom.greeting, 'Hello team,')
  assert.equal(custom.signOff, 'Kind regards,')

  app.coverLetter.date = ''
  app.coverLetter.recipient = ''
  app.coverLetter.greeting = ''
  app.coverLetter.signOff = ''
  const blank = createCoverLetterData(source, app)
  assert.equal(blank.date, '')
  assert.equal(blank.recipient, '')
  assert.equal(blank.greeting, '')
  assert.equal(blank.signOff, '')
  assert.equal(blank.company.hiringManager, '  Alex Smith  ')
})
