import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentTeacher } from '@/lib/auth'
import type { StudentManageRow } from '@/lib/types'

export const runtime = 'nodejs'

// GET /api/students — list all students with quota usage + extensions
export async function GET() {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const students = await db.student.findMany({
    orderBy: { studentCode: 'asc' },
    include: {
      course: true,
      quotaExtensions: { orderBy: { createdAt: 'desc' }, include: { admin: true } },
    },
  })
  // Gather attendance aggregates per student
  const attendances = await db.attendance.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, verified: true },
    select: { studentId: true, checkInTime: true, dayKey: true, flagged: true },
  })
  const rows: StudentManageRow[] = students.map((s) => {
    const atts = attendances.filter((a) => a.studentId === s.id)
    const used = atts.length
    const remaining = Math.max(0, s.sessionQuota - used)
    const uniqueDays = new Set(atts.map((a) => a.dayKey)).size
    const lastCheckIn = atts.length > 0 ? atts.sort((a, b) => b.checkInTime.getTime() - a.checkInTime.getTime())[0].checkInTime : null
    return {
      id: s.id,
      studentCode: s.studentCode,
      name: s.name,
      email: s.email,
      phone: s.phone,
      sessionQuota: s.sessionQuota,
      sessionsUsed: used,
      sessionsRemaining: remaining,
      quotaExhausted: remaining <= 0,
      quotaExtendedAt: s.quotaExtendedAt?.toISOString() ?? null,
      lastCheckIn: lastCheckIn?.toISOString() ?? null,
      uniqueDaysAttended: uniqueDays,
      flaggedCount: atts.filter((a) => a.flagged).length,
      extensions: s.quotaExtensions.map((e) => ({
        id: e.id,
        oldQuota: e.oldQuota,
        newQuota: e.newQuota,
        addedSessions: e.addedSessions,
        reason: e.reason,
        createdAt: e.createdAt.toISOString(),
        adminName: e.admin?.name ?? null,
      })),
    }
  })
  return NextResponse.json({ students: rows })
}
