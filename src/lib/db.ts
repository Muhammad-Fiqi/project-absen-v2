import { PrismaClient } from '../generated/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient, type Client } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || 'file:db/custom.db'

  // Prisma 7: All connections require a driver adapter
  // Use libsql adapter for both Turso (libsql://) and local SQLite (file:)
  const libsqlClient: Client = createClient({
    url: dbUrl,
    authToken: dbUrl.startsWith('libsql:')
      ? (process.env.DATABASE_AUTH_TOKEN || undefined)
      : undefined,
  })
  const adapter = new PrismaLibSql(libsqlClient)
  return new PrismaClient({ adapter, datasourceUrl: dbUrl })
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db