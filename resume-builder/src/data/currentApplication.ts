import { assertApplication, assertProfile } from '../utils/validateData'

// A local profile replaces the entire tracked file in every mode, including builds.
const profiles = import.meta.glob<unknown>(['./profile.json', './profile.development.json'], {
  eager: true,
  import: 'default',
})
const profilePath = Object.hasOwn(profiles, './profile.development.json')
  ? './profile.development.json'
  : './profile.json'
const profileJson = profiles[profilePath]

// Vite discovers new application JSON files automatically; no code edits needed.
const applications = import.meta.glob<unknown>('./applications/*.json', {
  eager: true,
  import: 'default',
})

export const currentApplication = import.meta.env.VITE_APPLICATION?.trim() || 'sample-company'
const applicationPath = `./applications/${currentApplication}.json`
const selected = applications[applicationPath]

if (!selected) {
  const available = Object.keys(applications)
    .map((path) => path.replace('./applications/', '').replace('.json', ''))
    .join(', ')
  throw new Error(`Application "${currentApplication}" was not found. Available: ${available}`)
}

// JSON imports widen literal strings (including section IDs). Runtime assertions
// validate and narrow both JSON documents, reporting a field path on bad edits.
assertProfile(profileJson)
assertApplication(selected)

export const profile = profileJson
export const application = selected
