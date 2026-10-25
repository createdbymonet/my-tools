import assert from 'node:assert/strict'
import test from 'node:test'
import type { Application } from '../src/types/application.ts'
import type { Profile } from '../src/types/profile.ts'
import { assertApplication, assertProfile } from '../src/utils/validateData.ts'

function application(): Application {
  return {
    company: { name: 'Sample company', position: 'Developer', location: '', hiringManager: '' },
    resume: {},
    coverLetter: {
      date: '',
      recipient: '',
      greeting: '',
      opening: '',
      body: [],
      closing: '',
      signOff: '',
    },
  }
}

function profile(): Profile {
  return {
    personalInfo: {
      name: '',
      professionalTitle: '',
      location: '',
      email: '',
      phone: '',
      links: [],
      workAuthorization: '',
    },
    summary: '',
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    sectionOrder: ['summary', 'experience'],
  }
}

function withoutField(value: object, key: string): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value }
  delete result[key]
  return result
}

test('accepts complete application data with blank strings and empty arrays', () => {
  const value: unknown = application()
  assertApplication(value)
  assert.equal(value.company.name, 'Sample company')
  assert.equal(value.coverLetter.date, '')
  assert.equal(value.coverLetter.recipient, '')
  assert.deepEqual(value.coverLetter.body, [])
})

test('requires every application, company and cover-letter property', () => {
  const value = application()
  for (const key of Object.keys(value)) {
    assert.throws(() => assertApplication(withoutField(value, key)), /required field is missing/)
  }
  for (const key of Object.keys(value.company)) {
    assert.throws(
      () =>
        assertApplication({
          ...value,
          company: withoutField(value.company, key),
        }),
      /application\.company\.[^:]+: required field is missing/,
    )
  }
  for (const key of Object.keys(value.coverLetter)) {
    assert.throws(
      () =>
        assertApplication({
          ...value,
          coverLetter: withoutField(value.coverLetter, key),
        }),
      /application\.coverLetter\.[^:]+: required field is missing/,
    )
  }
})

test('requires reusable profile properties and accepts blank display fields', () => {
  const value = profile()
  assertProfile(value)
  for (const key of Object.keys(value)) {
    assert.throws(() => assertProfile(withoutField(value, key)), /required field is missing/)
  }
  for (const key of Object.keys(value.personalInfo)) {
    assert.throws(
      () =>
        assertProfile({
          ...value,
          personalInfo: withoutField(value.personalInfo, key),
        }),
      /profile\.personalInfo\.[^:]+: required field is missing/,
    )
  }
})

test('validates partial overrides while requiring complete added entries', () => {
  assertApplication({
    ...application(),
    resume: {
      personalInfo: { professionalTitle: '' },
      experience: { updates: [{ id: 'dominosoft', bullets: [] }] },
      projects: { add: [{ id: 'project', name: '', url: '', repository: '', description: '' }] },
    },
  })
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        resume: { experience: { add: [{ id: 'new', role: 'Developer' }] } },
      }),
    /application\.resume\.experience\.add\[0\]\.company: required field is missing/,
  )
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        resume: {
          projects: { add: [{ id: 'project', name: '', repository: '', description: '' }] },
        },
      }),
    /application\.resume\.projects\.add\[0\]\.url: required field is missing/,
  )
})

test('requires URL fields on reusable links and projects while allowing empty URLs', () => {
  const value = {
    ...profile(),
    personalInfo: {
      ...profile().personalInfo,
      links: [{ id: 'github', label: 'GitHub', url: '' }],
    },
    projects: [{ id: 'thisisme', name: 'This is me', url: '', repository: '', description: '' }],
  }
  assertProfile(value)
  assert.throws(
    () =>
      assertProfile({
        ...value,
        projects: [{ id: 'thisisme', name: 'This is me', repository: '', description: '' }],
      }),
    /profile\.projects\[0\]\.url: required field is missing/,
  )
  assert.throws(
    () =>
      assertProfile({
        ...value,
        personalInfo: { ...value.personalInfo, links: [{ id: 'github', label: 'GitHub' }] },
      }),
    /profile\.personalInfo\.links\[0\]\.url: required field is missing/,
  )
})

test('requires string repository fields on full projects while accepting blank links and partial updates', () => {
  const project = { id: 'catfolio', name: 'Catfolio', url: '', repository: '', description: '' }
  for (const repository of ['', 'https://github.com/example/catfolio']) {
    const entry = { ...project, repository }
    assertProfile({ ...profile(), projects: [entry] })
    assertApplication({ ...application(), resume: { projects: { add: [entry] } } })
  }
  assert.throws(
    () => assertProfile({ ...profile(), projects: [withoutField(project, 'repository')] }),
    /profile\.projects\[0\]\.repository: required field is missing/,
  )
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        resume: { projects: { add: [withoutField(project, 'repository')] } },
      }),
    /application\.resume\.projects\.add\[0\]\.repository: required field is missing/,
  )
  for (const repository of [42, null]) {
    assert.throws(
      () => assertProfile({ ...profile(), projects: [{ ...project, repository }] }),
      /profile\.projects\[0\]\.repository: expected a string/,
    )
    assert.throws(
      () =>
        assertApplication({
          ...application(),
          resume: { projects: { updates: [{ id: project.id, repository }] } },
        }),
      /application\.resume\.projects\.updates\[0\]\.repository: expected a string/,
    )
  }
  assertApplication({
    ...application(),
    resume: { projects: { updates: [{ id: project.id, url: 'https://example.com' }] } },
  })
  assertApplication({
    ...application(),
    resume: { projects: { updates: [{ id: project.id, repository: '' }] } },
  })
})

test('reports malformed nested arrays with a precise JSON path', () => {
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        resume: { skills: { updates: [{ id: 'core', items: ['Vue 3', 42] }] } },
      }),
    /application\.resume\.skills\.updates\[0\]\.items\[1\]: expected a string/,
  )
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        coverLetter: { ...application().coverLetter, body: 'one paragraph' },
      }),
    /application\.coverLetter\.body: expected an array/,
  )
})

test('rejects misspelled fields instead of silently ignoring an override', () => {
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        resume: { summmary: 'A typo' },
      }),
    /application\.resume\.summmary: unknown field/,
  )
  assert.throws(
    () =>
      assertApplication({
        ...application(),
        resume: { experience: { updates: [{ id: 'dominosoft', bullet: [] }] } },
      }),
    /application\.resume\.experience\.updates\[0\]\.bullet: unknown field/,
  )
})

test('accepts blank or real ISO dates and rejects impossible or ambiguous nonempty dates', () => {
  for (const date of ['', '2024-02-29']) {
    assertApplication({
      ...application(),
      coverLetter: { ...application().coverLetter, date },
    })
  }
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '10/25/2026', ' ']) {
    assert.throws(
      () =>
        assertApplication({
          ...application(),
          coverLetter: { ...application().coverLetter, date },
        }),
      /application\.coverLetter\.date:/,
    )
  }
})

test('validates array types, stable IDs and known sections', () => {
  const value = profile()
  assert.throws(
    () => assertProfile({ ...value, languages: null }),
    /profile\.languages: expected an array/,
  )
  assert.throws(
    () => assertProfile({ ...value, sectionOrder: ['unknown'] }),
    /profile\.sectionOrder\[0\]/,
  )
  assert.throws(
    () =>
      assertProfile({
        ...value,
        personalInfo: { ...value.personalInfo, links: [{ id: ' ', label: 'GitHub', url: '' }] },
      }),
    /profile\.personalInfo\.links\[0\]\.id:/,
  )
})
