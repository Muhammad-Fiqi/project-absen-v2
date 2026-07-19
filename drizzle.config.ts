import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'libsql',
  dbCredentials: {
    url: process.env.DATABASE_TURSO_DATABASE_URL || 'file:db/custom.db',
    authToken: process.env.DATABASE_TURSO_AUTH_TOKEN,
  },
})