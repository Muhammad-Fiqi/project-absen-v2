'use client'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  Calendar, Plus, Users, BarChart3, Loader2, Clock, MapPin, Play, CheckCircle2, RefreshCw, CalendarDays, AlertCircle, Video, Building2, Sparkles, Gift, MailCheck, Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiGet, apiPost, apiPatch } from '@/lib/api-client'
import { AttendeesView } from './attendees-view'
import { ReportsView } from './reports-view'
import { StudentsManage } from './students-manage'
import { ExtensionRequests } from './extension-requests'
import { BulkSessionDialog } from './bulk-session-dialog'
import { toast } from 'sonner'
import { formatSessionCardTitle } from '@/lib/utils'

interface SessionItem {
  id: string
  sessionNumber: number
  title: string
  date: string
  startTime: string
  endTime: string
  mode: string
  platform: string | null
  room: string | null
  teacher: string | null
  topicOfDay: string | null
  maxAttendees: number
  status: string
  notes: string | null
  course: { code: string; name: string; totalSessions: number }
  _count?: { attendances: number }
}

interface DayGroup {
  dayKey: string
  date: string
  topicOfDay: string | null
  sessionCount: number
  sessions: SessionItem[]
}

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
  scheduled: { label: 'Terjadwal', cls: 'bg-muted text-muted-foreground border-border', icon: Calendar },
  active: { label: 'Aktif', cls: 'bg-primary/10 text-primary border-primary/30 animate-pulse', icon: Play },
  completed: { label: 'Selesai', cls: 'bg-muted text-muted-foreground border-border', icon: CheckCircle2 },
  cancelled: { label: 'Dibatalkan', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: AlertCircle },
}

export function TeacherDashboard() {
  const [days, setDays] = useState<DayGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [tab, setTab] = useState('sessions')
  const [pendingExtCount, setPendingExtCount] = useState(0)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ sessions: SessionItem[]; days: DayGroup[] }>('/api/sessions')
      setDays(res.days)
      // Auto-select an active session
      const active = res.sessions.find((s) => s.status === 'active')
      if (active && !selectedSession) setSelectedSession(active)
      else if (!selectedSession && res.sessions[0]) {
        // pick today's first session if any
        const todayKey = new Date().toISOString().slice(0, 10)
        const today = res.days.find((d) => d.dayKey === todayKey)
        setSelectedSession(today?.sessions[0] || res.sessions[0])
      }
    } catch {
      toast.error('Gagal memuat sesi')
    } finally {
      setLoading(false)
    }
  }, [selectedSession])

  useEffect(() => { loadSessions() }, [loadSessions])

  // Fetch pending extension request count (auto-refresh every 30s)
  const loadExtCount = useCallback(async () => {
    try {
      const res = await apiGet<{ requests: { id: string }[] }>('/api/extension-requests?status=pending')
      setPendingExtCount(res.requests.length)
    } catch {
      // silent
    }
  }, [])
  useEffect(() => {
    loadExtCount()
    const id = setInterval(loadExtCount, 30000)
    return () => clearInterval(id)
  }, [loadExtCount])
  // Also refresh count when extension tab is opened
  useEffect(() => {
    if (tab === 'extensions') loadExtCount()
  }, [tab, loadExtCount])

  async function updateStatus(sessionId: string, status: string) {
    try {
      await apiPatch(`/api/sessions/${sessionId}/status`, { status })
      toast.success(`Sesi ${STATUS_STYLE[status]?.label}`)
      await loadSessions()
      const updated = days.flatMap((d) => d.sessions).find((s) => s.id === sessionId)
      if (updated) setSelectedSession({ ...updated, status })
    } catch {
      toast.error('Gagal mengubah status')
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Panel Pengajar</h1>
<p className="text-sm text-muted-foreground">
            Kelola jadwal multi-sesi, kelola kuota siswa, & pantau laporan
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Sesi Baru
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Buat Banyak Sesi
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:grid-cols-5 max-md:h-[100px]">
          <TabsTrigger value="sessions" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Jadwal</TabsTrigger>
          <TabsTrigger value="attendees" className="gap-1.5" disabled={!selectedSession}><Users className="h-3.5 w-3.5" /> Kehadiran</TabsTrigger>
          <TabsTrigger value="students" className="gap-1.5"><Gift className="h-3.5 w-3.5" /> Siswa & Kuota</TabsTrigger>
          <TabsTrigger value="extensions" className="gap-1.5 relative">
            <MailCheck className="h-3.5 w-3.5" /> Permintaan
            {pendingExtCount > 0 && (
              <Badge variant="destructive" className="ml-0.5 h-4 min-w-4 px-1 text-[10px]">
                {pendingExtCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Laporan</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="mt-0 animate-fade-in">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <SessionsByDay days={days} selectedId={selectedSession?.id} onSelect={(s) => { setSelectedSession(s); setTab('attendees') }} onUpdateStatus={updateStatus} />
          )}
        </TabsContent>

        <TabsContent value="attendees" className="mt-0 animate-fade-in">
          {selectedSession ? (
            <div className="space-y-4">
              <SessionInfoBar session={selectedSession}>
                <div className="flex flex-wrap gap-2">
                  {selectedSession.status === 'scheduled' && (
                    <Button onClick={() => updateStatus(selectedSession.id, 'active')} className="gap-1.5">
                      <Play className="h-4 w-4" /> Buka Absensi
                    </Button>
                  )}
                  {selectedSession.status === 'active' && (
                    <Button onClick={() => updateStatus(selectedSession.id, 'completed')} variant="default" className="gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Tutup & Selesai
                    </Button>
                  )}
                </div>
              </SessionInfoBar>
              <AttendeesView sessionId={selectedSession.id} />
            </div>
          ) : <div className="py-12 text-center text-sm text-muted-foreground">Pilih sesi dulu</div>}
        </TabsContent>

        <TabsContent value="students" className="mt-0 animate-fade-in">
          <StudentsManage />
        </TabsContent>

        <TabsContent value="extensions" className="mt-0 animate-fade-in">
          <ExtensionRequests />
        </TabsContent>

        <TabsContent value="reports" className="mt-0 animate-fade-in">
          <ReportsView />
        </TabsContent>
      </Tabs>

      <CreateSessionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadSessions} days={days} />
      <BulkSessionDialog open={bulkOpen} onOpenChange={setBulkOpen} onCreated={loadSessions} />
    </div>
  )
}

