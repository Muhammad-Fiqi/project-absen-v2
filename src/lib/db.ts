import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:db/custom.db'

  // If URL starts with "libsql:", use the Turso driver adapter
  // Local "file:" URLs use standard Prisma SQLite (no adapter needed)
  if (dbUrl.startsWith('libsql:')) {
    const libsqlClient: Client = createClient({
      url: dbUrl,
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    })
    const adapter = new PrismaLibSql(libsqlClient)
    return new PrismaClient({ adapter, log: ['error', 'warn'] })
  }

  // Standard SQLite connection (local dev / VPS)
  return new PrismaClient({ log: ['error', 'warn'] })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db