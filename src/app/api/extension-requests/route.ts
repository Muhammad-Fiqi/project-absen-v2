import { NextRequest, NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { extensionRequest, student, adminUser } from '@/db/schema'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'

export const runtime = 'nodejs'

// POST /api/extension-requests — student creates a request
export async function POST(req: NextRequest) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { requestedSessions, reason } = await req.json()
    if (!requestedSessions || requestedSessions < 1 || requestedSessions > 50) {
      return NextResponse.json({ error: 'Jumlah sesi harus 1–50' }, { status: 400 })
    }
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json({ error: 'Alasan minimal 5 karakter' }, { status: 400 })
    }
    // Check if student already has a pending request
    const existingRows = await db
      .select({ id: extensionRequest.id })
      .from(extensionRequest)
      .where(
        and(
          eq(extensionRequest.studentId, studentSess.id),
          eq(extensionRequest.status, 'pending')
        )
      )
      .limit(1)
    if (existingRows[0]) {
      return NextResponse.json({ error: 'Anda sudah memiliki permintaan perpanjangan yang menunggu review' }, { status: 409 })
    }

    const fullStudentRows = await db
      .select({ sessionQuota: student.sessionQuota })
      .from(student)
      .where(eq(student.id, studentSess.id))
      .limit(1)
    const fullStudent = fullStudentRows[0]

    const [created] = await db
      .insert(extensionRequest)
      .values({
        id: newId('er'),
        studentId: studentSess.id,
        requestedSessions: Number(requestedSessions),
        reason: reason.trim(),
        status: 'pending',
      })
      .returning()

    return NextResponse.json({
      success: true,
      request: {
        id: created.id,
        requestedSessions: created.requestedSessions,
        reason: created.reason,
        status: created.status,
        createdAt: created.createdAt,
        currentQuota: fullStudent?.sessionQuota ?? 0,
      },
    })
  } catch (e) {
    console.error('create extension request error', e)
    return NextResponse.json({ error: 'Gagal membuat permintaan' }, { status: 500 })
  }
}

// GET /api/extension-requests — teacher lists all requests; student lists own
export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  const studentSess = await getCurrentStudent()
  if (!teacher && !studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // pending | approved | denied | all

  if (teacher) {
    const where = status && status !== 'all' ? eq(extensionRequest.status, status) : undefined
    const requests = await db
      .select()
      .from(extensionRequest)
      .where(where)
      .orderBy(extensionRequest.createdAt)

    // Eager-load student + reviewedBy names in JS
    const studentIds = Array.from(new Set(requests.map((r) => r.studentId)))
    const reviewerIds = Array.from(new Set(requests.filter((r) => r.reviewedById).map((r) => r.reviewedById!)))

    const students = studentIds.length
      ? await db.select().from(student)
      : []
    const studentMap = new Map(students.map((s) => [s.id, s]))

    const reviewers = reviewerIds.length
      ? await db.select({ id: adminUser.id, name: adminUser.name }).from(adminUser)
      : []
    const reviewerMap = new Map(reviewers.map((r) => [r.id, r.name]))

    return NextResponse.json({
      requests: requests.map((r) => {
        const s = studentMap.get(r.studentId)
        return {
          id: r.id,
          studentId: r.studentId,
          studentCode: s?.studentCode ?? '',
          studentName: s?.name ?? '',
          studentEmail: s?.email ?? null,
          studentPhone: s?.phone ?? null,
          currentQuota: s?.sessionQuota ?? 0,
          requestedSessions: r.requestedSessions,
          reason: r.reason,
          status: r.status,
          reviewedBy: r.reviewedById ? reviewerMap.get(r.reviewedById) ?? null : null,
          reviewedAt: r.reviewedAt,
          reviewNote: r.reviewNote,
          createdAt: r.createdAt,
        }
      }),
    })
  } else {
    // Student: list own requests
    const requests = await db
      .select()
      .from(extensionRequest)
      .where(eq(extensionRequest.studentId, studentSess!.id))
      .orderBy(extensionRequest.createdAt)
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        requestedSessions: r.requestedSessions,
        reason: r.reason,
        status: r.status,
        reviewedAt: r.reviewedAt,
        reviewNote: r.reviewNote,
        createdAt: r.createdAt,
      })),
    })
  }
}
