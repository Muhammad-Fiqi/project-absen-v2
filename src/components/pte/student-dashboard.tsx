'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock,
  TrendingUp,
  Target,
  Loader2,
  RefreshCw,
  GraduationCap,
  Zap,
  Video,
  Building2,
  Sparkles,
  CalendarDays,
  PackageOpen,
  History,
  X,
  Gift,
  Send,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { apiGet, apiPost } from '@/lib/api-client'
import { AttendanceFlow } from './attendance-flow'
import { RequestExtension } from './request-extension'
import { LeaveRequestDialog } from './leave-request-dialog'
import { AttendanceCalendar } from './attendance-calendar'
import { SessionCapacity } from './session-capacity'
import { toast } from 'sonner'
import { formatSessionCardTitle } from '@/lib/utils'
import type { StudentDashboard as StudentDashboardData, DayGroup } from '@/lib/types'

// YYYY-MM-DD key in LOCAL time (matches server-side dayKey())
function todayKeyLocal(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

interface ExtensionRequestRow {
  id: string
  requestedSessions: number
  reason: string
  status: 'pending' | 'approved' | 'denied'
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
}

interface LeaveRequestRow {
  id: string
  reason: string
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
}

interface StudentDashboardProps {
  initialData: StudentDashboardData
}

export function StudentDashboard({ initialData }: StudentDashboardProps) {
  const [data, setData] = useState(initialData)
  const [refreshing, setRefreshing] = useState(false)
  const [flowSession, setFlowSession] = useState<{ id: string; sessionNumber: number; title: string; date: string; startTime: string; endTime: string; room: string | null; notes: string | null } | null>(null)
  const [extOpen, setExtOpen] = useState(false)
  const [extRequests, setExtRequests] = useState<ExtensionRequestRow[]>([])
  const [extLoading, setExtLoading] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRow[]>([])
  const [leaveLoading, setLeaveLoading] = useState(false)
  const [excuseLoading, setExcuseLoading] = useState(false)
  const [excuseConfirmOpen, setExcuseConfirmOpen] = useState(false)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  const loadExtRequests = useCallback(async () => {
    setExtLoading(true)
    try {
      const res = await apiGet<{ requests: ExtensionRequestRow[] }>('/api/extension-requests')
      setExtRequests(res.requests)
    } catch {
      // Silent fail
    } finally {
      setExtLoading(false)
    }
  }, [])

  useEffect(() => {
    loadExtRequests()
  }, [loadExtRequests])

  const loadLeaveRequests = useCallback(async () => {
    setLeaveLoading(true)
    try {
      const res = await apiGet<{ requests: LeaveRequestRow[] }>('/api/student/leave-requests')
      setLeaveRequests(res.requests)
    } catch {
      // Silent fail
    } finally {
      setLeaveLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLeaveRequests()
  }, [loadLeaveRequests])

  async function refresh() {
    setRefreshing(true)
    try {
      const fresh = await apiGet<StudentDashboardData>('/api/student/dashboard')
      setData(fresh)
    } catch {
      toast.error('Gagal memuat ulang data')
    } finally {
      setRefreshing(false)
    }
  }

  function requestExcuse() {
    if ((data.quotaExcuseRemaining ?? 0) <= 0) {
      toast.error('Batas izin harian sudah habis (maksimal 5 kali)')
      return
    }
    setExcuseConfirmOpen(true)
  }

  async function applyExcuse() {
    setExcuseLoading(true)
    try {
      const res = await apiPost<{ success: boolean; remaining: number; used: number }>('/api/student/excuses', {
        dateKey: todayKeyLocal(),
        reason: 'Izin harian untuk mengecualikan kuota hari ini',
      })
      toast.success(`Izin dicatat. Sisa izin: ${res.remaining}/5`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim izin')
    } finally {
      setExcuseLoading(false)
    }
  }

  async function requestLeaveClass() {
    setLeaveDialogOpen(true)
  }

  const { student, course, quota, stats, today, upcomingDays, recentDays } = data
  const quotaPct = quota.total > 0 ? Math.round((quota.used / quota.total) * 100) : 0

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-6">
      {/* Welcome */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Halo, {student.name.split(' ')[0]}! 👋</h1>
              <p className="text-sm text-muted-foreground">
                {course.name} · {student.studentCode}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={requestExcuse} disabled={excuseLoading || (data.quotaExcuseRemaining ?? 0) <= 0} className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              {excuseLoading ? 'Memproses...' : 'Izin'}
            </Button>
            <Button variant="secondary" size="sm" onClick={requestLeaveClass} className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Ajukan Permintaan Cuti Kelas
            </Button>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {typeof data.quotaExcuseRemaining === 'number' && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-700 dark:border-purple-800 dark:bg-purple-950/20 dark:text-purple-200">
          <span className="font-medium">Sisa izin: {data.quotaExcuseRemaining}/{5}</span>
          <Badge variant="outline" className="border-purple-300 bg-transparent text-purple-700 dark:text-purple-200">Izin harian</Badge>
        </div>
      )}

      {/* QUOTA BANNER — most important */}
      {quota.exhausted ? (
        <Card className="mb-6 border-destructive/40 bg-destructive/5 transition-transform hover:-translate-y-0.5">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <PackageOpen className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Kuota sesi Anda habis!</h3>
              <p className="text-sm text-muted-foreground">
                Anda telah menggunakan {quota.used} dari {quota.total} sesi. Minta perpanjangan ke pengajar agar bisa ikut kelas lagi.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Badge variant="destructive" className="justify-center">{quota.used}/{quota.total} habis</Badge>
              <Button
                size="sm"
                onClick={() => setExtOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-primary to-emerald-600 hover:opacity-90"
              >
                <Send className="h-3.5 w-3.5" /> Minta Perpanjangan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : quota.expiringSoon ? (
        <Card className="mb-6 border-amber-400/50 bg-amber-50 transition-transform hover:-translate-y-0.5 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">Kuota segera habis!</h3>
              <p className="text-sm text-muted-foreground">
                Sisa kuota Anda hanya <strong>{quota.remaining} sesi</strong> dari {quota.total}. Pertimbangkan untuk perpanjang ke pengajar.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Badge className="justify-center gap-1 bg-amber-500 text-white hover:bg-amber-500">
                <Zap className="h-3 w-3" /> {quota.remaining} tersisa
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExtOpen(true)}
                className="gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/40"
              >
                <Send className="h-3.5 w-3.5" /> Minta Perpanjangan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={PackageOpen}
          label="Sisa Kuota"
          value={quota.remaining}
          sub={`dari ${quota.total} sesi`}
          tone={quota.exhausted ? 'destructive' : quota.expiringSoon ? 'amber' : 'primary'}
        />
        <StatCard
          icon={CheckCircle2}
          label="Hadir"
          value={stats.present}
          sub={`${stats.late} terlambat`}
          tone="primary"
        />
        <StatCard
          icon={CalendarDays}
          label="Hari Hadir"
          value={stats.uniqueDaysAttended}
          sub="hari berbeda"
          tone="default"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Absensi"
          value={stats.totalCheckIns}
          sub={`dari ${quota.total} kuota`}
          tone="default"
        />
        {stats.excused > 0 && (
          <StatCard
            icon={ShieldCheck}
            label="Izin"
            value={stats.excused}
            sub="tidak mengurangi kuota"
            tone="purple"
          />
        )}
      </div>

      {/* Quota progress */}
      <Card className="mb-6 border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-primary" />
              Kuota Sesi Personal
            </CardTitle>
            <Badge variant={quota.exhausted ? 'destructive' : 'secondary'} className="gap-1">
              {quota.used} / {quota.total} terpakai
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pemakaian kuota</span>
            <span className="font-semibold">{quotaPct}%</span>
          </div>
          <Progress value={quotaPct} className={`h-2.5 ${quota.exhausted ? '[&>div]:bg-destructive' : quota.expiringSoon ? '[&>div]:bg-amber-500' : ''}`} />
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {quota.extendedAt && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <History className="h-3 w-3" />
                Terakhir diperpanjang: {new Date(quota.extendedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
          <p className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
            Setiap hari ada beberapa sesi (offline & online) dengan materi yang sama. Anda cukup ikut <strong>1 sesi per hari</strong> — bebas pilih sesi mana saja.
          </p>
        </CardContent>
      </Card>

      {/* Calendar heatmap */}
      <div className="mb-6">
        <AttendanceCalendar />
      </div>

      {/* TODAY — most prominent */}
      {today && (
        <div className="relative mb-6">
          {/* Gradient border wrapper for emphasis */}
          <div className="rounded-2xl bg-gradient-to-r from-primary via-emerald-500 to-primary p-px shadow-md">
            <DayGroupCard
              day={today}
              isToday
              quotaExhausted={quota.exhausted}
              expandedSession={expandedSession}
              onToggleExpand={setExpandedSession}
              onCheckIn={(s) => setFlowSession({
                id: s.id,
                sessionNumber: s.sessionNumber,
                title: s.title,
                date: today.date,
                startTime: s.startTime,
                endTime: s.endTime,
                room: s.room,
                notes: null,
              })}
            />
          </div>
        </div>
      )}

      {/* Upcoming + Recent tabs */}
      <Tabs defaultValue="upcoming" className="mt-6 w-full">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jadwal Lainnya</h2>
          <TabsList>
            <TabsTrigger value="upcoming" className="gap-1">
              <Calendar className="h-3.5 w-3.5" /> Mendatang ({upcomingDays.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1">
              <History className="h-3.5 w-3.5" /> Riwayat ({recentDays.length})
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="upcoming" className="mt-0 space-y-3">
          {upcomingDays.length === 0 ? (
            <EmptyState icon={Calendar} text="Tidak ada jadwal mendatang" />
          ) : (
            upcomingDays.slice(0, 10).map((d) => (
              <DayGroupCard key={d.dayKey} day={d} quotaExhausted={quota.exhausted} expandedSession={expandedSession} onToggleExpand={setExpandedSession} onCheckIn={(s) => setFlowSession({
                id: s.id, sessionNumber: s.sessionNumber, title: s.title, date: d.date, startTime: s.startTime, endTime: s.endTime, room: s.room, notes: null,
              })} />
            ))
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-0 space-y-3">
          {recentDays.length === 0 ? (
            <EmptyState icon={History} text="Belum ada riwayat kehadiran" />
          ) : (
            recentDays.map((d) => (
              <DayGroupCard key={d.dayKey} day={d} isHistory quotaExhausted={quota.exhausted} expandedSession={expandedSession} onToggleExpand={setExpandedSession} onCheckIn={() => {}} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {flowSession && (
        <AttendanceFlow
          open={!!flowSession}
          onClose={() => setFlowSession(null)}
          session={flowSession}
          studentId={student.id}
          onSuccess={() => {
            setFlowSession(null)
            refresh()
          }}
        />
      )}

      <RequestExtension
        open={extOpen}
        onOpenChange={setExtOpen}
        quota={{ used: quota.used, total: quota.total, remaining: quota.remaining, exhausted: quota.exhausted }}
        onSubmitted={() => {
          loadExtRequests()
          refresh()
        }}
      />

      <LeaveRequestDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onSubmitted={() => {
          loadLeaveRequests()
          refresh()
        }}
      />

      {/* Izin confirmation — prevents accidental excuse submissions */}
      <AlertDialog open={excuseConfirmOpen} onOpenChange={setExcuseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Izin</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin melakukan izin hari ini? Kesempatan izin akan dikurangi 1 dan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excuseLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={excuseLoading}
              onClick={(e) => {
                e.preventDefault()
                applyExcuse()
                setExcuseConfirmOpen(false)
              }}
              className="gap-1.5"
            >
              {excuseLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5" /> Ya, Saya Yakin
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Extension requests history (bottom section) */}
      <ExtensionRequestsSection
        requests={extRequests}
        loading={extLoading}
        onReload={loadExtRequests}
        onRequestNew={() => setExtOpen(true)}
      />

      {/* Leave request history (bottom section) */}
      <LeaveRequestsSection
        requests={leaveRequests}
        loading={leaveLoading}
        onReload={loadLeaveRequests}
        onRequestNew={() => setLeaveDialogOpen(true)}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string | number
  sub: string
  tone: 'primary' | 'amber' | 'destructive' | 'default' | 'purple'
}) {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    destructive: 'bg-destructive/10 text-destructive',
    default: 'bg-muted text-muted-foreground',
    purple: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
  }[tone]
  return (
    <Card className="border-border/60 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
      <Icon className="mx-auto mb-2 h-8 w-8 opacity-40" />
      {text}
    </div>
  )
}

function DayGroupCard({
  day,
  isToday = false,
  isHistory = false,
  quotaExhausted,
  onCheckIn,
  expandedSession,
  onToggleExpand,
}: {
  day: DayGroup
  isToday?: boolean
  isHistory?: boolean
  quotaExhausted: boolean
  onCheckIn: (s: DayGroup['sessions'][number]) => void
  expandedSession: string | null
  onToggleExpand: (id: string | null) => void
}) {
  const dateLabel = new Date(day.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const attendedSession = day.sessions.find((s) => s.id === day.attendedSessionId)

  return (
    <Card className={`border-border/60 overflow-hidden rounded-2xl transition-transform hover:-translate-y-0.5 ${isToday ? 'border-transparent ring-0' : 'shadow-sm'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {isToday && (
                <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary">
                  <Zap className="h-3 w-3" /> HARI INI
                </Badge>
              )}
              <CardTitle className="text-base">{dateLabel}</CardTitle>
            </div>
            {day.topicOfDay && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Materi hari ini: <strong className="text-foreground">{day.topicOfDay}</strong>
              </p>
            )}
          </div>
          {attendedSession && (
            <Badge variant="default" className="shrink-0 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Sudah absen
            </Badge>
          )}
          {isHistory && !attendedSession && (
            <Badge variant="outline" className="shrink-0 gap-1 text-muted-foreground">
              <X className="h-3 w-3" /> Tidak hadir
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* If already attended today, show which session */}
        {attendedSession && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Anda absen di <strong>{attendedSession.title}</strong> ·{' '}
              {new Date(attendedSession.startTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {attendedSession.mode === 'online' ? attendedSession.platform : 'Offline'} · {attendedSession.teacher}
            </span>
          </div>
        )}
        {/* Sessions grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {day.sessions.map((s) => {
            const ModeIcon = s.mode === 'online' ? Video : Building2
            const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            const canCheckIn = s.canCheckIn && !attendedSession && !isHistory && !quotaExhausted
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                  canCheckIn ? 'border-primary/40 bg-primary/5 hover:bg-primary/10' : 'border-border/60 bg-card'
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  s.mode === 'online' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-accent text-accent-foreground'
                }`}>
                  <ModeIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{formatSessionCardTitle(s.mode)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {fmtTime(s.startTime)}–{fmtTime(s.endTime)}</span>
                    {s.teacher && <span>· {s.teacher}</span>}
                    {s.platform && <span>· {s.platform}</span>}
                  </div>
                  {/* Capacity indicator */}
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className={s.attendeeCount >= s.maxAttendees ? 'font-semibold text-destructive' : 'text-muted-foreground'}>
                      {s.attendeeCount}/{s.maxAttendees}
                    </span>
                    {s.attendeeCount >= s.maxAttendees ? (
                      <Badge variant="destructive" className="h-4 px-1.5 text-[9px]">PENUH</Badge>
                    ) : (
                      <span className="text-muted-foreground/70">({s.maxAttendees - s.attendeeCount} slot)</span>
                    )}
                    {/* Expand button to see who's checked in */}
                    {!isHistory && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleExpand(expandedSession === s.id ? null : s.id) }}
                        className="ml-auto flex items-center gap-0.5 text-primary hover:underline"
                      >
                        {expandedSession === s.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        <span>detail</span>
                      </button>
                    )}
                  </div>
                  {!canCheckIn && !attendedSession && !isHistory && s.checkInWindow.message && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">{s.checkInWindow.message}</p>
                  )}
                  {/* Expanded capacity panel */}
                  <SessionCapacity sessionId={s.id} isOpen={expandedSession === s.id} />
                </div>
                {canCheckIn ? (
                  <Button size="sm" onClick={() => onCheckIn(s)} className="shrink-0 gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Absen
                  </Button>
                ) : attendedSession?.id === s.id ? (
                  <Badge variant="default" className="shrink-0 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Hadir
                  </Badge>
                ) : attendedSession ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">—</span>
                ) : isHistory ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">lewat</span>
                ) : quotaExhausted ? (
                  <span className="shrink-0 text-[10px] text-destructive">kuota habis</span>
                ) : (
                  <span className="shrink-0 text-[10px] text-muted-foreground/60">{s.checkInWindow.message}</span>
                )}
              </div>
              
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ExtensionRequestsSection({
  requests,
  loading,
  onReload,
  onRequestNew,
}: {
  requests: ExtensionRequestRow[]
  loading: boolean
  onReload: () => void
  onRequestNew: () => void
}) {
  const pending = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const denied = requests.filter((r) => r.status === 'denied').length

  const statusMeta: Record<ExtensionRequestRow['status'], { label: string; cls: string; icon: typeof Clock }> = {
    pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/40', icon: Clock },
    approved: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/40', icon: CheckCircle2 },
    denied: { label: 'Ditolak', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: X },
  }

  return (
    <Card className="mt-6 border-border/60 transition-transform hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" />
            Permintaan Perpanjangan
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onRequestNew} className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Buat Permintaan
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1 border-amber-300/40 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-3 w-3" /> {pending} menunggu
          </Badge>
          <Badge variant="outline" className="gap-1 border-emerald-300/40 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> {approved} disetujui
          </Badge>
          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
            <X className="h-3 w-3" /> {denied} ditolak
          </Badge>
          <Button size="sm" variant="ghost" onClick={onReload} disabled={loading} className="h-6 gap-1 px-2 text-[10px]">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
            <Gift className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Belum ada permintaan perpanjangan.</p>
            <p className="mt-1 text-xs text-muted-foreground/80">Klik &quot;Buat Permintaan&quot; untuk mengajukan tambahan sesi ke pengajar.</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin">
            {requests.map((r) => {
              const meta = statusMeta[r.status]
              return (
                <div key={r.id} className="rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`gap-1 text-[10px] ${meta.cls}`}>
                          <meta.icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                        <span className="text-sm font-semibold text-primary">+{r.requestedSessions} sesi</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.reason}</p>
                      {r.reviewNote && (
                        <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                          <strong>Catatan pengajar:</strong> {r.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LeaveRequestsSection({
  requests,
  loading,
  onReload,
  onRequestNew,
}: {
  requests: LeaveRequestRow[]
  loading: boolean
  onReload: () => void
  onRequestNew: () => void
}) {
  const pending = requests.filter((r) => r.status === 'pending').length
  const approved = requests.filter((r) => r.status === 'approved').length
  const rejected = requests.filter((r) => r.status === 'rejected').length

  const statusMeta: Record<LeaveRequestRow['status'], { label: string; cls: string; icon: typeof Clock }> = {
    pending: { label: 'Menunggu', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/40', icon: Clock },
    approved: { label: 'Disetujui', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/40', icon: CheckCircle2 },
    rejected: { label: 'Ditolak', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: X },
  }

  return (
    <Card className="mt-6 border-border/60 transition-transform hover:-translate-y-0.5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Pengajuan Cuti Kelas
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onRequestNew} className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Ajukan Cuti
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline" className="gap-1 border-amber-300/40 bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-3 w-3" /> {pending} menunggu
          </Badge>
          <Badge variant="outline" className="gap-1 border-emerald-300/40 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> {approved} disetujui
          </Badge>
          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
            <X className="h-3 w-3" /> {rejected} ditolak
          </Badge>
          <Button size="sm" variant="ghost" onClick={onReload} disabled={loading} className="h-6 gap-1 px-2 text-[10px]">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Belum ada pengajuan cuti kelas.</p>
            <p className="mt-1 text-xs text-muted-foreground/80">Klik &quot;Ajukan Cuti&quot; untuk meminta periode cuti yang mengecualikan kuota harian Anda.</p>
          </div>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto scrollbar-thin">
            {requests.map((r) => {
              const meta = statusMeta[r.status]
              return (
                <div key={r.id} className="rounded-xl border border-border/60 p-3 transition-colors hover:bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`gap-1 text-[10px] ${meta.cls}`}>
                          <meta.icon className="h-3 w-3" /> {meta.label}
                        </Badge>
                        <span className="text-sm font-semibold">{r.startDate} s/d {r.endDate}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.reason}</p>
                      {r.reviewNote && (
                        <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                          <strong>Catatan pengajar:</strong> {r.reviewNote}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
