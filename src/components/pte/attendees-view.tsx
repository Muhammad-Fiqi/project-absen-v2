'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, Clock, XCircle, QrCode, Search, Users, ShieldCheck } from 'lucide-react'
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
import { apiGet, apiPost } from '@/lib/api-client'
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

  // Izin dialog state
  const [izinOpen, setIzinOpen] = useState(false)
  const [izinStudent, setIzinStudent] = useState<Attendee | null>(null)
  const [izinNote, setIzinNote] = useState('')
  const [izinSubmitting, setIzinSubmitting] = useState(false)

  const loadAttendees = useCallback(() => {
    let active = true
    setLoading(true)
    apiGet<{ attendees: Attendee[]; session: { title: string; sessionNumber: number; status: string } }>(`/api/sessions/${sessionId}/attendees`)
      .then((d) => { if (active) setData(d) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
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

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    )
  }
  if (!data) return <div className="text-sm text-muted-foreground">Gagal memuat data.</div>

  const filtered = data.attendees.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()) ||
    a.studentCode.toLowerCase().includes(query.toLowerCase())
  )
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
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari siswa…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
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
          <div className="max-h-[28rem] divide-y divide-border/40 overflow-y-auto scrollbar-thin">
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
                          {a.attendance.qrVerified && <QrCode className="h-2.5 w-2.5 text-primary" />}
                        </>
                      ) : (
                        <span>· belum absen</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                className="min-h-[60px] resize-none"
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