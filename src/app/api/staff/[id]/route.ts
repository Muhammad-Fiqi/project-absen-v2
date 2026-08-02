import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { adminUser } from '@/db/schema'
import { getCurrentTeacher } from '@/lib/auth'
import { hashPin } from '@/lib/security'

export const runtime = 'nodejs'

// PATCH /api/staff/[id] — Edit staff member (name, username, password, role)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentTeacher()
    if (!current || current.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya Admin yang dapat mengedit staf' }, { status: 403 })
    }

    const { id } = await params
    const { name, username, password, role } = await req.json()

    const existing = await db.select().from(adminUser).where(eq(adminUser.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Akun staf tidak ditemukan' }, { status: 404 })
    }

    const updates: Partial<typeof adminUser.$inferInsert> = {}
    if (name) updates.name = name.trim()
    if (username) {
      const cleanUsername = username.trim().toLowerCase()
      // Check if username taken by another user
      const duplicate = await db
        .select({ id: adminUser.id })
        .from(adminUser)
        .where(eq(adminUser.username, cleanUsername))
        .limit(1)
      if (duplicate[0] && duplicate[0].id !== id) {
        return NextResponse.json({ error: 'Username sudah digunakan oleh akun lain' }, { status: 400 })
      }
      updates.username = cleanUsername
    }
    if (role && (role === 'admin' || role === 'teacher')) {
      updates.role = role
    }
    if (password && password.trim().length > 0) {
      updates.passwordHash = hashPin(password.trim())
    }

    if (Object.keys(updates).length > 0) {
      await db.update(adminUser).set(updates).where(eq(adminUser.id, id))
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('PATCH /api/staff/[id] error', e)
    return NextResponse.json({ error: 'Gagal memperbarui data staf' }, { status: 500 })
  }
}

// DELETE /api/staff/[id] — Delete staff member
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const current = await getCurrentTeacher()
    if (!current || current.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya Admin yang dapat menghapus staf' }, { status: 403 })
    }

    const { id } = await params

    // Prevent admin from deleting themselves
    if (current.id === id) {
      return NextResponse.json({ error: 'Anda tidak dapat menghapus akun Anda sendiri' }, { status: 400 })
    }

    const existing = await db.select().from(adminUser).where(eq(adminUser.id, id)).limit(1)
    if (!existing[0]) {
      return NextResponse.json({ error: 'Akun staf tidak ditemukan' }, { status: 404 })
    }

    await db.delete(adminUser).where(eq(adminUser.id, id))

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('DELETE /api/staff/[id] error', e)
    return NextResponse.json({ error: 'Gagal menghapus akun staf' }, { status: 500 })
  }
}
