'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { Loader2, TrendingUp, Users, Calendar, AlertTriangle, Download, Award, PackageOpen, Zap, Gift } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { apiGet } from '@/lib/api-client'

interface ReportData {
  course: { id: string; code: string; name: string; totalSessions: number; totalStudents: number; defaultQuota: number }
  overall: { totalPresent: number; totalLate: number; totalFlagged: number; totalCheckIns: number; totalQuota: number; quotaUsagePct: number; studentsExhausted: number; studentsExpiring: number; uniqueDaysWithSessions: number }
  perStudent: Array<{
    studentId: string; studentCode: string; name: string; email: string | null; phone: string | null
    sessionQuota: number; sessionsUsed: number; sessionsRemaining: number; quotaExhausted: boolean
    present: number; late: number; flagged: number; uniqueDaysAttended: number; quotaUsagePct: number; quotaExtendedAt: string | null
  }>
  perDay: Array<{
    dayKey: string; date: string; topicOfDay: string | null; sessionCount: number; offlineCount: number; onlineCount: number; totalCheckIns: number; present: number; late: number
  }>
}

export function ReportsView() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet<ReportData>('/api/reports/course').then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
  if (!data) return <div className="text-sm text-muted-foreground">Gagal memuat laporan.</div>

  const pieData = [
    { name: 'Hadir', value: data.overall.totalPresent, color: 'oklch(0.52 0.13 162)' },
    { name: 'Terlambat', value: data.overall.totalLate, color: 'oklch(0.75 0.15 84)' },
  ].filter((d) => d.value > 0)

  // Per-day check-ins (last 14 days)
  const dayChartData = data.perDay.slice(-14).map((d) => ({
    name: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    Hadir: d.present,
    Terlambat: d.late,
    Sesi: d.sessionCount,
  }))

  // Quota usage distribution
  const ranked = [...data.perStudent].sort((a, b) => b.quotaUsagePct - a.quotaUsagePct)

  function exportCsv() {
    const rows = [
      ['Kode', 'Nama', 'Kuota', 'Terpakai', 'Sisa', 'Hadir', 'Terlambat', 'Hari Hadir', 'Ditandai', 'Usage %', 'Diperpanjang'],
      ...data.perStudent.map((s) => [s.studentCode, s.name, s.sessionQuota, s.sessionsUsed, s.sessionsRemaining, s.present, s.late, s.uniqueDaysAttended, s.flagged, s.quotaUsagePct, s.quotaExtendedAt || '']),
    ]
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-absensi-${data.course.code}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Overall */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigStat icon={TrendingUp} label="Tingkat Pakai Kuota" value={`${data.overall.quotaUsagePct}%`} sub={`${data.overall.totalCheckIns}/${data.overall.totalQuota} sesi`} tone="primary" />
        <BigStat icon={Users} label="Total Siswa" value={data.course.totalStudents} sub={`${data.overall.uniqueDaysWithSessions} hari ada kelas`} tone="default" />
        <BigStat icon={PackageOpen} label="Kuota Habis" value={data.overall.studentsExhausted} sub="perlu extend" tone="destructive" />
        <BigStat icon={Zap} label="Hampir Habis" value={data.overall.studentsExpiring} sub="≤ 2 sisa" tone="amber" />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pie */}
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribusi Status Kehadiran</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`} labelLine={false}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily check-ins */}
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Kehadiran per Hari (14 hari terakhir)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dayChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 162)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="oklch(0.5 0.02 162)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.5 0.02 162)" />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Hadir" stackId="a" fill="oklch(0.52 0.13 162)" />
                <Bar dataKey="Terlambat" stackId="a" fill="oklch(0.75 0.15 84)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Per-day table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-primary" /> Ringkasan per Hari</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-80 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {[...data.perDay].reverse().slice(0, 21).map((d) => (
              <div key={d.dayKey} className="flex items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <Badge variant="outline" className="h-5 gap-1 px-1 text-[10px]">{d.sessionCount} sesi</Badge>
                    <Badge variant="outline" className="h-5 gap-1 px-1 text-[10px]">offline {d.offlineCount}</Badge>
                    <Badge variant="outline" className="h-5 gap-1 px-1 text-[10px]">online {d.onlineCount}</Badge>
                  </div>
                  {d.topicOfDay && <p className="truncate text-[11px] text-muted-foreground">{d.topicOfDay}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-primary"><TrendingUp className="h-3 w-3" /> {d.present + d.late}</span>
                  <span className="text-muted-foreground">{d.present}H · {d.late}T</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quota ranking */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm"><Award className="h-4 w-4 text-primary" /> Pemakaian Kuota per Siswa</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {ranked.map((s, i) => (
              <div key={s.studentId} className="flex items-center gap-3 p-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' :
                  i === 1 ? 'bg-muted text-muted-foreground' :
                  i === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                  'bg-muted/50 text-muted-foreground'
                }`}>{i + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.name}</span>
                    <span className="text-[11px] text-muted-foreground">{s.studentCode}</span>
                    {s.quotaExhausted && <Badge variant="destructive" className="h-5 px-1 text-[10px]">Habis</Badge>}
                    {!s.quotaExhausted && s.sessionsRemaining <= 2 && <Badge className="h-5 bg-amber-500 px-1 text-[10px] text-white hover:bg-amber-500">Hampir</Badge>}
                    {s.quotaExtendedAt && <Badge variant="outline" className="h-5 gap-1 px-1 text-[10px]"><Gift className="h-2.5 w-2.5" /> extended</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Progress value={s.quotaUsagePct} className={`h-1.5 flex-1 ${s.quotaExhausted ? '[&>div]:bg-destructive' : s.sessionsRemaining <= 2 ? '[&>div]:bg-amber-500' : ''}`} />
                    <span className="shrink-0 text-[11px] text-muted-foreground">{s.sessionsUsed}/{s.sessionQuota} ({s.quotaUsagePct}%) · sisa {s.sessionsRemaining}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-[11px] text-muted-foreground">
                  <div>{s.present}H · {s.late}T</div>
                  <div>{s.uniqueDaysAttended} hari</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function BigStat({ icon: Icon, label, value, sub, tone }: { icon: typeof TrendingUp; label: string; value: string | number; sub: string; tone: 'primary' | 'default' | 'amber' | 'destructive' }) {
  const cls = {
    primary: 'bg-primary/10 text-primary',
    default: 'bg-muted text-muted-foreground',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    destructive: 'bg-destructive/10 text-destructive',
  }[tone]
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${cls}`}><Icon className="h-4 w-4" /></div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</div>
      </CardContent>
    </Card>
  )
}
