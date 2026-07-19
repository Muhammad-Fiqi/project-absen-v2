import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, quotaExtension } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

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

  const studentRows = await db.select().from(student).where(eq(student.id, id)).limit(1)
  const studentRow = studentRows[0]
  if (!studentRow) {
    return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
  }

  let newQuota: number
  if (typeof setQuota === 'number' && setQuota > 0) {
    newQuota = Math.max(0, Math.min(100, Math.floor(setQuota)))
  } else if (typeof addedSessions === 'number' && addedSessions > 0) {
    newQuota = studentRow.sessionQuota + Math.floor(addedSessions)
  } else {
    return NextResponse.json({ error: 'Berikan addedSessions atau setQuota' }, { status: 400 })
  }
  if (newQuota <= studentRow.sessionQuota) {
    return NextResponse.json({ error: 'Kuota baru harus lebih besar dari kuota saat ini' }, { status: 400 })
  }
  const added = newQuota - studentRow.sessionQuota

  // Update student + create extension audit log in a transaction
  const [updated] = await db.transaction(async (tx) => {
    const [updatedStudent] = await tx
      .update(student)
      .set({
        sessionQuota: newQuota,
        quotaExtendedAt: new Date().toISOString(),
        quotaNote: reason || studentRow.quotaNote,
      })
      .where(eq(student.id, id))
      .returning()

    await tx.insert(quotaExtension).values({
      id: newId('qe'),
      studentId: id,
      adminId: teacher.id,
      oldQuota: studentRow.sessionQuota,
      newQuota,
      addedSessions: added,
      reason: reason || `Perpanjangan +${added} sesi`,
    })

    return [updatedStudent]
  })

  return NextResponse.json({
    success: true,
    student: {
      id: updated.id,
      sessionQuota: updated.sessionQuota,
      quotaExtendedAt: updated.quotaExtendedAt,
    },
    added,
  })
}