function SessionInfoBar({ session, children }: { session: SessionItem; children?: ReactNode }) {
  const st = STATUS_STYLE[session.status] || STATUS_STYLE.scheduled
  const fmtDate = new Date(session.startTime).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const ModeIcon = session.mode === 'online' ? Video : Building2
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${session.mode === 'online' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-primary text-primary-foreground'}`}>
        <ModeIcon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{formatSessionCardTitle(session.mode)}</span>
          <Badge variant="outline" className={`gap-1 border ${st.cls}`}><st.icon className="h-3 w-3" /> {st.label}</Badge>
          {session.mode === 'online' && <Badge variant="outline" className="gap-1 border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300"><Video className="h-3 w-3" /> {session.platform}</Badge>}
          {session.mode === 'offline' && <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> Offline</Badge>}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtTime(session.startTime)}–{fmtTime(session.endTime)}</span>
          {session.teacher && <span>· {session.teacher}</span>}
          {session.room && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {session.room}</span>}
          {session.topicOfDay && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> {session.topicOfDay}</span>}
        </div>
        <div className="mt-1">
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Users className="h-3 w-3" /> Max {session.maxAttendees} orang
          </Badge>
        </div>
      </div>
      {children && <div className="w-full sm:w-auto">{children}</div>}
    </div>
  )
}

