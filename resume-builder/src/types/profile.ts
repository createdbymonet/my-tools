export interface ContactLink {
  id: string
  label: string
  /** Use an empty string to display the label without a link. */
  url: string
}

export interface PersonalInfo {
  name: string
  professionalTitle: string
  location: string
  email: string
  phone: string
  links: ContactLink[]
  workAuthorization: string
}

export interface Skill {
  id: string
  label: string
  items: string[]
}

export interface Experience {
  id: string
  role: string
  company: string
  location: string
  startDate: string
  endDate: string
  bullets: string[]
}

export interface Education {
  id: string
  qualification: string
  institution: string
  location: string
  startDate: string
  endDate: string
  details: string[]
}

export interface Certification {
  id: string
  name: string
  issuer: string
  date: string
  url: string
}

export interface Project {
  id: string
  name: string
  /** Live/demo site URL. Use an empty string when unavailable. */
  url: string
  /** Source-code repository URL. Use an empty string when unavailable. */
  repository: string
  description: string
}

export interface Language {
  id: string
  name: string
  proficiency: string
}

export const resumeSectionIds = [
  'summary',
  'experience',
  'skills',
  'projects',
  'education',
  'certifications',
  'languages',
] as const

export type ResumeSectionId = (typeof resumeSectionIds)[number]

export interface Profile {
  personalInfo: PersonalInfo
  summary: string
  skills: Skill[]
  experience: Experience[]
  education: Education[]
  certifications: Certification[]
  projects: Project[]
  languages: Language[]
  /** Listed sections appear first; omitted sections are appended in the default order. */
  sectionOrder: ResumeSectionId[]
}
