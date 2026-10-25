import type {
  Certification,
  Education,
  Experience,
  Language,
  PersonalInfo,
  Project,
  ResumeSectionId,
  Skill,
} from './profile.ts'

export interface CompanyInfo {
  name: string
  position: string
  location: string
  hiringManager: string
}

/** Patch existing entries by ID. New entries must be supplied in full through add. */
export interface CollectionOverride<T extends { id: string }> {
  updates?: (Pick<T, 'id'> & Partial<Omit<T, 'id'>>)[]
  add?: T[]
  remove?: string[]
  /** Move these IDs to the front, retaining the relative order of unlisted entries. */
  order?: string[]
}

export interface ResumeOverride {
  /** Only supplied fields change. A supplied links array replaces all links. */
  personalInfo?: Partial<PersonalInfo>
  summary?: string
  skills?: CollectionOverride<Skill>
  experience?: CollectionOverride<Experience>
  education?: CollectionOverride<Education>
  certifications?: CollectionOverride<Certification>
  projects?: CollectionOverride<Project>
  languages?: CollectionOverride<Language>
  sectionOrder?: ResumeSectionId[]
}

export interface CoverLetterData {
  /** Use YYYY-MM-DD, or an empty string to hide the date. */
  date: string
  recipient: string
  greeting: string
  opening: string
  body: string[]
  closing: string
  signOff: string
}

export interface Application {
  company: CompanyInfo
  resume: ResumeOverride
  coverLetter: CoverLetterData
}
