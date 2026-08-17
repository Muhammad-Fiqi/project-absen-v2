// Simple session-based auth using HTTP-only cookies.
// Stored as base64 JSON. Suitable for cheap deployment (no external auth service).

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUser, quotaDailyUsage, student } from '@/db/schema'
import type { StudentInfo, TeacherInfo } from '@/lib/types'

const STUDENT_COOKIE = 'pte_student'
const TEACHER_COOKIE = 'pte_teacher'
const SECRET = process.env.AUTH_SECRET || 'pte-attendance-auth-key-2024'


function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64')
}
function decode<T>(s: string): T | null {
  try {
    return JSON.parse(Buffer.from(s, 'base64').toString()) as T
  } catch {
    return null
  }
}

// ── Cookie options for NextResponse ──
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/' as const,
}

// ── Set session by returning cookie value + options ──
// Route handlers MUST use these to set cookies on the NextResponse object,
// because cookies().set() does NOT work reliably with NextResponse.json().

export function buildStudentCookie(student: StudentInfo) {
  return {
    name: STUDENT_COOKIE,
    value: encode({ ...student, ts: Date.now() }),
    ...COOKIE_OPTIONS,
  }
}

export function buildTeacherCookie(teacher: TeacherInfo) {
  return {
    name: TEACHER_COOKIE,
    value: encode({ ...teacher, ts: Date.now() }),
    ...COOKIE_OPTIONS,
  }
}

// ── Apply session cookie to a NextResponse ──
export function applyStudentCookie(res: any, student: StudentInfo) {
  const c = buildStudentCookie(student)
  res.cookies.set(c.name, c.value, c)
  return res
}

export function applyTeacherCookie(res: any, teacher: TeacherInfo) {
  const c = buildTeacherCookie(teacher)
  res.cookies.set(c.name, c.value, c)
  return res
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(STUDENT_COOKIE)
  res.cookies.delete(TEACHER_COOKIE)
  return res
}

// ── Read session from incoming request (uses cookies() - reads are fine) ──
export async function getStudentSession(): Promise<StudentInfo | null> {
  const store = await cookies()
  const raw = store.get(STUDENT_COOKIE)?.value
  if (!raw) return null
  return decode<StudentInfo>(raw)
}

export async function getTeacherSession(): Promise<TeacherInfo | null> {
  const store = await cookies()
  const raw = store.get(TEACHER_COOKIE)?.value
  if (!raw) return null
  return decode<TeacherInfo>(raw)
}

// Re-validate student against DB
export async function getCurrentStudent(): Promise<StudentInfo | null> {
  const sess = await getStudentSession()
  if (!sess?.id) return null
  const rows = await db
    .select({
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      email: student.email,
      phone: student.phone,
      courseCode: student.courseCode,
      courseId: student.courseId,
      sessionQuota: student.sessionQuota,
      quotaExtendedAt: student.quotaExtendedAt,
    })
    .from(student)
    .where(eq(student.id, sess.id))
    .limit(1)

  const s = rows[0]
  if (!s) return null

  // Compute usage to fill StudentInfo shape expected by frontend.
  // Daily quota reduction is tracked separately from attendance; a student is charged once per day.
  const [usedRow] = await db
    .select({ n: count() })
    .from(quotaDailyUsage)
    .where(eq(quotaDailyUsage.studentId, s.id))
  const sessionsUsed = Number(usedRow?.n ?? 0)
  const sessionsRemaining = Math.max(0, s.sessionQuota - sessionsUsed)

  return {
    id: s.id,
    studentCode: s.studentCode,
    name: s.name,
    email: s.email,
    phone: s.phone,
    courseCode: s.courseCode,
    courseId: s.courseId,
    sessionQuota: s.sessionQuota,
    sessionsUsed,
    sessionsRemaining,
    quotaExhausted: sessionsRemaining <= 0,
    quotaExtendedAt: s.quotaExtendedAt,
  }
}

export async function getCurrentTeacher(): Promise<TeacherInfo | null> {
  const sess = await getTeacherSession()
  if (!sess?.id) return null
  const rows = await db
    .select()
    .from(adminUser)
    .where(eq(adminUser.id, sess.id))

  const teacher = rows[0] ?? null
  if (!teacher) return null
  return {
    id: teacher.id,
    username: teacher.username,
    name: teacher.name,
    role: teacher.role as 'admin' | 'teacher',
  }
}

export { encode, decode, SECRET, STUDENT_COOKIE, TEACHER_COOKIE }