import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { session, attendance, quotaDailyUsage } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// POST /api/sessions/[id]/excused
// Teacher marks a student's absence as excused (izin)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: sessionId } = await params
  const body = await request.json()
  const { studentId, note } = body as { studentId: string; note?: string }

  if (!studentId) {
    return NextResponse.json({ error: 'studentId diperlukan' }, { status: 400 })
  }

  // Find the session
  const sessionRows = await db.select().from(session).where(eq(session.id, sessionId)).limit(1)
  const sessionRow = sessionRows[0]
  if (!sessionRow) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  const sessionDateKey = sessionRow.date.slice(0, 10)
  // An approved teacher excuse restores the day if quota catch-up already ran.
  await db
    .delete(quotaDailyUsage)
    .where(and(eq(quotaDailyUsage.studentId, studentId), eq(quotaDailyUsage.dateKey, sessionDateKey)))

  // Find existing attendance for this student in this session
  const existingRows = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.studentId, studentId)))
    .limit(1)
  const existing = existingRows[0]

  if (existing) {
    if (existing.status === 'present' || existing.status === 'late') {
      return NextResponse.json(
        { error: 'Siswa sudah hadir di sesi ini, tidak bisa diizinkan' },
        { status: 400 }
      )
    }
    if (existing.status === 'excused') {
      return NextResponse.json(
        { error: 'Siswa sudah diizinkan di sesi ini' },
        { status: 400 }
      )
    }

    const [updated] = await db
      .update(attendance)
      .set({
        status: 'excused',
        notes: `Izin: ${note || 'Tidak ada keterangan'}`,
      })
      .where(eq(attendance.id, existing.id))
      .returning()

    return NextResponse.json({
      id: updated.id,
      sessionId: updated.sessionId,
      studentId: updated.studentId,
      status: updated.status,
      notes: updated.notes,
      checkInTime: updated.checkInTime,
      verified: !!updated.verified,
    })
  } else {
    // Create new excused attendance
    const [created] = await db
      .insert(attendance)
      .values({
        id: newId('a'),
        sessionId,
        studentId,
        status: 'excused',
        dayKey: sessionDateKey,
        notes: `Izin: ${note || 'Tidak ada keterangan'}`,
        verified: 0, // excused does NOT consume quota
      })
      .returning()

    return NextResponse.json({
      id: created.id,
      sessionId: created.sessionId,
      studentId: created.studentId,
      status: created.status,
      notes: created.notes,
      checkInTime: created.checkInTime,
      verified: !!created.verified,
    }, { status: 201 })
  }
}
