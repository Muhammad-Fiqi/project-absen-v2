// Next.js instrumentation: runs once when the server starts.
// 1. Ensures all tables exist (idempotent CREATE TABLE IF NOT EXISTS) — this
//    covers databases created before newer tables (QuotaDailyUsage, etc.) were
//    added, so login and quota logic never hit "no such table".
// 2. Fallback daily-quota catch-up for local dev / self-hosted deployments
//    where Vercel Cron is not available (idempotent, safe to re-run).
export function register() {
  if (
    process.env.NEXT_RUNTIME === 'nodejs' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    import('@/db/migrate')
      .then(async ({ ensureDummyTables }) => {
        await ensureDummyTables()
        const { forgiveLegacyQuotaUsage, processDailyQuotaCatchUp } = await import('@/lib/quota')
        // Restore quota for absences recorded before the grace-period start key.
        await forgiveLegacyQuotaUsage()
        await processDailyQuotaCatchUp()
      })
      .catch((err) => {
        console.error('startup migration/catch-up failed', err)
      })
  }
}
