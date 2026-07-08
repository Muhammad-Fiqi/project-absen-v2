import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST() {
  const store = await cookies()
  store.delete('pte_student')
  store.delete('pte_teacher')
  return NextResponse.json({ success: true })
}
