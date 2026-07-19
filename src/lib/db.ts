import { drizzle } from 'drizzle-orm/libsql'
import { createClient, type Client } from '@libsql/client'

import { adminUser, attendance, course, extensionRequest, quotaExtension, qrToken, session, student } from '@/db/schema'

// Drizzle expects libsql client for Turso/libsql URLs.
// For local dev we still use SQLite file via file:db/custom.db.

function createDb() {
  const dbUrl = process.env.DATABASE_TURSO_DATABASE_URL || 'file:db/custom.db'

  const libsqlClient: Client = createClient({
    url: dbUrl,
    authToken: dbUrl.startsWith('libsql:')
      ? (process.env.DATABASE_TURSO_AUTH_TOKEN || undefined)
      : undefined,
  })

  const database = drizzle(libsqlClient, {
    schema: {
      adminUser,
      course,
      student,
      session,
      attendance,
      qrToken,
      quotaExtension,
      extensionRequest,
    },
  })

  return database
}

const globalForDb = globalThis as unknown as { db: ReturnType<typeof createDb> | undefined }
export const db = globalForDb.db ?? createDb()
if (process.env.NODE_ENV !== 'production') globalForDb.db = db

