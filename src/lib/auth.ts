// Simple session-based auth using HTTP-only cookies.
// Stored as base64 JSON. Suitable for cheap deployment (no external auth service).

import { cookies } from 'next/headers'
import { db } from '@/lib/db'
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

export async function setStudentSession(student: StudentInfo) {
  const store = await cookies()
  store.set(STUDENT_COOKIE, encode({ ...student, ts: Date.now() }), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  })
}

export async function setTeacherSession(teacher: TeacherInfo) {
  const store = await cookies()
  store.set(TEACHER_COOKIE, encode({ ...teacher, ts: Date.now() }), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

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

export async function clearStudentSession() {
  const store = await cookies()
  store.delete(STUDENT_COOKIE)
}
export async function clearTeacherSession() {
  const store = await cookies()
  store.delete(TEACHER_COOKIE)
}

// Re-validate student against DB
export async function getCurrentStudent(): Promise<StudentInfo | null> {
  const sess = await getStudentSession()
  if (!sess?.id) return null
  const student = await db.student.findUnique({ where: { id: sess.id } })
  if (!student) return null
  return {
    id: student.id,
    studentCode: student.studentCode,
    name: student.name,
    email: student.email,
    phone: student.phone,
    courseCode: student.courseCode,
    courseId: student.courseId,
  }
}

export async function getCurrentTeacher(): Promise<TeacherInfo | null> {
  const sess = await getTeacherSession()
  if (!sess?.id) return null
  const teacher = await db.adminUser.findUnique({ where: { id: sess.id } })
  if (!teacher) return null
  return {
    id: teacher.id,
    username: teacher.username,
    name: teacher.name,
    role: teacher.role as 'admin' | 'teacher',
  }
}

export { encode, decode, SECRET }
