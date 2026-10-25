import type { CompanyInfo } from './application.ts'
import type { PersonalInfo, Profile } from './profile.ts'

export type ResumeData = Profile

export interface CoverLetterDocument {
  personalInfo: PersonalInfo
  company: CompanyInfo
  date: string
  recipient: string
  greeting: string
  opening: string
  body: string[]
  closing: string
  signOff: string
}
