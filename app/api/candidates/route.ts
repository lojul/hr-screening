import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getSupabaseAdmin } from '@/lib/supabase'
import { expandWithSynonyms, normalizeToken } from '@/lib/normalize'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const skills = searchParams.get('skills')

    console.log('Candidates API called with params:', { status, search, skills })
    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('candidates')
      .select(`
        *,
        cv_files (*),
        candidate_details (*)
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    let { data, error } = await query

    if (error) {
      console.error('Candidates query error (with relations):', error)
      // Fallback: fetch base candidates without relations so UI can still show rows
      const supabase = getSupabaseAdmin()
      const fallback = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallback.error) {
        console.error('Candidates fallback query error:', fallback.error)
        return NextResponse.json(
          { error: 'Failed to fetch candidates' },
          { status: 500 }
        )
      }
      data = fallback.data
    }

    // Ensure candidate_details exists using parsed_data fallback when missing
    let filteredCandidates = (data || []).map((c: any) => {
      const detailsArr = Array.isArray(c.candidate_details) ? c.candidate_details : []
      const hasDetails = detailsArr.length > 0
      if (hasDetails) return c

      // Fallback: synthesize details from latest cv_files.parsed_data
      type CvFileEntry = { created_at: string; parsed_data?: any }
      const files: CvFileEntry[] = Array.isArray(c.cv_files) ? (c.cv_files as CvFileEntry[]) : []
      const latest = files
        .filter((f: CvFileEntry) => Boolean(f))
        .sort((a: CvFileEntry, b: CvFileEntry) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      const parsed = latest?.parsed_data || null
      if (!parsed) return c

      const synthesized = {
        id: 'synthetic',
        candidate_id: c.id,
        education: parsed.education ?? null,
        experience: parsed.experience ?? null,
        skills: parsed.skills ?? null,
        soft_skills: parsed.soft_skills ?? null,
        languages: parsed.languages ?? null,
        certifications: parsed.certifications ?? null,
        summary: parsed.summary ?? null,
        created_at: c.created_at
      }
      return { ...c, candidate_details: [synthesized] }
    })

    // Compute match score across skills, summary, experience, education when `skills` filter is provided
    if (skills && skills.trim()) {
      const baseTerms = skills
        .toLowerCase()
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
      // Expand with synonyms and canonicalize
      const expanded = new Set<string>()
      for (const t of baseTerms) {
        expandWithSynonyms(t).forEach(s => expanded.add(normalizeToken(s)))
      }
      const terms = Array.from(expanded)

      const MAX_TERM_SCORE = 3 // skill exact/contains:3, text contains:1

      filteredCandidates = (filteredCandidates as any[])
        .map(candidate => {
          const details = candidate.candidate_details?.[0] || {}
          const skillsArr: string[] = Array.isArray(details.skills) ? details.skills : []
          const skillsLower = skillsArr.map((s: string) => s.toLowerCase())

          // Aggregate text corpus from summary, experience, education
          const textParts: string[] = []
          if (details.summary) textParts.push(String(details.summary))
          if (details.experience) textParts.push(JSON.stringify(details.experience))
          if (details.education) textParts.push(JSON.stringify(details.education))
          const corpus = textParts.join(' \n ').toLowerCase()

          let achieved = 0
          for (const term of terms) {
            let termScore = 0
            // Skills matching (higher weight)
            if (skillsLower.some((s: string) => s === term)) {
              termScore = Math.max(termScore, 3)
            } else if (skillsLower.some((s: string) => s.includes(term) || term.includes(s))) {
              termScore = Math.max(termScore, 2)
            }
            // Text corpus matching (lower weight)
            if (corpus && corpus.includes(term)) {
              termScore = Math.max(termScore, 1)
            }
            achieved += termScore
          }

          const maxPossible = terms.length * MAX_TERM_SCORE
          const match_score = maxPossible > 0 ? Math.round((achieved / maxPossible) * 100) : 0

          return { ...candidate, match_score }
        })
        // Filter out zero scores to keep results relevant
        .filter(c => c.match_score > 0)
        // Sort by score desc, then by created_at desc
        .sort((a, b) => {
          if (b.match_score !== a.match_score) return b.match_score - a.match_score
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })
    }

    console.log('Returning candidates:', filteredCandidates.length, 'candidates')
    return NextResponse.json({ candidates: filteredCandidates })

  } catch (error) {
    console.error('Fetch candidates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update candidate' },
        { status: 500 }
      )
    }

    return NextResponse.json({ candidate: data })

  } catch (error) {
    console.error('Update candidate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('candidates')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete candidate' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete candidate error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
