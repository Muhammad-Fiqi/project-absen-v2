import { NextRequest, NextResponse } from 'next/server'
import { forgiveLegacyQuotaUsage, processDailyQuotaCatchUp } from '@/lib/quota'

export const runtime = 'nodejs'

// GET /api/cron/daily-quota — invoked by Vercel Cron (or manually with secret).
// Runs the daily quota deduction for every student (idempotent: one row per
// student per session-day, quota never goes below zero).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    // Idempotent — also cleans any legacy pre-grace usage left over from before
    // the quota start key so old absences never count against the quota.
    await forgiveLegacyQuotaUsage()
    const result = await processDailyQuotaCatchUp()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('daily-quota cron error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export { GET as POST }
