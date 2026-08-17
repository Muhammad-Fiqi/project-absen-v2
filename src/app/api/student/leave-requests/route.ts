import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { studentLeaveRequest, student, adminUser } from '@/db/schema'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'
import { dayKey, validateLeaveInput } from '@/lib/quota'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  const studentSess = await getCurrentStudent()
  if (!teacher && !studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const activeOnly = searchParams.get('active') === 'true'
  const todayKey = dayKey(new Date())

  if (teacher) {
    const rows = await db
      .select()
      .from(studentLeaveRequest)
      .where(status && status !== 'all' ? eq(studentLeaveRequest.status, status) : undefined)
      .orderBy(studentLeaveRequest.createdAt)

    const studentIds = Array.from(new Set(rows.map((r) => r.studentId)))
    const students = studentIds.length ? await db.select().from(student) : []
    const studentMap = new Map(students.map((s) => [s.id, s]))
    const reviewerIds = Array.from(new Set(rows.filter((r) => r.reviewedById).map((r) => r.reviewedById!)))
    const reviewers = reviewerIds.length ? await db.select({ id: adminUser.id, name: adminUser.name }).from(adminUser) : []
    const reviewerMap = new Map(reviewers.map((r) => [r.id, r.name]))

    const mapped = rows.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: studentMap.get(r.studentId)?.name ?? '',
      studentCode: studentMap.get(r.studentId)?.studentCode ?? '',
      reason: r.reason,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      reviewedById: r.reviewedById,
      reviewedBy: r.reviewedById ? reviewerMap.get(r.reviewedById) ?? null : null,
      reviewedAt: r.reviewedAt,
      reviewNote: r.reviewNote,
      createdAt: r.createdAt,
      // Only for approved leaves that are currently ongoing: days left until the student returns.
      daysRemaining:
        r.status === 'approved' && r.startDate <= todayKey && r.endDate >= todayKey
          ? Math.max(1, Math.round((new Date(r.endDate + 'T00:00:00').getTime() - new Date(todayKey + 'T00:00:00').getTime()) / 86400000) + 1)
          : null,
    }))

    return NextResponse.json({
      requests: activeOnly ? mapped.filter((r) => r.daysRemaining !== null) : mapped,
    })
  }

  const rows = await db
    .select()
    .from(studentLeaveRequest)
    .where(eq(studentLeaveRequest.studentId, studentSess!.id))
    .orderBy(studentLeaveRequest.createdAt)

  return NextResponse.json({ requests: rows.map((r) => ({
    id: r.id,
    reason: r.reason,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    reviewedById: r.reviewedById,
    reviewedAt: r.reviewedAt,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt,
  })) })
}

export async function POST(req: NextRequest) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { reason?: string; startDate?: string; endDate?: string }

  const validation = validateLeaveInput(body)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  const reason = validation.reason!
  const startDate = validation.startDate!
  const endDate = validation.endDate!

  const existingRows = await db
    .select({ id: studentLeaveRequest.id })
    .from(studentLeaveRequest)
    .where(and(eq(studentLeaveRequest.studentId, studentSess.id), eq(studentLeaveRequest.status, 'pending')))
    .limit(1)
  if (existingRows[0]) {
    return NextResponse.json({ error: 'Anda sudah memiliki pengajuan cuti yang menunggu persetujuan' }, { status: 409 })
  }

  const [created] = await db
    .insert(studentLeaveRequest)
    .values({
      id: newId('sl'),
      studentId: studentSess.id,
      reason,
      startDate,
      endDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
    .returning()

  return NextResponse.json({
    success: true,
    request: {
      id: created.id,
      reason: created.reason,
      startDate: created.startDate,
      endDate: created.endDate,
      status: created.status,
      createdAt: created.createdAt,
    },
  }, { status: 201 })
}
