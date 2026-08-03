'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Users,
  ShieldCheck,
  MoveDown,
  X,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { apiGet, apiPost, apiDelete } from '@/lib/api-client'
import { toast } from 'sonner'
import type { AttendanceStatus } from '@/lib/types'

interface Attendee {
  studentId: string
  studentCode: string
  name: string
  email: string | null
  phone: string | null
  attendance: {
    id: string
    status: AttendanceStatus
    checkInTime: string
    qrVerified: boolean
    verified: boolean
    notes: string | null
  } | null
}

interface SessionOption {
  id: string
  title: string
  sessionNumber: number
  date: string
  startTime: string
  endTime: string
  status: string
}

interface AttendeesViewProps {
  sessionId: string
}

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  present: { label: 'Hadir', cls: 'bg-primary/10 text-primary border-primary/30', icon: CheckCircle2 },
  late: { label: 'Terlambat', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300', icon: Clock },
  absent: { label: 'Absen', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  excused: { label: 'Izin', cls: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300', icon: ShieldCheck },
}

const QUICK_REASONS = ['Sakit', 'Urusan keluarga', 'Ujian sekolah', 'Acara sekolah', 'Lainnya']

export function AttendeesView({ sessionId }: AttendeesViewProps) {
  const [data, setData] = useState<{ attendees: Attendee[]; session: { title: string; sessionNumber: number; status: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'all' | 'attended'>('all')

  // Izin dialog state
  const [izinOpen, setIzinOpen] = useState(false)
  const [izinStudent, setIzinStudent] = useState<Attendee | null>(null)
  const [izinNote, setIzinNote] = useState('')
  const [izinSubmitting, setIzinSubmitting] = useState(false)

  // Move student dialog state
  const [moveOpen, setMoveOpen] = useState(false)
  const [moveStudent, setMoveStudent] = useState<Attendee | null>(null)
  const [targetSessions, setTargetSessions] = useState<SessionOption[]>([])
  const [selectedTargetSession, setSelectedTargetSession] = useState<string | null>(null)
  const [moveSubmitting, setMoveSubmitting] = useState(false)

  // Kick student confirmation state
  const [kickOpen, setKickOpen] = useState(false)
  const [kickStudent, setKickStudent] = useState<Attendee | null>(null)
  const [kickSubmitting, setKickSubmitting] = useState(false)

  // Manual add attendance state
  const [addOpen, setAddOpen] = useState(false)
  const [addStudentCode, setAddStudentCode] = useState('')
  const [addStatus, setAddStatus] = useState<'present' | 'late'>('present')
  const [addNote, setAddNote] = useState('')
  const [addSubmitting, setAddSubmitting] = useState(false)

  const loadAttendees = useCallback(() => {
    let active = true
    setLoading(true)
    apiGet<{ attendees: Attendee[]; session: { title: string; sessionNumber: number; status: string } }>(`/api/sessions/${sessionId}/attendees`)
      .then((d) => { if (active) setData(d) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sessionId])

  const loadTargetSessions = useCallback(async () => {
    try {
      // Fetch all sessions to populate the dropdown (excluding current session)
      const res = await apiGet<{ sessions: any[]; days: any[] }>('/api/sessions')
      // Filter out the current session and only show scheduled/active sessions
      const filtered = res.sessions
        .filter((s: any) => s.id !== sessionId && (s.status === 'scheduled' || s.status === 'active'))
        .map((s: any) => ({
          id: s.id,
          title: s.title,
          sessionNumber: s.sessionNumber,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          status: s.status
        }))
      setTargetSessions(filtered)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      toast.error('Gagal memuat daftar sesi')
    }
  }, [sessionId])

  useEffect(() => {
    const cleanup = loadAttendees()
    return cleanup
  }, [loadAttendees])

  function openIzinDialog(student: Attendee) {
    setIzinStudent(student)
    setIzinNote('')
    setIzinOpen(true)
  }

  async function submitIzin() {
    if (!izinStudent) return
    setIzinSubmitting(true)
    try {
      await apiPost(`/api/sessions/${sessionId}/excused`, {
        studentId: izinStudent.studentId,
        note: izinNote || undefined,
      })
      toast.success(`${izinStudent.name} berhasil diizinkan`)
      setIzinOpen(false)
      setIzinStudent(null)
      setIzinNote('')
      // Refresh attendees
      loadAttendees()
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } }
      toast.error(e.body?.error || 'Gagal mengizinkan siswa')
    } finally {
      setIzinSubmitting(false)
    }
  }

  function openMoveDialog(student: Attendee) {
    setMoveStudent(student)
    setSelectedTargetSession(null)
    loadTargetSessions()
    setMoveOpen(true)
  }

  async function handleMoveStudent() {
    if (!moveStudent || !selectedTargetSession) return
    setMoveSubmitting(true)
    try {
      await apiPost(`/api/sessions/${sessionId}/attendance-mgmt/move`, {
        targetSessionId: selectedTargetSession,
        studentId: moveStudent.studentId
      })
      toast.success(`${moveStudent.name} telah dipindahkan ke sesi lain`)
      setMoveOpen(false)
      setMoveStudent(null)
      setSelectedTargetSession(null)
      // Refresh attendees
      loadAttendees()
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } }
      toast.error(e.body?.error || 'Gagal memindahkan siswa')
    } finally {
      setMoveSubmitting(false)
    }
  }

  function openKickDialog(student: Attendee) {
    setKickStudent(student)
    setKickOpen(true)
  }

  async function handleKickStudent() {
    if (!kickStudent) return
    setKickSubmitting(true)
    try {
      await apiDelete(`/api/sessions/${sessionId}/attendance-mgmt/remove?studentId=${kickStudent.studentId}`)
      toast.success(`${kickStudent.name} telah dikeluarkan dari sesi`)
      setKickOpen(false)
      setKickStudent(null)
      // Refresh attendees
      loadAttendees()
    } catch (err: unknown) {
      const e = err as { body?: { error?: string } }
      toast.error(e.body?.error || 'Gagal mengeluarkan siswa')
    } finally {
      setKickSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }
  if (!data) return <div className="text-sm text-muted-foreground">Gagal memuat data.</div>

  const filtered = data.attendees.filter((a) => {
    const matchesQuery =
      a.name.toLowerCase().includes(query.toLowerCase()) ||
      a.studentCode.toLowerCase().includes(query.toLowerCase())

    const matchesViewMode =
      viewMode === 'all'
        ? true
        : Boolean(a.attendance && (a.attendance.status === 'present' || a.attendance.status === 'late'))

    return matchesQuery && matchesViewMode
  })
  const present = data.attendees.filter((a) => a.attendance?.status === 'present').length
  const late = data.attendees.filter((a) => a.attendance?.status === 'late').length
  const absent = data.attendees.filter((a) => !a.attendance || a.attendance.status === 'absent').length
  const excused = data.attendees.filter((a) => a.attendance?.status === 'excused').length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="Hadir" value={present} cls="text-primary" icon={CheckCircle2} />
        <MiniStat label="Terlambat" value={late} cls="text-amber-600" icon={Clock} />
        <MiniStat label="Absen" value={absent} cls="text-destructive" icon={XCircle} />
        <MiniStat label="Izin" value={excused} cls="text-purple-600" icon={ShieldCheck} />
      </div>

      {/* Search */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari siswa…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Mode tampilan</span>
          <div className="flex items-center rounded-lg border border-border/60 bg-card p-1">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              className="h-8 px-3 text-xs"
              onClick={() => setViewMode('all')}
            >
              Semua siswa
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'attended' ? 'default' : 'ghost'}
              className="h-8 px-3 text-xs"
              onClick={() => setViewMode('attended')}
            >
              Sudah hadir
            </Button>
          </div>
        </div>
        <Button size="sm" onClick={() => { setAddStudentCode(''); setAddStatus('present'); setAddNote(''); setAddOpen(true) }} className="gap-1.5 shrink-0">
          <Plus className="h-3.5 w-3.5" /> Tambah
        </Button>
      </div>

      {/* List */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            Kehadiran Siswa ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-112 divide-y divide-border/40 overflow-y-auto scrollbar-thin">
            {filtered.map((a) => {
              const status = a.attendance?.status || 'absent'
              const st = STATUS_STYLE[status] || STATUS_STYLE.absent
              const Icon = st.icon
              const canMarkIzin = !a.attendance || a.attendance.status === 'absent'
              return (
                <div key={a.studentId} className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {a.studentCode.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{a.studentCode}</span>
{a.attendance ? (
                        <>
                          <span>·</span>
                          <span>{new Date(a.attendance.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      ) : (
                        <span>· belum absen</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Action buttons */}
                    <div className="flex gap-1">
                      {/* Move to another session */}
                      {a.attendance && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                          onClick={() => openMoveDialog(a)}
                        >
                          <MoveDown className="h-3 w-3" />
                          <span className="hidden sm:inline">Pindah</span>
                        </Button>
                      )}
                      {/* Kick from session */}
                      {a.attendance && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                          onClick={() => openKickDialog(a)}
                        >
                          <X className="h-3 w-3" />
                          <span className="hidden sm:inline">Keluarkan</span>
                        </Button>
                      )}
                      {/* Izin button */}
                      {canMarkIzin && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950/30 dark:text-purple-300 dark:hover:bg-purple-950/50"
                          onClick={() => openIzinDialog(a)}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          <span className="hidden sm:inline">Izin</span>
                        </Button>
                      )}
                    </div>
                    <Badge variant="outline" className={`gap-1 border ${st.cls}`}>
                      <Icon className="h-3 w-3" />
                      {st.label}
                    </Badge>
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada siswa ditemukan</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Izin Dialog */}
      <Dialog open={izinOpen} onOpenChange={setIzinOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              Izinkan Siswa
            </DialogTitle>
            <DialogDescription>
              Tandai ketidakhadiran {izinStudent?.name} sebagai izin. Izin <strong>tidak mengurangi kuota</strong> siswa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {izinStudent?.studentCode.slice(-3)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{izinStudent?.name}</div>
                  <div className="text-xs text-muted-foreground">{izinStudent?.studentCode}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Alasan</Label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setIzinNote(reason === 'Lainnya' ? '' : reason)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                      izinNote === reason
                        ? 'border-purple-400 bg-purple-100 text-purple-700 dark:border-purple-600 dark:bg-purple-950/50 dark:text-purple-300'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Ketik alasan izin (opsional)..."
                value={izinNote}
                onChange={(e) => setIzinNote(e.target.value)}
                className="min-h-15 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIzinOpen(false)} disabled={izinSubmitting}>
              Batal
            </Button>
            <Button
              onClick={submitIzin}
              disabled={izinSubmitting}
              className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            >
              {izinSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Izinkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Student Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveDown className="h-5 w-5 text-blue-600" />
              Pindahkan Siswa
            </DialogTitle>
            <DialogDescription>
              Pindahkan {moveStudent?.name} ke sesi berikutnya:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {moveStudent?.studentCode.slice(-3)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{moveStudent?.name}</div>
                  <div className="text-xs text-muted-foreground">{moveStudent?.studentCode}</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Sesi Tujuan</Label>
              <Select value={selectedTargetSession ?? ''} onValueChange={setSelectedTargetSession}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih sesi tujuan..." />
                </SelectTrigger>
                <SelectContent>
                  {targetSessions.length > 0 ? (
                    <>
                      <SelectItem value="placeholder" disabled>
                        Pilih sesi tujuan...
                      </SelectItem>
                      {targetSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          Sesi {session.sessionNumber}: {session.title} ({new Date(session.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })})
                        </SelectItem>
                      ))}
                    </>
                  ) : (
                    <SelectItem value="empty" disabled>
                      Tidak ada sesi lain yang tersedia
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {targetSessions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Tidak ada sesi lain yang tersedia untuk pemindahan.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setMoveOpen(false)} disabled={moveSubmitting}>
              Batal
            </Button>
            <Button
              onClick={handleMoveStudent}
              disabled={moveSubmitting || !selectedTargetSession}
              className="ml-2 gap-1.5 bg-blue-600 hover:bg-blue-700"
            >
              {moveSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoveDown className="h-4 w-4" />
              )}
              Pindahkan Siswa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kick Student Confirmation Dialog */}
      <Dialog open={kickOpen} onOpenChange={setKickOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-600" />
              Keluarkan Siswa
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengeluarkan {kickStudent?.name} dari sesi ini?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {kickStudent?.studentCode.slice(-3)}
                </div>
                <div>
                  <div className="text-sm font-semibold">{kickStudent?.name}</div>
                  <div className="text-xs text-muted-foreground">{kickStudent?.studentCode}</div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setKickOpen(false)} disabled={kickSubmitting}>
              Batal
            </Button>
            <Button
              onClick={handleKickStudent}
              disabled={kickSubmitting}
              className="ml-2 bg-red-600 hover:bg-red-700"
            >
              {kickSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Keluarkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tambah Kehadiran Manual Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Tambah Kehadiran Manual
            </DialogTitle>
            <DialogDescription>
              Catat kehadiran siswa secara manual untuk sesi ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm">Kode Siswa</Label>
              <Input
                value={addStudentCode}
                onChange={(e) => setAddStudentCode(e.target.value.toUpperCase())}
                placeholder="Masukkan kode siswa (mis: PTE001)"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Status Kehadiran</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={addStatus === 'present' ? 'default' : 'outline'}
                  onClick={() => setAddStatus('present')}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Hadir
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={addStatus === 'late' ? 'default' : 'outline'}
                  onClick={() => setAddStatus('late')}
                  className="gap-1.5"
                >
                  <Clock className="h-4 w-4" /> Terlambat
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Catatan (opsional)</Label>
              <Textarea
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
                placeholder="Mis: Absen manual oleh admin"
                className="min-h-15 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSubmitting}>
              Batal
            </Button>
            <Button
              onClick={async () => {
                if (!addStudentCode) { toast.error('Masukkan kode siswa'); return }
                setAddSubmitting(true)
                try {
                  await apiPost(`/api/sessions/${sessionId}/attendance-mgmt/add`, {
                    studentCode: addStudentCode,
                    status: addStatus,
                    note: addNote || undefined,
                  })
                  toast.success('Kehadiran berhasil dicatat')
                  setAddOpen(false)
                  setAddStudentCode('')
                  setAddNote('')
                  loadAttendees()
                } catch (err: unknown) {
                  const e = err as { body?: { error?: string } }
                  toast.error(e.body?.error || 'Gagal mencatat kehadiran')
                } finally {
                  setAddSubmitting(false)
                }
              }}
              disabled={addSubmitting || !addStudentCode}
              className="gap-1.5"
            >
              {addSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Catat Kehadiran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MiniStat({ label, value, cls, icon: Icon }: { label: string; value: number; cls: string; icon: typeof CheckCircle2 }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
      <Icon className={`mx-auto mb-1 h-4 w-4 ${cls}`} />
      <div className={`text-xl font-bold ${cls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}