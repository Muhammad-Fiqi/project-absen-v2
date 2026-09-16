import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendance, quotaExcuse, session, student } from '@/db/schema'
import { getCurrentStudent, getCurrentTeacher } from '@/lib/auth'
import { createExcuse, dayKey } from '@/lib/quota'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  const studentSess = await getCurrentStudent()
  if (!teacher && !studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Staff view: list every student excused on a given day (default: today).
  if (teacher) {
    const { searchParams } = new URL(req.url)
    const date = (searchParams.get('date') || dayKey(new Date())).trim()

    const rows = await db
      .select()
      .from(quotaExcuse)
      .where(eq(quotaExcuse.dateKey, date))
      .orderBy(quotaExcuse.createdAt)

    const excusedRows = await db
      .select({ attendanceId: attendance.id, studentId: attendance.studentId, date: session.date, reason: attendance.notes, createdAt: attendance.createdAt })
      .from(attendance)
      .innerJoin(session, eq(attendance.sessionId, session.id))
      .where(eq(attendance.status, 'excused'))
    const staffExcused = excusedRows.filter((row) => row.date.slice(0, 10) === date)

    const studentIds = Array.from(new Set(rows.map((r) => r.studentId)))
    const students = studentIds.length ? await db.select().from(student) : []
    const studentMap = new Map(students.map((s) => [s.id, s]))

    const dailyItems = rows.map((r) => ({
      id: r.id,
      source: 'daily' as const,
      studentId: r.studentId,
      studentName: studentMap.get(r.studentId)?.name ?? '',
      studentCode: studentMap.get(r.studentId)?.studentCode ?? '',
      dateKey: r.dateKey,
      reason: r.reason,
      createdAt: r.createdAt,
    }))
    const dailyKeys = new Set(dailyItems.map((item) => `${item.studentId}:${item.dateKey}`))
    const attendanceItems = staffExcused
      .filter((r) => !dailyKeys.has(`${r.studentId}:${date}`))
      .map((r) => ({
        id: r.attendanceId,
        source: 'attendance' as const,
        studentId: r.studentId,
        studentName: studentMap.get(r.studentId)?.name ?? '',
        studentCode: studentMap.get(r.studentId)?.studentCode ?? '',
        dateKey: date,
        reason: r.reason?.replace(/^Izin:\s*/, '') || 'Diizinkan pengajar',
        createdAt: r.createdAt,
      }))

    return NextResponse.json({
      date,
      items: [...dailyItems, ...attendanceItems],
    })
  }

  const rows = await db
    .select()
    .from(quotaExcuse)
    .where(eq(quotaExcuse.studentId, studentSess!.id))
    .orderBy(quotaExcuse.createdAt)

  const used = rows.length
  return NextResponse.json({
    used,
    remaining: Math.max(0, 5 - used),
    items: rows.map((row) => ({ id: row.id, dateKey: row.dateKey, reason: row.reason, createdAt: row.createdAt })),
  })
}

export async function POST(req: NextRequest) {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({})) as { dateKey?: string; reason?: string }
  const dateKey = (body.dateKey || dayKey(new Date())).trim()
  const reason = (body.reason || 'Izin harian').trim()

  const result = await createExcuse(db, studentSess.id, dateKey, reason)
  if (!result.ok) {
    const isDuplicate = result.error?.includes('sudah menggunakan izin')
    return NextResponse.json({ error: result.error }, { status: isDuplicate ? 409 : 400 })
  }

  return NextResponse.json({
    success: true,
    used: result.used,
    remaining: result.remaining,
    item: result.item,
  }, { status: 201 })
}
