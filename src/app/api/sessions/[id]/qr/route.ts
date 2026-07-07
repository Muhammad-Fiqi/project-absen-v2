import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import { buildQrPayload } from '@/lib/security'
import type { QrPayload } from '@/lib/types'

export const runtime = 'nodejs'

// GET /api/sessions/[id]/qr — current rotating QR payload (teacher displays this)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getCurrentTeacher()
  // Also allow students to fetch (they don't need QR display, but harmless).
  // Actually only teacher should generate the display QR.
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const session = await db.session.findUnique({ where: { id }, include: { course: true } })
  if (!session) {
    return NextResponse.json({ error: 'Sesi tidak ditemukan' }, { status: 404 })
  }
  if (!session.qrSecret) {
    return NextResponse.json({ error: 'QR belum dikonfigurasi untuk sesi ini' }, { status: 400 })
  }
  const now = new Date()
  const payload = buildQrPayload(session.id, session.qrSecret, now)
  const qr: QrPayload = payload
  // Also compute next rotation time
  const nextRotation = (Math.floor(now.getTime() / 1000 / 20) + 1) * 20 * 1000
  return NextResponse.json({
    qr,
    sessionPin: session.sessionPin,
    course: { code: session.course.code, name: session.course.name },
    session: {
      id: session.id,
      sessionNumber: session.sessionNumber,
      title: session.title,
      room: session.room,
    },
    serverTime: now.toISOString(),
    nextRotationAt: new Date(nextRotation).toISOString(),
    rotationSeconds: 20,
  })
}
