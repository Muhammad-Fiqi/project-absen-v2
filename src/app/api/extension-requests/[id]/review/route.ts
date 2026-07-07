import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'

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

  const request = await db.extensionRequest.findUnique({
    where: { id },
    include: { student: true },
  })
  if (!request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return NextResponse.json({ error: 'Permintaan sudah direview' }, { status: 400 })
  }

  if (action === 'deny') {
    const updated = await db.extensionRequest.update({
      where: { id },
      data: {
        status: 'denied',
        reviewedById: teacher.id,
        reviewedAt: new Date(),
        reviewNote: note || null,
      },
    })
    return NextResponse.json({ success: true, request: { id: updated.id, status: updated.status } })
  }

  // Approve: extend quota + create audit log
  const toAdd = typeof grantedSessions === 'number' && grantedSessions > 0 ? grantedSessions : request.requestedSessions
  const oldQuota = request.student.sessionQuota
  const newQuota = oldQuota + toAdd

  await db.$transaction([
    db.student.update({
      where: { id: request.studentId },
      data: {
        sessionQuota: newQuota,
        quotaExtendedAt: new Date(),
        quotaNote: note || `Approved from extension request`,
      },
    }),
    db.quotaExtension.create({
      data: {
        studentId: request.studentId,
        adminId: teacher.id,
        oldQuota,
        newQuota,
        addedSessions: toAdd,
        reason: `Extension request approved: ${request.reason}${note ? ` · ${note}` : ''}`,
      },
    }),
    db.extensionRequest.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedById: teacher.id,
        reviewedAt: new Date(),
        reviewNote: note || null,
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    student: { sessionQuota: newQuota },
    added: toAdd,
  })
}
