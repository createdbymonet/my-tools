import type { Application, CollectionOverride } from '../types/application.ts'
import type { CoverLetterDocument, ResumeData } from '../types/documents.ts'
import { resumeSectionIds } from '../types/profile.ts'
import type { Profile, ResumeSectionId } from '../types/profile.ts'

function assertUniqueIds(ids: readonly string[], context: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (typeof id !== 'string' || !id || id.trim() !== id) {
      throw new Error(`${context}: IDs must be nonempty strings without surrounding whitespace.`)
    }
    if (seen.has(id)) throw new Error(`${context}: duplicate ID "${id}".`)
    seen.add(id)
  }
}

/** Undefined is treated as omitted; empty strings and empty leaf arrays are intentional values. */
function definedFields<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}

function moveToFront<T>(items: readonly T[], order: readonly T[]): T[] {
  const listed = new Set(order)
  return [...order, ...items.filter((item) => !listed.has(item))]
}

/**
 * Arrays are edited by stable ID, never by array index. Patches preserve every
 * unspecified field, but supplied leaf arrays (bullets, items, details) replace
 * the old array in full; [] deliberately clears that array.
 *
 * Operations run as remove -> update -> add -> order. Contradictory changes,
 * duplicate IDs and references to unknown/removed entries throw early.
 */
function mergeCollection<T extends { id: string }>(
  entries: readonly T[],
  override: CollectionOverride<T> | undefined,
  context: string,
): T[] {
  assertUniqueIds(
    entries.map(({ id }) => id),
    `${context} profile`,
  )
  const originalIds = new Set(entries.map(({ id }) => id))
  const removedIds = override?.remove ?? []
  const updates = override?.updates ?? []
  const additions = override?.add ?? []
  const order = override?.order ?? []

  assertUniqueIds(removedIds, `${context}.remove`)
  assertUniqueIds(
    updates.map(({ id }) => id),
    `${context}.updates`,
  )
  assertUniqueIds(
    additions.map(({ id }) => id),
    `${context}.add`,
  )
  assertUniqueIds(order, `${context}.order`)

  for (const id of removedIds) {
    if (!originalIds.has(id)) throw new Error(`${context}.remove: unknown ID "${id}".`)
  }

  const removed = new Set(removedIds)
  const patches = new Map(updates.map((patch) => [patch.id, patch]))
  for (const { id } of updates) {
    if (!originalIds.has(id)) throw new Error(`${context}.updates: unknown ID "${id}".`)
    if (removed.has(id)) throw new Error(`${context}.updates: ID "${id}" is also removed.`)
  }
  for (const { id } of additions) {
    if (originalIds.has(id))
      throw new Error(`${context}.add: ID "${id}" already exists in the profile.`)
  }

  const merged = entries
    .filter(({ id }) => !removed.has(id))
    .map((entry) => {
      const patch = patches.get(entry.id)
      return structuredClone(patch ? { ...entry, ...definedFields(patch) } : entry)
    })
  merged.push(...structuredClone(additions))

  const byId = new Map(merged.map((entry) => [entry.id, entry]))
  for (const id of order) {
    if (!byId.has(id)) throw new Error(`${context}.order: unknown or removed ID "${id}".`)
  }
  return moveToFront(
    merged.map(({ id }) => id),
    order,
  ).map((id) => {
    // IDs were checked above; this guard also keeps the lookup explicitly typed.
    const entry = byId.get(id)
    if (!entry) throw new Error(`${context}: missing ID "${id}".`)
    return entry
  })
}

function validateSectionOrder(order: readonly ResumeSectionId[], context: string): void {
  assertUniqueIds(order, context)
  for (const id of order) {
    if (!resumeSectionIds.includes(id)) throw new Error(`${context}: unknown section "${id}".`)
  }
}

export function createResumeData(profile: Profile, application: Application): ResumeData {
  const override = application.resume
  validateSectionOrder(profile.sectionOrder, 'profile.sectionOrder')
  const baseOrder = moveToFront(resumeSectionIds, profile.sectionOrder)
  const selectedOrder = override?.sectionOrder
  if (selectedOrder !== undefined) validateSectionOrder(selectedOrder, 'resume.sectionOrder')
  const finalOrder = selectedOrder === undefined ? baseOrder : moveToFront(baseOrder, selectedOrder)

  const personalInfo = structuredClone({
    ...profile.personalInfo,
    ...definedFields(override?.personalInfo ?? {}),
  })
  assertUniqueIds(
    personalInfo.links.map(({ id }) => id),
    'personalInfo.links',
  )

  return {
    personalInfo,
    summary: override?.summary ?? profile.summary,
    experience: mergeCollection(profile.experience, override?.experience, 'experience'),
    skills: mergeCollection(profile.skills, override?.skills, 'skills'),
    projects: mergeCollection(profile.projects, override?.projects, 'projects'),
    education: mergeCollection(profile.education, override?.education, 'education'),
    certifications: mergeCollection(
      profile.certifications,
      override?.certifications,
      'certifications',
    ),
    languages: mergeCollection(profile.languages, override?.languages, 'languages'),
    sectionOrder: finalOrder,
  }
}

export function createCoverLetterData(
  profile: Profile,
  application: Application,
): CoverLetterDocument {
  const letter = application.coverLetter
  return {
    // The sender is reusable personal data; resume-specific positioning stays on the resume.
    personalInfo: structuredClone(profile.personalInfo),
    company: structuredClone(application.company),
    // Every display field is explicit. Empty strings deliberately hide content,
    // so defaults belong in application JSON rather than being inserted here.
    date: letter.date,
    recipient: letter.recipient,
    greeting: letter.greeting,
    opening: letter.opening,
    body: structuredClone(letter.body),
    closing: letter.closing,
    signOff: letter.signOff,
  }
}
