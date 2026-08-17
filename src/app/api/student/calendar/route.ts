import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, course, session, attendance, quotaExcuse, studentLeaveRequest } from '@/db/schema'
import { getCurrentStudent } from '@/lib/auth'

export const runtime = 'nodejs'

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

interface CalendarDay {
  day: number
  dayOfWeek: number // 0=Mon, 6=Sun
  status: 'none' | 'present' | 'late' | 'excused' | 'missed' | 'future'
  hasSessions: boolean
  sessionTitle?: string
  mode?: string
  note?: string
  dateKey: string
}

interface CalendarMonth {
  year: number
  month: number
  label: string
  days: CalendarDay[]
}

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDayOfWeekMondayBased(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 6 : d - 1
}

const MONTH_LABELS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export async function GET() {
  const studentSess = await getCurrentStudent()
  if (!studentSess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fullStudentRows = await db
    .select()
    .from(student)
    .where(eq(student.id, studentSess.id))
    .limit(1)
  const fullStudent = fullStudentRows[0]
  if (!fullStudent?.courseId) {
    return NextResponse.json({ error: 'Data tidak ditemukan' }, { status: 404 })
  }

  const courseId = fullStudent.courseId
  const now = new Date()

  // Only the current month (per requirement: "hanya perlihatkan pada bulan tersebut").
  const months: CalendarMonth[] = [{
    year: now.getFullYear(),
    month: now.getMonth(),
    label: `${MONTH_LABELS[now.getMonth()]} ${now.getFullYear()}`,
    days: [],
  }]

  // Date range for querying
  const startDate = new Date(months[0].year, months[0].month, 1)
  const endDate = new Date(months[0].year, months[0].month + 1, 0, 23, 59, 59, 999)
  const startKey = dayKey(startDate)
  const endKey = dayKey(endDate)

  // Get all sessions in the range for this course (exclude cancelled)
  const allSessions = await db.select().from(session).where(eq(session.courseId, courseId))
  const sessions = allSessions.filter((s) => {
    if (s.status === 'cancelled') return false
    const k = typeof s.date === 'string' ? s.date.slice(0, 10) : dayKey(new Date(s.date as any))
    return k >= startKey && k <= endKey
  })

  // Get all attendances for this student in the range (filter by dayKey string)
  const allAttendances = await db
    .select()
    .from(attendance)
    .where(eq(attendance.studentId, studentSess.id))
  const atts = allAttendances.filter((a) => a.dayKey >= startKey && a.dayKey <= endKey)

  // Build maps
  const sessionsByDay = new Map<string, typeof sessions>()
  for (const s of sessions) {
    const k = typeof s.date === 'string' ? s.date.slice(0, 10) : dayKey(new Date(s.date as any))
    if (!sessionsByDay.has(k)) sessionsByDay.set(k, [])
    sessionsByDay.get(k)!.push(s)
  }

  // dayKey -> attendance (prefer verified/excused)
  const attendanceByDay = new Map<string, (typeof atts)[number]>()
  for (const a of atts) {
    const existing = attendanceByDay.get(a.dayKey)
    if (!existing) {
      attendanceByDay.set(a.dayKey, a)
    } else {
      if ((a.verified || a.status === 'excused') && !existing.verified && existing.status !== 'excused') {
        attendanceByDay.set(a.dayKey, a)
      }
    }
  }

  // Excused days come from two sources:
  // 1) Izin harian (QuotaExcuse) — a row per date.
  // 2) Cuti kelas (approved StudentLeaveRequest) — a date range.
  // Both mark the day as "izin" instead of "tidak hadir".
  const excuseRows = await db
    .select({ dateKey: quotaExcuse.dateKey, reason: quotaExcuse.reason })
    .from(quotaExcuse)
    .where(eq(quotaExcuse.studentId, studentSess.id))
  const excuseByDay = new Map<string, string>()
  for (const r of excuseRows) {
    if (r.dateKey >= startKey && r.dateKey <= endKey) {
      excuseByDay.set(r.dateKey, r.reason || 'Izin harian')
    }
  }

  const leaveRows = await db
    .select({ startDate: studentLeaveRequest.startDate, endDate: studentLeaveRequest.endDate, reason: studentLeaveRequest.reason })
    .from(studentLeaveRequest)
    .where(and(eq(studentLeaveRequest.studentId, studentSess.id), eq(studentLeaveRequest.status, 'approved')))
  const leaveByDay = new Map<string, string>()
  for (const r of leaveRows) {
    const from = r.startDate > startKey ? r.startDate : startKey
    const until = r.endDate < endKey ? r.endDate : endKey
    for (let d = from; d <= until;) {
      if (!excuseByDay.has(d)) leaveByDay.set(d, r.reason)
      const dt = new Date(d + 'T00:00:00')
      dt.setDate(dt.getDate() + 1)
      d = dayKey(dt)
    }
  }

  // Build calendar months
  for (const m of months) {
    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate()
    const firstDayOfWeek = getDayOfWeekMondayBased(new Date(m.year, m.month, 1))

    for (let i = 0; i < firstDayOfWeek; i++) {
      m.days.push({
        day: 0,
        dayOfWeek: i,
        status: 'none',
        hasSessions: false,
        dateKey: '',
      })
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(m.year, m.month, d)
      const dk = dayKey(dateObj)
      const dow = getDayOfWeekMondayBased(dateObj)
      const daySessions = sessionsByDay.get(dk)
      const att = attendanceByDay.get(dk)
      const todayKey = dayKey(now)
      const isFuture = dk > todayKey

      let status: CalendarDay['status'] = 'none'
      let sessionTitle: string | undefined
      let mode: string | undefined
      let note: string | undefined

      if (daySessions && daySessions.length > 0) {
        if (att) {
          if (att.status === 'present') status = 'present'
          else if (att.status === 'late') status = 'late'
          else if (att.status === 'excused') status = 'excused'
          else status = 'present'
          note = att.notes || undefined
        } else {
          // Izin (daily excuse or approved leave) beats "tidak hadir".
          const excusedReason = excuseByDay.get(dk) || leaveByDay.get(dk)
          if (excusedReason) {
            status = 'excused'
            note = `Izin: ${excusedReason}`
          } else if (isFuture) {
            status = 'future'
          } else {
            status = 'missed'
          }
        }
        const firstSession = daySessions[0]
        sessionTitle = `${firstSession.title} · ${firstSession.mode === 'online' ? 'Online' : 'Offline'}`
        mode = firstSession.mode
      }

      m.days.push({
        day: d,
        dayOfWeek: dow,
        status,
        hasSessions: !!daySessions && daySessions.length > 0,
        sessionTitle,
        mode,
        note,
        dateKey: dk,
      })
    }
  }

  const allDays: CalendarDay[] = months.flatMap((m) => m.days)
  const present = allDays.filter((d) => d.status === 'present').length
  const late = allDays.filter((d) => d.status === 'late').length
  const excused = allDays.filter((d) => d.status === 'excused').length
  const missed = allDays.filter((d) => d.status === 'missed').length

  return NextResponse.json({
    months,
    stats: { present, late, excused, missed },
  })
}
