import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { supabaseAdmin } from '@/lib/supabase'
import { CVParser } from '@/lib/cv-parser'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const candidateId: string | undefined = body?.candidateId

    // Fetch cv_files (optionally for one candidate)
    let cvQuery = supabaseAdmin.from('cv_files').select('*')
    if (candidateId) cvQuery = cvQuery.eq('candidate_id', candidateId)

    const { data: cvFiles, error: fetchError } = await cvQuery
    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch CV files' }, { status: 500 })
    }

    const results: any[] = []

    for (const cv of cvFiles || []) {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from('cv-files')
        .download(cv.file_path)

      if (downloadError || !fileData) {
        results.push({ cv_file_id: cv.id, status: 'failed', reason: 'download_failed' })
        continue
      }

      const arrayBuffer = await fileData.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      try {
        const parsed = await CVParser.parseBuffer(buffer, cv.file_type)

        // Update candidate basic fields
        const updates: any = {}
        if (parsed.name) updates.name = parsed.name
        if (parsed.email) updates.email = parsed.email
        if (parsed.phone) updates.phone = parsed.phone
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin.from('candidates').update(updates).eq('id', cv.candidate_id)
        }

        // Upsert candidate_details
        const { data: existingDetails } = await supabaseAdmin
          .from('candidate_details')
          .select('id')
          .eq('candidate_id', cv.candidate_id)
          .single()

        if (existingDetails?.id) {
          await supabaseAdmin
            .from('candidate_details')
            .update({
              education: parsed.education || null,
              experience: parsed.experience || null,
              skills: parsed.skills || null,
              languages: parsed.languages || null,
              certifications: parsed.certifications || null,
              summary: parsed.summary || null
            })
            .eq('id', existingDetails.id)
        } else {
          await supabaseAdmin
            .from('candidate_details')
            .insert({
              candidate_id: cv.candidate_id,
              education: parsed.education || null,
              experience: parsed.experience || null,
              skills: parsed.skills || null,
              languages: parsed.languages || null,
              certifications: parsed.certifications || null,
              summary: parsed.summary || null
            })
        }

        // Update cv_files status and parsed_data
        await supabaseAdmin
          .from('cv_files')
          .update({ upload_status: 'completed', parsed_data: parsed })
          .eq('id', cv.id)

        results.push({ cv_file_id: cv.id, status: 'ok' })
      } catch (e) {
        results.push({ cv_file_id: cv.id, status: 'failed', reason: 'parse_failed' })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Reprocess error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


