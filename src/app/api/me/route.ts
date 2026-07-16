import { NextResponse } from 'next/server'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// GET /api/me — current session info
export async function GET() {
  const student = await getCurrentStudent()
  if (student) {
    return NextResponse.json({ role: 'student', student })
  }
  const teacher = await getCurrentTeacher()
  if (teacher) {
    return NextResponse.json({ role: teacher.role, teacher })
  }
  return NextResponse.json({ role: null })
}
