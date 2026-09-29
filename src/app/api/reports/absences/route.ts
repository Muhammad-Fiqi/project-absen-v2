import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { attendance, course, quotaExcuse, session, student, studentLeaveRequest } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { getStudentMissedDates } from '@/lib/absences'

export const runtime = 'nodejs'

function dayKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET() {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [students, sessions, courses, attendances, excuses, leaves] = await Promise.all([
    db.select().from(student),
    db.select().from(session),
    db.select().from(course),
    db.select().from(attendance),
    db.select().from(quotaExcuse),
    db.select().from(studentLeaveRequest).where(eq(studentLeaveRequest.status, 'approved')),
  ])
  const courseCodeById = new Map(courses.map((item) => [item.id, item.code]))

  const rows = getStudentMissedDates({
    students: students.map((item) => ({
      id: item.id,
      name: item.name,
      studentCode: item.studentCode,
      createdAt: item.createdAt,
      courseId: item.courseId,
      courseCode: item.courseCode,
    })),
    sessions: sessions.map((item) => ({
      courseId: item.courseId,
      courseCode: courseCodeById.get(item.courseId) ?? '',
      date: item.date,
      status: item.status,
    })),
    attendances: attendances.map((item) => ({
      studentId: item.studentId,
      dayKey: item.dayKey,
      status: item.status,
      verified: !!item.verified,
    })),
    excuses: excuses.map((item) => ({ studentId: item.studentId, dateKey: item.dateKey })),
    approvedLeaves: leaves.map((item) => ({
      studentId: item.studentId,
      startDate: item.startDate,
      endDate: item.endDate,
    })),
    todayKey: dayKey(new Date()),
  })

  return NextResponse.json({ students: rows })
}