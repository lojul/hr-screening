import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabase } from '@/lib/supabase'
import { expandWithSynonyms, normalizeToken } from '@/lib/normalize'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const skills = searchParams.get('skills')

    let query = supabase
      .from('candidates')
      .select(`
        *,
        cv_files (
          id,
          filename,
          file_type,
          upload_status,
          created_at
        ),
        candidate_details (
          id,
          skills,
          summary,
          experience,
          education
        )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch candidates' },
        { status: 500 }
      )
    }

    let filteredCandidates = data || []

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
