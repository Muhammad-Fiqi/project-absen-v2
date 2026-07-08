import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/students/[id]/extend
// Body: { addedSessions: number, reason?: string, setQuota?: number }
//   - addedSessions: increase quota by N (e.g. +10)
//   - setQuota: optional explicit new total (overrides addedSessions)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const { addedSessions, reason, setQuota } = body

  const student = await db.student.findUnique({ where: { id } })
  if (!student) {
    return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
  }

  let newQuota: number
  if (typeof setQuota === 'number' && setQuota > 0) {
    newQuota = Math.max(0, Math.min(100, Math.floor(setQuota)))
  } else if (typeof addedSessions === 'number' && addedSessions > 0) {
    newQuota = student.sessionQuota + Math.floor(addedSessions)
  } else {
    return NextResponse.json({ error: 'Berikan addedSessions atau setQuota' }, { status: 400 })
  }
  if (newQuota <= student.sessionQuota) {
    return NextResponse.json({ error: 'Kuota baru harus lebih besar dari kuota saat ini' }, { status: 400 })
  }
  const added = newQuota - student.sessionQuota

  // Update student + create extension audit log in a transaction
  const [updated] = await db.$transaction([
    db.student.update({
      where: { id },
      data: {
        sessionQuota: newQuota,
        quotaExtendedAt: new Date(),
        quotaNote: reason || student.quotaNote,
      },
    }),
    db.quotaExtension.create({
      data: {
        studentId: id,
        adminId: teacher.id,
        oldQuota: student.sessionQuota,
        newQuota,
        addedSessions: added,
        reason: reason || `Perpanjangan +${added} sesi`,
      },
    }),
  ])
  return NextResponse.json({
    success: true,
    student: {
      id: updated.id,
      sessionQuota: updated.sessionQuota,
      quotaExtendedAt: updated.quotaExtendedAt?.toISOString(),
    },
    added,
  })
}
