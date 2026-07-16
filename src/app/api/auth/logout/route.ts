import { NextResponse } from 'next/server'
import { clearAuthCookies } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ success: true })
  return clearAuthCookies(res)
}