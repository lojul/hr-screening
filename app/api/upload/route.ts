import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'
import { getSupabaseAdmin } from '@/lib/supabase'
import { CVParser } from '@/lib/cv-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const candidateName = formData.get('candidateName') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF and Word documents are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Create candidate record first
    const supabaseAdmin = getSupabaseAdmin()
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .insert({
        name: candidateName || 'Unknown',
        status: 'new'
      })
      .select()
      .single()

    if (candidateError) {
      return NextResponse.json(
        { error: 'Failed to create candidate record' },
        { status: 500 }
      )
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop()
    const fileName = `${candidate.id}.${fileExt}`
    const filePath = `cv-files/${fileName}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('cv-files')
      .upload(filePath, file)

    if (uploadError) {
      // Clean up candidate record if file upload fails
      await supabaseAdmin.from('candidates').delete().eq('id', candidate.id)
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      )
    }

    // Create CV file record
    const { data: cvFile, error: cvFileError } = await supabaseAdmin
      .from('cv_files')
      .insert({
        candidate_id: candidate.id,
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        upload_status: 'processing'
      })
      .select()
      .single()

    if (cvFileError) {
      return NextResponse.json(
        { error: 'Failed to create CV file record' },
        { status: 500 }
      )
    }

    // Parse CV in the background
    try {
      const parsedData = await CVParser.parseFile(file)
      
      // Update candidate with parsed data
      const updates: any = {}
      if (parsedData.name) updates.name = parsedData.name
      if (parsedData.email) updates.email = parsedData.email
      if (parsedData.phone) updates.phone = parsedData.phone

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from('candidates')
          .update(updates)
          .eq('id', candidate.id)
      }

      // Create candidate details record
      await supabaseAdmin
        .from('candidate_details')
        .insert({
          candidate_id: candidate.id,
          education: parsedData.education || null,
          experience: parsedData.experience || null,
          skills: parsedData.skills || null,
          languages: parsedData.languages || null,
          certifications: parsedData.certifications || null,
          summary: parsedData.summary || null
        })

      // Update CV file status
      await supabaseAdmin
        .from('cv_files')
        .update({
          upload_status: 'completed',
          parsed_data: parsedData
        })
        .eq('id', cvFile.id)

    } catch (parseError) {
      console.error('CV parsing error:', parseError)
      
      // Update CV file status to failed
      await supabaseAdmin
        .from('cv_files')
        .update({ upload_status: 'failed' })
        .eq('id', cvFile.id)
    }

    return NextResponse.json({
      success: true,
      candidateId: candidate.id,
      message: 'File uploaded and processed successfully'
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
