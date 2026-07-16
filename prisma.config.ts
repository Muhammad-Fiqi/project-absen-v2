import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 config — provides database URL for CLI commands (migrate, db push, etc.)
// Application code uses the libsql adapter directly (see src/lib/db.ts)
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // For CLI operations (prisma db push, migrate, studio, etc.)
    // Uses the local SQLite file for development
    url: process.env.PRISMA_DATABASE_URL || "file:./db/custom.db",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
