import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { normalizeSkillList, expandWithSynonyms, normalizeToken } from './normalize'

export interface ParsedCVData {
  name?: string
  email?: string
  phone?: string
  summary?: string
  education?: Array<{
    institution: string
    degree: string
    field: string
    startDate?: string
    endDate?: string
  }>
  experience?: Array<{
    company: string
    position: string
    description?: string
    startDate?: string
    endDate?: string
    current?: boolean
  }>
  skills?: string[]
  languages?: string[]
  certifications?: string[]
}

export class CVParser {
  static async parseFile(file: File): Promise<ParsedCVData> {
    const fileType = file.type
    let text = ''

    if (fileType === 'application/pdf') {
      text = await this.parsePDF(file)
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'application/msword') {
      text = await this.parseWord(file)
    } else {
      throw new Error('Unsupported file type')
    }

    return this.extractData(text)
  }

  // Server-side utility to parse from a Buffer
  static async parseBuffer(buffer: Buffer, mimeType: string): Promise<ParsedCVData> {
    let text = ''
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer)
      text = data.text
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else {
      throw new Error('Unsupported file type')
    }

    return this.extractData(text)
  }

  private static async parsePDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const data = await pdfParse(buffer)
    return data.text
  }

  private static async parseWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  private static extractData(text: string): ParsedCVData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    const parsed = {
      name: this.extractName(lines),
      email: this.extractEmail(text),
      phone: this.extractPhone(text),
      summary: this.extractSummary(lines),
      education: this.extractEducation(lines),
      experience: this.extractExperience(lines),
      skills: this.extractSkills(lines),
      languages: this.extractLanguages(lines),
      certifications: this.extractCertifications(lines)
    }

    // Normalize skills with synonyms mapping
    if (parsed.skills && parsed.skills.length > 0) {
      parsed.skills = normalizeSkillList(parsed.skills)
    }

    // Infer additional skills from full text using synonyms and frequency
    const inferred = this.inferSkillsFromText(text, parsed.skills || [])
    if (inferred.length > 0) {
      const set = new Set([...(parsed.skills || []), ...inferred])
      parsed.skills = Array.from(set)
    }

    return parsed
  }

  private static extractName(lines: string[]): string | undefined {
    // Look for the first line that looks like a name (2-3 words, title case)
    for (const line of lines.slice(0, 5)) {
      if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+( [A-Z][a-z]+)?$/)) {
        return line
      }
    }
    return undefined
  }

  private static extractEmail(text: string): string | undefined {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
    const match = text.match(emailRegex)
    return match ? match[0] : undefined
  }

  private static extractPhone(text: string): string | undefined {
    const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/
    const match = text.match(phoneRegex)
    return match ? match[0] : undefined
  }

  private static extractSummary(lines: string[]): string | undefined {
    const summaryKeywords = ['summary', 'profile', 'objective', 'about']
    let summaryStart = -1
    
    for (let i = 0; i < lines.length; i++) {
      if (summaryKeywords.some(keyword => lines[i].toLowerCase().includes(keyword))) {
        summaryStart = i
        break
      }
    }
    
    if (summaryStart !== -1) {
      const summaryLines = []
      for (let i = summaryStart + 1; i < Math.min(summaryStart + 5, lines.length); i++) {
        if (lines[i].length > 20) {
          summaryLines.push(lines[i])
        } else {
          break
        }
      }
      return summaryLines.join(' ')
    }
    
    return undefined
  }

  private static extractEducation(lines: string[]): Array<any> {
    const education = []
    const educationKeywords = ['education', 'academic', 'university', 'college', 'degree']
    let inEducationSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      if (educationKeywords.some(keyword => line.includes(keyword))) {
        inEducationSection = true
        continue
      }
      
      if (inEducationSection) {
        if (line.includes('experience') || line.includes('work') || line.includes('skills')) {
          break
        }
        
        // Look for degree patterns
        if (line.match(/(bachelor|master|phd|doctorate|associate|diploma|certificate)/i)) {
          const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
          education.push({
            degree: lines[i],
            institution: nextLine,
            field: '',
            startDate: '',
            endDate: ''
          })
        }
      }
    }
    
    return education
  }

  private static extractExperience(lines: string[]): Array<any> {
    const experience = []
    const experienceKeywords = ['experience', 'work', 'employment', 'career']
    let inExperienceSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      if (experienceKeywords.some(keyword => line.includes(keyword))) {
        inExperienceSection = true
        continue
      }
      
      if (inExperienceSection) {
        if (line.includes('education') || line.includes('skills') || line.includes('certification')) {
          break
        }
        
        // Look for job title patterns
        if (line.match(/(manager|director|engineer|developer|analyst|coordinator|specialist|assistant)/i)) {
          const nextLine = i + 1 < lines.length ? lines[i + 1] : ''
          experience.push({
            position: lines[i],
            company: nextLine,
            description: '',
            startDate: '',
            endDate: '',
            current: false
          })
        }
      }
    }
    
    return experience
  }

  private static extractSkills(lines: string[]): string[] {
    const skills = []
    const skillsKeywords = ['skills', 'technical', 'technologies', 'tools']
    let inSkillsSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      if (skillsKeywords.some(keyword => line.includes(keyword))) {
        inSkillsSection = true
        continue
      }
      
      if (inSkillsSection) {
        if (line.includes('experience') || line.includes('education') || line.includes('certification')) {
          break
        }
        
        // Look for skill patterns (comma-separated or bullet points)
        if (line.includes(',') || line.includes('•') || line.includes('-')) {
          const skillList = line.split(/[,•-]/).map(skill => skill.trim()).filter(skill => skill.length > 0)
          skills.push(...skillList)
        } else if (line.length > 2 && line.length < 50) {
          skills.push(line)
        }
      }
    }
    
    return [...new Set(skills)] // Remove duplicates
  }

  // Infer skills by scanning the entire text for known tokens and synonyms
  private static inferSkillsFromText(text: string, existing: string[]): string[] {
    const corpus = text.toLowerCase()
    const existingSet = new Set(existing.map(s => normalizeToken(s)))

    // Build a candidate token list from existing skills plus common tech/product tokens
    const seedTokens = [
      'peoplesoft', 'oracle', 'workday', 'sap', 'hcm', 'hrms',
      'javascript', 'typescript', 'react', 'node.js', 'java', 'spring',
      'aws', 'azure', 'gcp', 'postgresql', 'mongodb', 'airflow'
    ]

    const discovered = new Map<string, number>()
    for (const seed of seedTokens) {
      const variants = expandWithSynonyms(seed)
      let count = 0
      for (const v of variants) {
        const re = new RegExp(`\\b${v.replace(/[-./\\]/g, r => `\\${r}`)}\\b`, 'gi')
        const matches = corpus.match(re)
        if (matches) count += matches.length
      }
      const canonical = normalizeToken(seed)
      if (count > 0 && !existingSet.has(canonical)) {
        discovered.set(canonical, count)
      }
    }

    // Threshold: at least 2 occurrences or appears once alongside related vendor terms
    const inferred: string[] = []
    for (const [token, count] of discovered.entries()) {
      if (count >= 2) inferred.push(token)
    }

    return inferred
  }

  private static extractLanguages(lines: string[]): string[] {
    const languages = []
    const languageKeywords = ['languages', 'language']
    let inLanguageSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      if (languageKeywords.some(keyword => line.includes(keyword))) {
        inLanguageSection = true
        continue
      }
      
      if (inLanguageSection) {
        if (line.includes('skills') || line.includes('experience') || line.includes('education')) {
          break
        }
        
        if (line.includes(',') || line.includes('•') || line.includes('-')) {
          const langList = line.split(/[,•-]/).map(lang => lang.trim()).filter(lang => lang.length > 0)
          languages.push(...langList)
        }
      }
    }
    
    return [...new Set(languages)]
  }

  private static extractCertifications(lines: string[]): string[] {
    const certifications = []
    const certKeywords = ['certification', 'certificate', 'certified', 'license']
    let inCertSection = false
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()
      
      if (certKeywords.some(keyword => line.includes(keyword))) {
        inCertSection = true
        continue
      }
      
      if (inCertSection) {
        if (line.includes('skills') || line.includes('experience') || line.includes('education')) {
          break
        }
        
        if (line.length > 5 && line.length < 100) {
          certifications.push(lines[i])
        }
      }
    }
    
    return [...new Set(certifications)]
  }
}
