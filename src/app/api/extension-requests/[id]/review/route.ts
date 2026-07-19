import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { extensionRequest, student, quotaExtension } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// PATCH /api/extension-requests/[id]/review
// Body: { action: "approve" | "deny", note?: string, grantedSessions?: number }
// If approve: optionally override requestedSessions with grantedSessions
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { action, note, grantedSessions } = await req.json()
  if (!['approve', 'deny'].includes(action)) {
    return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 })
  }

  const requestRows = await db
    .select()
    .from(extensionRequest)
    .where(eq(extensionRequest.id, id))
    .limit(1)
  const request = requestRows[0]
  if (!request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Permintaan sudah direview' }, { status: 400 })
  }

  if (action === 'deny') {
    const [updated] = await db
      .update(extensionRequest)
      .set({
        status: 'denied',
        reviewedById: teacher.id,
        reviewedAt: new Date().toISOString(),
        reviewNote: note || null,
      })
      .where(eq(extensionRequest.id, id))
      .returning()
    return NextResponse.json({ success: true, request: { id: updated.id, status: updated.status } })
  }

  // Approve: extend quota + create audit log inside a transaction
  const studentRows = await db
    .select()
    .from(student)
    .where(eq(student.id, request.studentId))
    .limit(1)
  const studentRow = studentRows[0]
  if (!studentRow) {
    return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
  }

  const toAdd = typeof grantedSessions === 'number' && grantedSessions > 0 ? grantedSessions : request.requestedSessions
  const oldQuota = studentRow.sessionQuota
  const newQuota = oldQuota + toAdd

  await db.transaction(async (tx) => {
    await tx
      .update(student)
      .set({
        sessionQuota: newQuota,
        quotaExtendedAt: new Date().toISOString(),
        quotaNote: note || `Approved from extension request`,
      })
      .where(eq(student.id, request.studentId))

    await tx.insert(quotaExtension).values({
      id: newId('qe'),
      studentId: request.studentId,
      adminId: teacher.id,
      oldQuota,
      newQuota,
      addedSessions: toAdd,
      reason: `Extension request approved: ${request.reason}${note ? ` · ${note}` : ''}`,
    })

    await tx
      .update(extensionRequest)
      .set({
        status: 'approved',
        reviewedById: teacher.id,
        reviewedAt: new Date().toISOString(),
        reviewNote: note || null,
      })
      .where(eq(extensionRequest.id, id))
  })

  return NextResponse.json({
    success: true,
    student: { sessionQuota: newQuota },
    added: toAdd,
  })
}
