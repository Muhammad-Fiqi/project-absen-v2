import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPin } from '@/lib/security'
import { setStudentSession } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/auth/student — student login with studentCode + PIN
export async function POST(req: NextRequest) {
  try {
    const { studentCode, pin } = await req.json()
    if (!studentCode || !pin) {
      return NextResponse.json({ error: 'Kode siswa dan PIN wajib diisi' }, { status: 400 })
    }
    const student = await db.student.findUnique({
      where: { studentCode: studentCode.trim().toUpperCase() },
      include: { course: true },
    })
    if (!student) {
      return NextResponse.json({ error: 'Kode siswa tidak ditemukan' }, { status: 404 })
    }
    if (!student.pinHash || !verifyPin(pin, student.pinHash)) {
      return NextResponse.json({ error: 'PIN salah' }, { status: 401 })
    }
    await setStudentSession({
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      email: student.email,
      phone: student.phone,
      courseCode: student.courseCode,
      courseId: student.courseId,
    })
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        studentCode: student.studentCode,
        name: student.name,
        courseCode: student.courseCode,
        courseName: student.course?.name,
      },
    })
  } catch (e) {
    console.error('student login error', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

export async function DELETE() {
  const store = await import('next/headers').then((m) => m.cookies())
  store.delete('pte_student')
  return NextResponse.json({ success: true })
}
