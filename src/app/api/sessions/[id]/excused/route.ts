import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'

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
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { course: true },
  })
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }

  // Find existing attendance for this student in this session
  const existing = await db.attendance.findUnique({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId,
      },
    },
  })

  if (existing) {
    // Update existing attendance to excused
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

    const updated = await db.attendance.update({
      where: { id: existing.id },
      data: {
        status: 'excused',
        notes: `Izin: ${note || 'Tidak ada keterangan'}`,
      },
    })

    return NextResponse.json({
      id: updated.id,
      sessionId: updated.sessionId,
      studentId: updated.studentId,
      status: updated.status,
      notes: updated.notes,
      checkInTime: updated.checkInTime,
      verified: updated.verified,
    })
  } else {
    // Create new excused attendance
    // Compute dayKey from session date
    const d = session.date
    const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const created = await db.attendance.create({
      data: {
        sessionId,
        studentId,
        status: 'excused',
        method: 'button',
        dayKey: dk,
        notes: `Izin: ${note || 'Tidak ada keterangan'}`,
        verified: false, // excused does NOT consume quota
      },
    })

    return NextResponse.json({
      id: created.id,
      sessionId: created.sessionId,
      studentId: created.studentId,
      status: created.status,
      notes: created.notes,
      checkInTime: created.checkInTime,
      verified: created.verified,
    }, { status: 201 })
  }
}