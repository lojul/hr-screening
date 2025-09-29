export type SynonymMap = Record<string, string[]>

// Canonical -> variants
const SYNONYMS: SynonymMap = {
  'peoplesoft': ['people soft', 'oracle peoplesoft', 'psft', 'people-soft'],
  'javascript': ['js', 'java script'],
  'node.js': ['nodejs', 'node js', 'node'],
  'react': ['reactjs', 'react.js'],
  'aws': ['amazon web services'],
  'azure': ['microsoft azure'],
  'postgresql': ['postgres', 'postgre sql'],
}

const CANONICALS = Object.keys(SYNONYMS)

export function normalizeToken(raw: string): string {
  const s = raw.toLowerCase().trim()
  // direct canonical match
  if (CANONICALS.includes(s)) return s
  // variant to canonical
  for (const canonical of CANONICALS) {
    const variants = SYNONYMS[canonical]
    if (variants.some(v => v === s)) return canonical
  }
  // loose contains mapping (e.g., text contains "oracle peoplesoft")
  for (const canonical of CANONICALS) {
    if (s.includes(canonical)) return canonical
    if (SYNONYMS[canonical].some(v => s.includes(v))) return canonical
  }
  return s
}

export function expandWithSynonyms(term: string): string[] {
  const t = term.toLowerCase().trim()
  const canonical = normalizeToken(t)
  const set = new Set<string>([canonical, t])
  const variants = SYNONYMS[canonical]
  if (variants) variants.forEach(v => set.add(v))
  return Array.from(set)
}

export function normalizeSkillList(skills: string[]): string[] {
  const out = skills
    .map(s => normalizeToken(s))
    .map(s => s.trim())
    .filter(Boolean)
  return Array.from(new Set(out))
}


