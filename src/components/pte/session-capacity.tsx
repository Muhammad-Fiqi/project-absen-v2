'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { apiGet } from '@/lib/api-client'

interface CapacityInfo {
  session: {
    id: string
    title: string
    sessionNumber: number
    mode: string
    platform: string | null
    room: string | null
    teacher: string | null
    maxAttendees: number
    startTime: string
    endTime: string
    status: string
  }
  capacity: {
    max: number
    filled: number
    remaining: number
    isFull: boolean
    attendeeList: Array<{
      studentCode: string
      name: string
      status: string
      checkInTime: string
    }>
  }
  myStatus: {
    attended: boolean
    status?: string
    verified?: boolean
    checkInTime?: string
    canCheckIn?: boolean
    blockedReason?: string | null
  }
}

interface SessionCapacityProps {
  sessionId: string
  isOpen: boolean
}

export function SessionCapacity({ sessionId, isOpen }: SessionCapacityProps) {
  const [data, setData] = useState<CapacityInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCapacity = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<CapacityInfo>(`/api/sessions/${sessionId}/capacity`)
      setData(res)
    } catch {
      setError('Gagal memuat info kelas')
    } finally {
      setLoading(false)
    }
  }, [sessionId, isOpen])

  useEffect(() => {
    fetchCapacity()
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchCapacity, 15000)
    return () => clearInterval(interval)
  }, [fetchCapacity])

  if (!isOpen) return null

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Memuat info kelas...
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
        {error}
      </div>
    )
  }

  if (!data) return null

  const { capacity, myStatus } = data
  const pct = capacity.max > 0 ? Math.round((capacity.filled / capacity.max) * 100) : 0

  return (
    <div className="mt-2 space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
      {/* Capacity bar */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Kapasitas Kelas
        </span>
        <button
          onClick={fetchCapacity}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          <Loader2 className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          refresh
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          {capacity.filled} / {capacity.max} siswa
        </span>
        <Badge
          variant={capacity.isFull ? 'destructive' : 'outline'}
          className={`text-[10px] ${!capacity.isFull ? 'border-emerald-300/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : ''}`}
        >
          {capacity.isFull ? (
            <><XCircle className="mr-1 h-3 w-3" /> KELAS PENUH</>
          ) : (
            <><UserCheck className="mr-1 h-3 w-3" /> {capacity.remaining} slot tersisa</>
          )}
        </Badge>
      </div>

      <Progress
        value={pct}
        className={`h-2 ${capacity.isFull ? '[&>div]:bg-destructive' : pct >= 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
      />

      {/* Blocked reason for this student */}
      {myStatus.blockedReason && (
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{myStatus.blockedReason}</span>
        </div>
      )}

      {/* Attendee list */}
      {capacity.attendeeList.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">
            Sudah absen ({capacity.attendeeList.length}):
          </p>
          <div className="max-h-40 space-y-1 overflow-y-auto scrollbar-thin">
            {capacity.attendeeList.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-background/80 px-2.5 py-1.5 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="min-w-0 flex-1 font-medium">{a.name}</span>
                <span className="text-muted-foreground">{a.studentCode}</span>
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Clock className="h-2.5 w-2.5" />
                  {new Date(a.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
                {a.status === 'late' && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[9px] text-amber-600">
                    terlambat
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {capacity.attendeeList.length === 0 && !capacity.isFull && (
        <p className="text-center text-[11px] text-muted-foreground/70">
          <UserX className="mr-1 inline h-3 w-3" />
          Belum ada siswa yang absen di sesi ini
        </p>
      )}
    </div>
  )
}