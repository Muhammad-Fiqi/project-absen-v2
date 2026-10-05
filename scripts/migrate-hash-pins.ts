/**
 * Migration script: Hash all existing plain-text student PINs
 * 
 * Run with: npx tsx scripts/migrate-hash-pins.ts
 * 
 * Safe to run multiple times — only processes PINs that are not already hashed.
 * Hashed PINs have format "salt:hash" (contains ':'), plain text does not.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

import { student } from '../src/db/schema'
import { hashPin } from '../src/lib/security'
import { eq } from 'drizzle-orm'

async function migrateHashPins() {
  const { db } = await import('../src/lib/db')
  console.log('🔐 Starting PIN hash migration...\n')

  const allStudents = await db.select({
    id: student.id,
    studentCode: student.studentCode,
    name: student.name,
    pinHash: student.pinHash,
  }).from(student)

  let migrated = 0
  let skipped = 0
  let noPin = 0

  for (const s of allStudents) {
    if (!s.pinHash) {
      console.log(`  ⚠️  ${s.studentCode} (${s.name}): Tidak ada PIN — dilewati`)
      noPin++
      continue
    }

    // Already hashed (contains ':' separator from scrypt salt:hash format)
    if (s.pinHash.includes(':')) {
      console.log(`  ✅ ${s.studentCode} (${s.name}): Sudah ter-hash — dilewati`)
      skipped++
      continue
    }

    // Plain text PIN — hash it
    const hashed = hashPin(s.pinHash)
    await db.update(student).set({ pinHash: hashed }).where(eq(student.id, s.id))
    console.log(`  🔒 ${s.studentCode} (${s.name}): PIN di-hash (plain text → scrypt)`)
    migrated++
  }

  console.log(`\n📊 Hasil migrasi:`)
  console.log(`   ✅ Sudah ter-hash : ${skipped}`)
  console.log(`   🔒 Baru di-hash  : ${migrated}`)
  console.log(`   ⚠️  Tanpa PIN     : ${noPin}`)
  console.log(`   📋 Total          : ${allStudents.length}`)
  console.log(`\n✨ Migrasi selesai!`)
}

migrateHashPins().catch((err) => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