function SessionsByDay({
  days, selectedId, onSelect, onUpdateStatus,
}: {
  days: DayGroup[]
  selectedId?: string
  onSelect: (s: SessionItem) => void
  onUpdateStatus: (id: string, status: string) => void
}) {
  if (days.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
        <Calendar className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Belum ada sesi. Buat sesi pertama Anda.
      </div>
    )
  }
  const todayKey = new Date().toISOString().slice(0, 10)
  return (
    <div className="space-y-4">
      {days.map((d) => {
        const isToday = d.dayKey === todayKey
        const isPast = new Date(d.date).getTime() < new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()
        const offlineCount = d.sessions.filter((s) => s.mode === 'offline').length
        const onlineCount = d.sessions.filter((s) => s.mode === 'online').length
        return (
          <Card key={d.dayKey} className={`border-border/60 ${isToday ? 'border-primary/40 ring-1 ring-primary/15' : ''}`}>
            <CardContent className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    {isToday && <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary"><Play className="h-3 w-3" /> HARI INI</Badge>}
                    <h3 className="text-sm font-semibold">
                      {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    {isPast && <Badge variant="outline" className="text-muted-foreground">Lampau</Badge>}
                  </div>
                  {d.topicOfDay && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" /> {d.topicOfDay}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline" className="gap-1"><Building2 className="h-3 w-3" /> {offlineCount} offline</Badge>
                  <Badge variant="outline" className="gap-1"><Video className="h-3 w-3" /> {onlineCount} online</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {d.sessions.map((s) => {
                  const st = STATUS_STYLE[s.status] || STATUS_STYLE.scheduled
                  const fmtTime = (d: string) => new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  const ModeIcon = s.mode === 'online' ? Video : Building2
                  const isSelected = s.id === selectedId
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelect(s)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all hover:border-primary/40 hover:shadow-sm ${
                        isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border/60'
                      }`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <ModeIcon className={`h-3.5 w-3.5 ${s.mode === 'online' ? 'text-purple-600 dark:text-purple-400' : 'text-primary'}`} />
                          <span className="text-xs font-medium">{formatSessionCardTitle(s.mode)}</span>
                        </div>
                        <Badge variant="outline" className={`h-5 gap-1 px-1 text-[10px] ${st.cls}`}><st.icon className="h-2.5 w-2.5" />{st.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Clock className="h-3 w-3" /> {fmtTime(s.startTime)}–{fmtTime(s.endTime)}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                        {s.teacher && <span>{s.teacher}</span>}
                        {s.platform && <span>· {s.platform}</span>}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" /> {s._count?.attendances ?? 0}/{s.maxAttendees}
                        </span>
                        <div onClick={(e) => e.stopPropagation()}>
                          {s.status === 'scheduled' && (
                            <Button size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[10px]" onClick={() => onUpdateStatus(s.id, 'active')}>
                              <Play className="h-2.5 w-2.5" /> Buka
                            </Button>
                          )}
                          {s.status === 'active' && (
                            <Button size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[10px]" onClick={() => onUpdateStatus(s.id, 'completed')}>
                              <CheckCircle2 className="h-2.5 w-2.5" /> Selesai
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CreateSessionDialog({
  open, onOpenChange, onCreated, days,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
  days: DayGroup[]
}) {
  const [loading, setLoading] = useState(false)
  const todayKey = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    date: todayKey,
    startTime: '10:00',
    endTime: '11:30',
    mode: 'offline' as 'offline' | 'online',
    platform: 'Office',
    room: '',
    teacher: '',
    topicOfDay: '',
    notes: '',
    maxAttendees: 10,
  })

  useEffect(() => {
    if (open) {
      // Pre-fill topicOfDay from an existing session on the same date if any
      const sameDay = days.find((d) => d.dayKey === form.date)
      setForm((f) => ({ ...f, topicOfDay: sameDay?.topicOfDay || '', platform: f.mode === 'offline' ? 'Office' : 'Google Meet' }))
    }
  }, [open])

  useEffect(() => {
    // When mode changes, adjust default platform
    setForm((f) => ({ ...f, platform: f.mode === 'offline' ? 'Office' : f.platform || 'Google Meet' }))
  }, [form.mode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date || !form.startTime || !form.endTime) {
      toast.error('Lengkapi tanggal & jam')
      return
    }
    setLoading(true)
    try {
      const start = new Date(`${form.date}T${form.startTime}`)
      const end = new Date(`${form.date}T${form.endTime}`)
      const rep = await apiGet<{ course: { id: string } }>('/api/reports/course')
      await apiPost('/api/sessions', {
        courseId: rep.course.id,
        date: start.toISOString(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        mode: form.mode,
        platform: form.platform,
        room: form.room,
        teacher: form.teacher,
        topicOfDay: form.topicOfDay,
        notes: form.notes,
        maxAttendees: form.maxAttendees,
      })
      toast.success('Sesi berhasil dibuat')
      onOpenChange(false)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat sesi')
    } finally {
      setLoading(false)
    }
  }

  const platformOptions = form.mode === 'offline'
    ? ['Office', 'Kantor Pusat', 'Cabang']
    : ['Google Meet', 'Discord', 'Zoom', 'Microsoft Teams']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Buat Sesi Baru</DialogTitle>
          <DialogDescription>Tambah satu sesi (offline/online) untuk satu hari. Materi (topicOfDay) akan otomatis sama untuk semua sesi di hari yang sama.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant={form.mode === 'offline' ? 'default' : 'outline'} onClick={() => setForm({ ...form, mode: 'offline' })} className="gap-1.5">
              <Building2 className="h-4 w-4" /> Offline
            </Button>
            <Button type="button" size="sm" variant={form.mode === 'online' ? 'default' : 'outline'} onClick={() => setForm({ ...form, mode: 'online' })} className="gap-1.5">
              <Video className="h-4 w-4" /> Online
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pengajar</Label>
              <Input value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="Mis. Mr Dimas" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Jam Mulai</Label>
              <Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Jam Selesai</Label>
              <Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{form.mode === 'online' ? 'Platform' : 'Tempat'}</Label>
            <div className="flex flex-wrap gap-1.5">
              {platformOptions.map((p) => (
                <Button key={p} type="button" size="sm" variant={form.platform === p ? 'default' : 'outline'} onClick={() => setForm({ ...form, platform: p })} className="h-8">
                  {p}
                </Button>
              ))}
            </div>
            <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder={form.mode === 'online' ? 'Link meeting (opsional)' : 'Nama ruangan (opsional)'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Maks Peserta (maxAttendees)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.maxAttendees}
                onChange={(e) => setForm({ ...form, maxAttendees: Math.max(1, Math.min(100, Number(e.target.value))) })}
              />
              <p className="text-[10px] text-muted-foreground">1–100 peserta per sesi</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Materi Hari Ini (topicOfDay) — sama untuk semua sesi hari ini</Label>
            <Input value={form.topicOfDay} onChange={(e) => setForm({ ...form, topicOfDay: e.target.value })} placeholder="Mis. Speaking: Read Aloud" />
            {(() => {
              const sameDay = days.find((d) => d.dayKey === form.date)
              if (sameDay?.topicOfDay) {
                return (
                  <p className="rounded bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    Hari ini sudah ada materi: <strong>{sameDay.topicOfDay}</strong> — biarkan kosong untuk pakai materi yang sama.
                  </p>
                )
              }
              return null
            })()}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">Catatan (opsional)</Label>
            <Textarea id="notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Buat Sesi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
