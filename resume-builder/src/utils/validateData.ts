import type { Application } from '../types/application.ts'
import { resumeSectionIds } from '../types/profile.ts'
import type { Profile } from '../types/profile.ts'

type Check = (value: unknown, path: string) => void
type Fields = Record<string, Check>

function invalid(path: string, expectation: string): never {
  throw new Error(`${path}: ${expectation}.`)
}

const text: Check = (value, path) => {
  if (typeof value !== 'string') invalid(path, 'expected a string')
}

const id: Check = (value, path) => {
  if (typeof value !== 'string' || !value || value.trim() !== value) {
    invalid(path, 'expected a nonempty ID without surrounding whitespace')
  }
}

function list(check: Check): Check {
  return (value, path) => {
    if (!Array.isArray(value)) invalid(path, 'expected an array')
    value.forEach((item: unknown, index: number) => check(item, `${path}[${index}]`))
  }
}

/** Reject unknown keys as well as missing fields, so JSON typos fail visibly. */
function object(fields: Fields, required: readonly string[] = Object.keys(fields)): Check {
  return (value, path) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      invalid(path, 'expected an object')
    }
    const record = value as Record<string, unknown>
    for (const key of Object.keys(record)) {
      if (!Object.hasOwn(fields, key)) invalid(`${path}.${key}`, 'unknown field')
    }
    for (const key of required) {
      if (!Object.hasOwn(record, key)) invalid(`${path}.${key}`, 'required field is missing')
    }
    for (const [key, entry] of Object.entries(record)) fields[key]?.(entry, `${path}.${key}`)
  }
}

const strings = list(text)
const ids = list(id)
const sections = new Set<string>(resumeSectionIds)
const sectionOrder = list((value, path) => {
  if (typeof value !== 'string' || !sections.has(value)) invalid(path, 'unknown resume section')
})

const isoDate: Check = (value, path) => {
  if (value === '') return
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    invalid(path, 'expected a date in YYYY-MM-DD format')
  }
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    invalid(path, 'expected a real calendar date')
  }
}

const link = { id, label: text, url: text }
const personalInfo = {
  name: text,
  professionalTitle: text,
  location: text,
  email: text,
  phone: text,
  links: list(object(link)),
  workAuthorization: text,
}
const skill = { id, label: text, items: strings }
const experience = {
  id,
  role: text,
  company: text,
  location: text,
  startDate: text,
  endDate: text,
  bullets: strings,
}
const education = {
  id,
  qualification: text,
  institution: text,
  location: text,
  startDate: text,
  endDate: text,
  details: strings,
}
const certification = { id, name: text, issuer: text, date: text, url: text }
const project = { id, name: text, url: text, repository: text, description: text }
const language = { id, name: text, proficiency: text }

function collection(fields: Fields): Check {
  return object(
    {
      updates: list(object(fields, ['id'])),
      add: list(object(fields)),
      remove: ids,
      order: ids,
    },
    [],
  )
}

const profileCheck = object({
  personalInfo: object(personalInfo),
  summary: text,
  skills: list(object(skill)),
  experience: list(object(experience)),
  education: list(object(education)),
  certifications: list(object(certification)),
  projects: list(object(project)),
  languages: list(object(language)),
  sectionOrder,
})

const applicationCheck = object({
  company: object({ name: text, position: text, location: text, hiringManager: text }),
  resume: object(
    {
      personalInfo: object(personalInfo, []),
      summary: text,
      skills: collection(skill),
      experience: collection(experience),
      education: collection(education),
      certifications: collection(certification),
      projects: collection(project),
      languages: collection(language),
      sectionOrder,
    },
    [],
  ),
  coverLetter: object({
    date: isoDate,
    recipient: text,
    greeting: text,
    opening: text,
    body: strings,
    closing: text,
    signOff: text,
  }),
})

/** Shape validation is separate from the merge utility's ID/reference checks. */
export function assertProfile(value: unknown): asserts value is Profile {
  profileCheck(value, 'profile')
}

export function assertApplication(value: unknown): asserts value is Application {
  applicationCheck(value, 'application')
}
