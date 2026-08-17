import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentLeaveRequest } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json().catch(() => ({})) as { action?: 'approve' | 'reject'; reviewNote?: string }
  const action = body.action
  if (!['approve', 'reject'].includes(action || '')) {
    return NextResponse.json({ error: 'Aksi review tidak valid' }, { status: 400 })
  }

  const rows = await db
    .select()
    .from(studentLeaveRequest)
    .where(and(eq(studentLeaveRequest.id, id), eq(studentLeaveRequest.status, 'pending')))
    .limit(1)
  const request = rows[0]
  if (!request) {
    return NextResponse.json({ error: 'Pengajuan cuti tidak ditemukan atau sudah diproses' }, { status: 404 })
  }

  const [updated] = await db
    .update(studentLeaveRequest)
    .set({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedById: teacher.id,
      reviewedAt: new Date().toISOString(),
      reviewNote: body.reviewNote || null,
    })
    .where(eq(studentLeaveRequest.id, id))
    .returning()

  return NextResponse.json({
    success: true,
    request: {
      id: updated.id,
      status: updated.status,
      reviewedById: updated.reviewedById,
      reviewedAt: updated.reviewedAt,
      reviewNote: updated.reviewNote,
    },
  })
}
