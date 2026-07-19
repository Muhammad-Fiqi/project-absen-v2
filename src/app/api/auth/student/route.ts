import { NextRequest, NextResponse } from 'next/server'
import { count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, course, attendance } from '@/db/schema'
import { applyStudentCookie } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/auth/student — student login with studentCode + password
export async function POST(req: NextRequest) {
  try {
    const { studentCode, password } = await req.json()
    if (!studentCode || !password) {
      return NextResponse.json({ error: 'Kode siswa dan password wajib diisi' }, { status: 400 })
    }

    const rows = await db
      .select()
      .from(student)
      .where(eq(student.studentCode, studentCode.trim().toUpperCase()))
      .limit(1)
    const studentRow = rows[0]
    if (!studentRow) {
      return NextResponse.json({ error: 'Kode siswa tidak ditemukan' }, { status: 404 })
    }
    if (password !== studentRow.pinHash) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    // Look up course name if available
    let courseName: string | null = null
    if (studentRow.courseId) {
      const courseRows = await db
        .select({ name: course.name })
        .from(course)
        .where(eq(course.id, studentRow.courseId))
        .limit(1)
      courseName = courseRows[0]?.name ?? null
    }

    // Compute usage for StudentInfo
    const [usedRow] = await db
      .select({ n: count() })
      .from(attendance)
      .where(eq(attendance.studentId, studentRow.id))
    const sessionsUsed = Number(usedRow?.n ?? 0)
    const sessionsRemaining = Math.max(0, studentRow.sessionQuota - sessionsUsed)

    const studentInfo = {
      id: studentRow.id,
      studentCode: studentRow.studentCode,
      name: studentRow.name,
      email: studentRow.email,
      phone: studentRow.phone,
      courseCode: studentRow.courseCode,
      courseId: studentRow.courseId,
      sessionQuota: studentRow.sessionQuota,
      sessionsUsed,
      sessionsRemaining,
      quotaExhausted: sessionsRemaining <= 0,
      quotaExtendedAt: studentRow.quotaExtendedAt,
    }

    const res = NextResponse.json({
      success: true,
      student: {
        id: studentRow.id,
        studentCode: studentRow.studentCode,
        name: studentRow.name,
        courseCode: studentRow.courseCode,
        courseName,
      },
    })

    return applyStudentCookie(res, studentInfo)
  } catch (e) {
    console.error('student login error', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true })
}
