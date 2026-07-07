import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/extension-requests — student creates a request
export async function POST(req: NextRequest) {
  const student = await getCurrentStudent()
  if (!student) {
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
    const existing = await db.extensionRequest.findFirst({
      where: { studentId: student.id, status: 'pending' },
    })
    if (existing) {
      return NextResponse.json({ error: 'Anda sudah memiliki permintaan perpanjangan yang menunggu review' }, { status: 409 })
    }
    const fullStudent = await db.student.findUnique({ where: { id: student.id } })
    const request = await db.extensionRequest.create({
      data: {
        studentId: student.id,
        requestedSessions: Number(requestedSessions),
        reason: reason.trim(),
        status: 'pending',
      },
    })
    return NextResponse.json({
      success: true,
      request: {
        id: request.id,
        requestedSessions: request.requestedSessions,
        reason: request.reason,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
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
  const student = await getCurrentStudent()
  if (!teacher && !student) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // pending | approved | denied | all

  if (teacher) {
    const where = status && status !== 'all' ? { status } : {}
    const requests = await db.extensionRequest.findMany({
      where,
      include: { student: { select: { studentCode: true, name: true, sessionQuota: true, email: true, phone: true } }, reviewedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        studentId: r.studentId,
        studentCode: r.student.studentCode,
        studentName: r.student.name,
        studentEmail: r.student.email,
        studentPhone: r.student.phone,
        currentQuota: r.student.sessionQuota,
        requestedSessions: r.requestedSessions,
        reason: r.reason,
        status: r.status,
        reviewedBy: r.reviewedBy?.name || null,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        reviewNote: r.reviewNote,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  } else {
    // Student: list own requests
    const requests = await db.extensionRequest.findMany({
      where: { studentId: student!.id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        requestedSessions: r.requestedSessions,
        reason: r.reason,
        status: r.status,
        reviewedAt: r.reviewedAt?.toISOString() || null,
        reviewNote: r.reviewNote,
        createdAt: r.createdAt.toISOString(),
      })),
    })
  }
}
