'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck, Users, Calendar, UserCheck, BarChart3, Layers, Plus, RefreshCw, Loader2, Play, CheckCircle2, AlertCircle, Clock, MapPin, Building2, Video, Sparkles, MailCheck, BookOpen, Edit3, Trash2,
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
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api-client'
import { StudentsManage } from './students-manage'
import { StaffManage } from './staff-manage'
import { AttendeesView } from './attendees-view'
import { BulkSessionDialog } from './bulk-session-dialog'
import { ReportsView } from './reports-view'
import { ExtensionRequests } from './extension-requests'
import { CoursesManage } from './courses-manage'
import { toast } from 'sonner'

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

export function AdminDashboard() {
  const [tab, setTab] = useState('students')
  const [days, setDays] = useState<DayGroup[]>([])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(null)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [pendingExtCount, setPendingExtCount] = useState(0)
  const [editSessionOpen, setEditSessionOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<SessionItem | null>(null)
  const [editForm, setEditForm] = useState({
    title: '', startTime: '', endTime: '', mode: 'offline' as string,
    platform: '', room: '', teacher: '', topicOfDay: '', maxAttendees: 10, notes: '', status: '',
  })

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true)
    try {
      const res = await apiGet<{ sessions: SessionItem[]; days: DayGroup[] }>('/api/sessions')
      setDays(res.days)
      setSessions(res.sessions)
      if (!selectedSession && res.sessions[0]) {
        setSelectedSession(res.sessions[0])
      }
    } catch {
      toast.error('Gagal memuat sesi')
    } finally {
      setLoadingSessions(false)
    }
  }, [selectedSession])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Extension count auto update
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

  async function updateStatus(sessionId: string, status: string) {
    try {
      await apiPatch(`/api/sessions/${sessionId}/status`, { status })
      toast.success(`Sesi ${STATUS_STYLE[status]?.label}`)
      await loadSessions()
    } catch {
      toast.error('Gagal mengubah status sesi')
    }
  }

  function openEditSession(s: SessionItem) {
    setEditingSession(s)
    setEditForm({
      title: s.title,
      startTime: s.startTime,
      endTime: s.endTime,
      mode: s.mode,
      platform: s.platform || '',
      room: s.room || '',
      teacher: s.teacher || '',
      topicOfDay: s.topicOfDay || '',
      maxAttendees: s.maxAttendees,
      notes: s.notes || '',
      status: s.status,
    })
    setEditSessionOpen(true)
  }

  async function handleEditSessionSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSession) return
    try {
      await apiPatch(`/api/sessions/${editingSession.id}`, editForm)
      toast.success('Sesi berhasil diperbarui')
      setEditSessionOpen(false)
      setEditingSession(null)
      await loadSessions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui sesi')
    }
  }

  async function handleDeleteSession(sessionId: string, title: string) {
    if (!confirm(`Yakin ingin menghapus "${title}"?\nSemua data absensi sesi ini juga akan dihapus.`)) return
    try {
      await apiDelete(`/api/sessions/${sessionId}`)
      toast.success('Sesi berhasil dihapus')
      if (selectedSession?.id === sessionId) setSelectedSession(null)
      await loadSessions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menghapus sesi')
    }
  }

  return (
    <div className="animate-fade-in mx-auto max-w-7xl px-4 py-6">
      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-gradient-to-r from-primary/10 via-blue-500/10 to-transparent p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground gap-1 px-2.5 py-0.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Panel Administrator
            </Badge>
          </div>
          <h1 className="mt-2 text-xl font-bold sm:text-2xl">Pusat Kendali Admin</h1>
          <p className="text-sm text-muted-foreground">
            Kelola data siswa & kuota, unggah/ganti jadwal sesi mingguan, kelola staf & pengajar, dan lihat peserta per sesi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 bg-background shadow-sm">
            <Plus className="h-4 w-4 text-primary" />
            Tambah 1 Sesi
          </Button>
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5 bg-background shadow-sm">
            <Layers className="h-4 w-4 text-primary" />
            Unggah / Ganti Jadwal Mingguan
          </Button>
          <Button variant="outline" size="sm" onClick={loadSessions} disabled={loadingSessions} className="gap-1.5 bg-background shadow-sm">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingSessions ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Admin Multi-Tab Navigation */}
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-6 max-md:h-[110px]">
          <TabsTrigger value="students" className="gap-1.5 font-medium">
            <Users className="h-4 w-4" /> Kelola Siswa
          </TabsTrigger>
          <TabsTrigger value="courses" className="gap-1.5 font-medium">
            <BookOpen className="h-4 w-4" /> Kelola Kursus
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5 font-medium">
            <Calendar className="h-4 w-4" /> Kelola Sesi
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-1.5 font-medium">
            <UserCheck className="h-4 w-4" /> Pengajar & Admin
          </TabsTrigger>
          <TabsTrigger value="attendees" className="gap-1.5 font-medium">
            <BarChart3 className="h-4 w-4" /> Lihat Peserta per Sesi
          </TabsTrigger>
          <TabsTrigger value="extensions" className="gap-1.5 font-medium relative">
            <MailCheck className="h-4 w-4" /> Permintaan Kuota
            {pendingExtCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
                {pendingExtCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Kelola Siswa */}
        <TabsContent value="students" className="animate-fade-in space-y-4">
          <StudentsManage />
        </TabsContent>

        {/* Tab 2: Kelola Kursus */}
        <TabsContent value="courses" className="animate-fade-in space-y-4">
          <CoursesManage />
        </TabsContent>

        {/* Tab 3: Kelola Sesi */}
        <TabsContent value="sessions" className="animate-fade-in space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Manajemen Jadwal Sesi Kelas</h2>
              <p className="text-sm text-muted-foreground">
                Unggah file Excel mingguan (Senin-Jumat) untuk mengganti seluruh sesi atau kelola sesi individual.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="h-4 w-4" /> Tambah 1 Sesi
              </Button>
              <Button size="sm" onClick={() => setBulkOpen(true)} className="gap-1.5">
                <Layers className="h-4 w-4" /> Unggah Excel Jadwal Mingguan
              </Button>
            </div>
          </div>

          {loadingSessions ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : days.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
              <Calendar className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Belum ada sesi terjadwal. Klik tombol &quot;Unggah Excel Jadwal Mingguan&quot; di atas.
            </div>
          ) : (
            <div className="space-y-4">
              {days.map((d) => (
                <Card key={d.dayKey} className="border-border/60">
                  <CardContent className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                        {d.topicOfDay && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-primary" /> {d.topicOfDay}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {d.sessionCount} Sesi Terjadwal
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {d.sessions.map((s) => {
                        const st = STATUS_STYLE[s.status] || STATUS_STYLE.scheduled
                        const fmtTime = (dt: string) => new Date(dt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        const ModeIcon = s.mode === 'online' ? Video : Building2
                        return (
                          <div
                            key={s.id}
                            className="rounded-xl border border-border/60 p-3 hover:border-primary/40 transition-colors"
                          >
                            <div className="mb-1 flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <ModeIcon className={`h-3.5 w-3.5 ${s.mode === 'online' ? 'text-purple-600 dark:text-purple-400' : 'text-primary'}`} />
                                <span className="text-xs font-semibold">{s.title}</span>
                              </div>
                              <Badge variant="outline" className={`h-5 gap-1 px-1 text-[10px] ${st.cls}`}>
                                <st.icon className="h-2.5 w-2.5" />{st.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" /> {fmtTime(s.startTime)}–{fmtTime(s.endTime)}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                              {s.teacher && <span>Pengajar: {s.teacher}</span>}
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2">
                              <span className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                                <Users className="h-3.5 w-3.5 text-primary" /> Peserta: {s._count?.attendances ?? 0} / {s.maxAttendees}
                              </span>
                              <div className="flex gap-1">
                                {s.status === 'scheduled' && (
                                  <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px]" onClick={() => updateStatus(s.id, 'active')}>
                                    Buka Sesi
                                  </Button>
                                )}
                                {s.status === 'active' && (
                                  <Button size="sm" variant="default" className="h-6 px-1.5 text-[10px]" onClick={() => updateStatus(s.id, 'completed')}>
                                    Tutup Sesi
                                  </Button>
                                )}
                                <Button size="sm" variant="ghost" className="h-6 w-6 px-0 text-muted-foreground hover:text-primary" onClick={() => openEditSession(s)}>
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 px-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteSession(s.id, s.title)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Kelola Pengajar & Admin */}
        <TabsContent value="staff" className="animate-fade-in space-y-4">
          <StaffManage />
        </TabsContent>

        {/* Tab 4: Lihat Peserta per Sesi */}
        <TabsContent value="attendees" className="animate-fade-in space-y-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">Monitor Peserta per Sesi</h2>
                <p className="text-sm text-muted-foreground">
                  Pilih sesi kelas untuk melihat daftar nama siswa yang telah booking dan status kuota terisi.
                </p>
              </div>
            </div>

            {/* Session Selector */}
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pilih Sesi Kelas
              </label>
              <select
                value={selectedSession?.id || ''}
                onChange={(e) => {
                  const s = sessions.find((item) => item.id === e.target.value)
                  if (s) setSelectedSession(s)
                }}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sessions.length === 0 && <option value="">Tidak ada sesi tersedia</option>}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.startTime).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} — {s.title} ({s.teacher || 'Tanpa Pengajar'}) — Kapasitas: {s._count?.attendances ?? 0}/{s.maxAttendees}
                  </option>
                ))}
              </select>
            </div>

            {selectedSession ? (
              <div className="space-y-4">
                {/* Capacity Counter */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
                      {selectedSession._count?.attendances ?? 0}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Peserta Terdaftar</p>
                      <p className="text-sm font-bold">
                        {selectedSession._count?.attendances ?? 0} / {selectedSession.maxAttendees} kursi terisi
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-background text-xs px-3 py-1 font-medium">
                    Sisa Slot: {Math.max(0, selectedSession.maxAttendees - (selectedSession._count?.attendances ?? 0))} Kursi
                  </Badge>
                </div>

                <AttendeesView sessionId={selectedSession.id} />
              </div>
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Pilih sesi kelas terlebih dahulu untuk melihat daftar peserta.
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 5: Permintaan Kuota */}
        <TabsContent value="extensions" className="animate-fade-in space-y-4">
          <ExtensionRequests />
        </TabsContent>
      </Tabs>

      <CreateSessionDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={loadSessions} days={days} />
      <BulkSessionDialog open={bulkOpen} onOpenChange={setBulkOpen} onCreated={loadSessions} />

      {/* Session Edit Dialog */}
      <Dialog open={editSessionOpen} onOpenChange={setEditSessionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" /> Edit Sesi
            </DialogTitle>
            <DialogDescription>
              Ubah data sesi {editingSession?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSessionSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Judul Sesi</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mode</Label>
                <select value={editForm.mode} onChange={(e) => setEditForm({ ...editForm, mode: e.target.value })} className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Maks Peserta</Label>
                <Input type="number" min={1} max={100} value={editForm.maxAttendees} onChange={(e) => setEditForm({ ...editForm, maxAttendees: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Pengajar</Label>
                <Input value={editForm.teacher} onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ruang / Platform</Label>
                <Input value={editForm.platform} onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Materi (topicOfDay)</Label>
              <Input value={editForm.topicOfDay} onChange={(e) => setEditForm({ ...editForm, topicOfDay: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSessionOpen(false)}>Batal</Button>
              <Button type="submit" className="gap-1.5">
                <Edit3 className="h-4 w-4" /> Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
    if (!open) return
    const sameDay = days.find((d) => d.dayKey === form.date)
    setForm((f) => ({
      ...f,
      topicOfDay: sameDay?.topicOfDay || '',
      platform: f.mode === 'offline' ? 'Office' : 'Google Meet',
    }))
  }, [open, days, form.date])

  useEffect(() => {
    if (!open) return
    setForm((f) => ({
      ...f,
      platform: f.mode === 'offline' ? 'Office' : f.platform || 'Google Meet',
    }))
  }, [form.mode, open])

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membuat sesi')
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
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Tambah 1 Sesi
          </DialogTitle>
          <DialogDescription>
            Tambah satu sesi baru (offline/online) untuk tanggal tertentu.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
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
              <Label className="text-xs">Maks Peserta</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.maxAttendees}
                onChange={(e) => setForm({ ...form, maxAttendees: Math.max(1, Math.min(100, Number(e.target.value))) })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Materi Hari Ini</Label>
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
