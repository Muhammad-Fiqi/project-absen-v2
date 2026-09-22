import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { student, course, attendance, quotaExtension, adminUser, quotaDailyUsage, studentLeaveRequest } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { newId } from '@/lib/id'
import { dayKey } from '@/lib/quota'
import type { StudentManageRow } from '@/lib/types'

export const runtime = 'nodejs'

// POST /api/students — Create a new student
export async function POST(req: NextRequest) {
  const teacher = await getCurrentTeacher()
  if (!teacher || teacher.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin yang dapat menambah siswa' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { studentCode, name, email, phone, courseId, courseCode, sessionQuota, pinHash } = body

    if (!studentCode || !name) {
      return NextResponse.json({ error: 'Kode siswa dan nama wajib diisi' }, { status: 400 })
    }

    const cleanCode = studentCode.trim().toUpperCase()

    // Check duplicate
    const existing = await db.select({ id: student.id }).from(student).where(eq(student.studentCode, cleanCode)).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ error: `Kode siswa ${cleanCode} sudah terdaftar` }, { status: 409 })
    }

    // Find course if courseCode provided
    let finalCourseId = courseId || null
    let finalCourseCode = courseCode || 'PTE-2026-A'
    if (!finalCourseId && finalCourseCode) {
      const courseRows = await db.select().from(course).where(eq(course.code, finalCourseCode)).limit(1)
      if (courseRows[0]) finalCourseId = courseRows[0].id
    }

    const newStudentId = newId('stu')
    await db.insert(student).values({
      id: newStudentId,
      studentCode: cleanCode,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      courseCode: finalCourseCode,
      courseId: finalCourseId,
      pinHash: pinHash || cleanCode.slice(-4), // default PIN = last 4 of code
      sessionQuota: sessionQuota ?? 15,
      sessionQuotaRemaining: sessionQuota ?? 15,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      student: { id: newStudentId, studentCode: cleanCode, name: name.trim() },
    })
  } catch (e) {
    console.error('POST /api/students error', e)
    return NextResponse.json({ error: 'Gagal menambah siswa' }, { status: 500 })
  }
}

// GET /api/students — list all students with quota usage + extensions
export async function GET() {
  const teacher = await getCurrentTeacher()
  if (!teacher) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const students = await db.select().from(student).orderBy(student.studentCode)
  const todayKey = dayKey(new Date())
  const approvedLeaves = await db
    .select({ studentId: studentLeaveRequest.studentId, startDate: studentLeaveRequest.startDate, endDate: studentLeaveRequest.endDate })
    .from(studentLeaveRequest)
    .where(eq(studentLeaveRequest.status, 'approved'))
  const leaveByStudent = new Map(
    approvedLeaves
      .filter((leave) => leave.startDate <= todayKey && leave.endDate >= todayKey)
      .map((leave) => [leave.studentId, leave] as const)
  )
  const attendances = await db.select().from(attendance)
  const verifiedAttendances = attendances.filter((a) => a.verified)
  const usageRows = await db.select().from(quotaDailyUsage)
  const usageByStudent = new Map<string, number>()
  for (const usage of usageRows) {
    usageByStudent.set(usage.studentId, (usageByStudent.get(usage.studentId) ?? 0) + 1)
  }

  // Course map (one course for now, but be safe)
  const courseIds = Array.from(new Set(students.map((s) => s.courseId).filter(Boolean) as string[]))
  const courses = courseIds.length === 1
    ? await db.select().from(course).where(eq(course.id, courseIds[0]))
    : await db.select().from(course)
  const courseById = new Map(courses.map((c) => [c.id, c]))

  // Quota extensions (with admin names)
  const studentIds = students.map((s) => s.id)
  const allExtensions = await db.select().from(quotaExtension)
  const extensionsForStudents = allExtensions.filter((e) => studentIds.includes(e.studentId))
  const adminIds = Array.from(new Set(extensionsForStudents.map((e) => e.adminId).filter(Boolean) as string[]))
  const admins = adminIds.length
    ? await db.select({ id: adminUser.id, name: adminUser.name }).from(adminUser)
    : []
  const adminNameById = new Map(admins.map((a) => [a.id, a.name]))

  const rows: StudentManageRow[] = students.map((s) => {
    const atts = verifiedAttendances.filter((a) => a.studentId === s.id)
    const used = usageByStudent.get(s.id) ?? 0
    const remaining = Math.max(0, s.sessionQuota - used)
    const uniqueDays = new Set(atts.map((a) => a.dayKey)).size
    const lastCheckIn = atts.length > 0
      ? atts.sort((a, b) => (a.checkInTime < b.checkInTime ? 1 : -1))[0].checkInTime
      : null
    const myExtensions = extensionsForStudents
      .filter((e) => e.studentId === s.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    return {
      id: s.id,
      studentCode: s.studentCode,
      name: s.name,
      email: s.email,
      phone: s.phone,
      currentPassword: s.pinHash,
      sessionQuota: s.sessionQuota,
      sessionQuotaRemaining: remaining,
      sessionsUsed: used,
      sessionsRemaining: remaining,
      quotaExhausted: remaining <= 0,
      quotaExtendedAt: s.quotaExtendedAt,
      isOnLeave: leaveByStudent.has(s.id),
      leaveStartDate: leaveByStudent.get(s.id)?.startDate ?? null,
      leaveEndDate: leaveByStudent.get(s.id)?.endDate ?? null,
      lastCheckIn,
      uniqueDaysAttended: uniqueDays,
      extensions: myExtensions.map((e) => ({
        id: e.id,
        oldQuota: e.oldQuota,
        newQuota: e.newQuota,
        addedSessions: e.addedSessions,
        reason: e.reason,
        createdAt: e.createdAt,
        adminName: e.adminId ? adminNameById.get(e.adminId) ?? null : null,
      })),
    }
  })
  // course map referenced for parity (course is unused in row but include to keep shape close to old include)
  void courseById
  return NextResponse.json({ students: rows })
}
