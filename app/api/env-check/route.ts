import { NextRequest, NextResponse } from 'next/server'
export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  const refMatch = supabaseUrl.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i)
  const projectRef = refMatch?.[1] || null

  const mask = (s: string) => (s ? `${s.slice(0, 6)}...${s.slice(-6)}` : null)

  return NextResponse.json({
    supabaseUrl,
    projectRef,
    anonKeyMasked: mask(anon),
    serviceRoleKeyMasked: mask(service),
    env: process.env.VERCEL ? 'vercel' : 'local'
  })
}


