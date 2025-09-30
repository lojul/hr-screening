import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { candidateId } = await request.json()
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: files, error } = await supabase
      .from('cv_files')
      .select('file_path, filename, created_at')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch CV file' }, { status: 500 })
    }

    const latest = files?.[0]
    if (!latest?.file_path) {
      return NextResponse.json({ error: 'No CV file found' }, { status: 404 })
    }

    const { data: signed, error: signedErr } = await supabase
      .storage
      .from('cv-files')
      .createSignedUrl(latest.file_path, 60)

    if (signedErr || !signed?.signedUrl) {
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl, filename: latest.filename })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


