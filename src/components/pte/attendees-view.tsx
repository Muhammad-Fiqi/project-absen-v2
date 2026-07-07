'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, Clock, XCircle, AlertTriangle, QrCode, KeyRound, MapPin, Camera, Fingerprint, Search, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { apiGet } from '@/lib/api-client'
import type { AttendanceStatus, AttendanceMethod } from '@/lib/types'

interface Attendee {
  studentId: string
  studentCode: string
  name: string
  email: string | null
  phone: string | null
  attendance: {
    id: string
    status: AttendanceStatus
    method: AttendanceMethod
    checkInTime: string
    verified: boolean
    factorsPassed: number
    factorsRequired: number
    geoVerified: boolean
    geoDistanceM: number | null
    pinVerified: boolean
    qrVerified: boolean
    selfieVerified: boolean
    flagged: boolean
    ipAddress: string | null
  } | null
}

interface AttendeesViewProps {
  sessionId: string
}

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  present: { label: 'Hadir', cls: 'bg-primary/10 text-primary border-primary/30', icon: CheckCircle2 },
  late: { label: 'Terlambat', cls: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300', icon: Clock },
  absent: { label: 'Absen', cls: 'bg-destructive/10 text-destructive border-destructive/30', icon: XCircle },
  excused: { label: 'Izin', cls: 'bg-muted text-muted-foreground border-border', icon: AlertTriangle },
}

export function AttendeesView({ sessionId }: AttendeesViewProps) {
  const [data, setData] = useState<{ attendees: Attendee[]; session: { title: string; sessionNumber: number; status: string } } | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    apiGet<{ attendees: Attendee[]; session: { title: string; sessionNumber: number; status: string } }>(`/api/sessions/${sessionId}/attendees`)
      .then((d) => { if (active) setData(d) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sessionId])

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
  const flagged = data.attendees.filter((a) => a.attendance?.flagged).length

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        <MiniStat label="Hadir" value={present} cls="text-primary" icon={CheckCircle2} />
        <MiniStat label="Terlambat" value={late} cls="text-amber-600" icon={Clock} />
        <MiniStat label="Absen" value={absent} cls="text-destructive" icon={XCircle} />
        <MiniStat label="Ditandai" value={flagged} cls="text-amber-600" icon={AlertTriangle} />
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
              const st = a.attendance ? STATUS_STYLE[a.attendance.status] : STATUS_STYLE.absent
              const Icon = st.icon
              return (
                <div key={a.studentId} className="flex items-center gap-3 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                    {a.studentCode.slice(-3)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{a.name}</span>
                      {a.attendance?.flagged && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{a.studentCode}</span>
                      {a.attendance ? (
                        <>
                          <span>·</span>
                          <span>{new Date(a.attendance.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="flex items-center gap-0.5">
                            {a.attendance.qrVerified && <QrCode className="h-2.5 w-2.5 text-primary" />}
                            {a.attendance.pinVerified && <KeyRound className="h-2.5 w-2.5 text-primary" />}
                            {a.attendance.geoVerified && <MapPin className="h-2.5 w-2.5 text-primary" />}
                            {a.attendance.selfieVerified && <Camera className="h-2.5 w-2.5 text-primary" />}
                          </span>
                          {a.attendance.geoDistanceM != null && (
                            <span className="text-muted-foreground/70">· {a.attendance.geoDistanceM}m</span>
                          )}
                        </>
                      ) : (
                        <span>· belum absen</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 gap-1 border ${st.cls}`}>
                    <Icon className="h-3 w-3" />
                    {st.label}
                  </Badge>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">Tidak ada siswa ditemukan</div>
            )}
          </div>
        </CardContent>
      </Card>
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
