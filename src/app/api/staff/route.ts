import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUser } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { hashPin } from '@/lib/security'
import crypto from 'crypto'

export const runtime = 'nodejs'

// GET /api/staff — Get list of teachers and admins
export async function GET() {
  try {
    const current = await getCurrentTeacher()
    if (!current) {
      return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 401 })
    }

    const staffList = await db
      .select({
        id: adminUser.id,
        username: adminUser.username,
        name: adminUser.name,
        role: adminUser.role,
        createdAt: adminUser.createdAt,
      })
      .from(adminUser)

    return NextResponse.json({ staff: staffList })
  } catch (e) {
    console.error('GET /api/staff error', e)
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 })
  }
}

// POST /api/staff — Create a new teacher or admin user
export async function POST(req: NextRequest) {
  try {
    const current = await getCurrentTeacher()
    if (!current || current.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya Admin yang dapat membuat akun staf' }, { status: 403 })
    }

    const { username, name, password, role } = await req.json()

    if (!username || !name || !password) {
      return NextResponse.json({ error: 'Nama, username, dan password wajib diisi' }, { status: 400 })
    }

    const cleanUsername = username.trim().toLowerCase()
    const targetRole = role === 'admin' ? 'admin' : 'teacher'

    // Check if username already exists
    const existing = await db
      .select({ id: adminUser.id })
      .from(adminUser)
      .where(eq(adminUser.username, cleanUsername))
      .limit(1)

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 })
    }

    const newId = 'adm_' + crypto.randomBytes(8).toString('hex')
    const passwordHash = hashPin(password)

    await db.insert(adminUser).values({
      id: newId,
      username: cleanUsername,
      name: name.trim(),
      passwordHash,
      role: targetRole,
    })

    return NextResponse.json({
      success: true,
      staff: {
        id: newId,
        username: cleanUsername,
        name: name.trim(),
        role: targetRole,
      },
    })
  } catch (e) {
    console.error('POST /api/staff error', e)
    return NextResponse.json({ error: 'Gagal membuat akun staf' }, { status: 500 })
  }
}
