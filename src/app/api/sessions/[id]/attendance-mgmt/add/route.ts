import { NextRequest, NextResponse } from 'next/server'
import { and, eq, count } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendance, session, student } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// POST /api/sessions/[id]/attendance-mgmt/add — Manually add attendance for a student (admin/teacher override)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id: sessionId } = await params
    const body = await req.json()
    const { studentId, studentCode, status: attendanceStatus, notes } = body

    if (!studentId && !studentCode) {
      return NextResponse.json({ error: 'Student ID atau kode siswa wajib diisi' }, { status: 400 })
    }

    // Find student by ID or studentCode
    let studentIdFinal = studentId
    if (!studentIdFinal && studentCode) {
      const stuRows = await db.select({ id: student.id }).from(student).where(eq(student.studentCode, studentCode.trim().toUpperCase())).limit(1)
      if (stuRows.length === 0) {
        return NextResponse.json({ error: `Siswa dengan kode ${studentCode} tidak ditemukan` }, { status: 404 })
      }
      studentIdFinal = stuRows[0].id
    }

    // Verify session exists
    const sessionRows = await db.select().from(session).where(eq(session.id, sessionId)).limit(1)
    if (sessionRows.length === 0) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
    }
    const sessionRow = sessionRows[0]

    // Verify student exists
    const stuRows2 = await db.select().from(student).where(eq(student.id, studentIdFinal)).limit(1)
    if (stuRows2.length === 0) {
      return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    }
    const studentRow = stuRows2[0]

    // Check if already registered in this session
    const existingAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.sessionId, sessionId),
          eq(attendance.studentId, studentIdFinal)
        )
      )
      .limit(1)

    if (existingAttendance.length > 0) {
      return NextResponse.json({ error: 'Siswa sudah terdaftar di sesi ini' }, { status: 409 })
    }

    // Check capacity
    const [capRow] = await db
      .select({ n: count() })
      .from(attendance)
      .where(and(eq(attendance.sessionId, sessionId), eq(attendance.verified, 1)))
    const currentCount = Number(capRow?.n ?? 0)

    if (currentCount >= sessionRow.maxAttendees) {
      return NextResponse.json({ error: `Kapasitas sesi penuh (${currentCount}/${sessionRow.maxAttendees})` }, { status: 403 })
    }

    const now = new Date()
    const dayKey = now.toISOString().split('T')[0] // YYYY-MM-DD

    const validStatuses = ['present', 'late', 'absent', 'excused']
    const finalStatus = validStatuses.includes(attendanceStatus) ? attendanceStatus : 'present'

    await db.insert(attendance).values({
      id: newId('at'),
      sessionId,
      studentId: studentIdFinal,
      status: finalStatus,
      checkInTime: now.toISOString(),
      dayKey,
      qrVerified: 0,
      verified: 1,
      notes: notes || `Ditambahkan manual oleh ${teacher.name}`,
    })

    return NextResponse.json({
      success: true,
      message: `${studentRow.name} berhasil ditambahkan ke sesi sebagai ${finalStatus}`,
      student: { id: studentRow.id, name: studentRow.name, studentCode: studentRow.studentCode },
    })
  } catch (error) {
    console.error('Error adding manual attendance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

