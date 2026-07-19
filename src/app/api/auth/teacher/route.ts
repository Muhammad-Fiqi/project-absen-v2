import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUser } from '@/db/schema'
import { verifyPin } from '@/lib/security'
import { applyTeacherCookie } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/auth/teacher — teacher/admin login
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 })
    }
    const rows = await db
      .select()
      .from(adminUser)
      .where(eq(adminUser.username, username.trim().toLowerCase()))
      .limit(1)
    const user = rows[0]
    if (!user) {
      return NextResponse.json({ error: 'Username tidak ditemukan' }, { status: 404 })
    }
    if (!verifyPin(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
    }

    const teacherInfo = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role as 'admin' | 'teacher',
    }

    const res = NextResponse.json({
      success: true,
      teacher: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    })

    // Set cookie directly on the response object
    return applyTeacherCookie(res, teacherInfo)
  } catch (e) {
    console.error('teacher login error', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
