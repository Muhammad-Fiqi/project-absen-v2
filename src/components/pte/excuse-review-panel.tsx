'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  RefreshCw,
  Loader2,
  X,
  Clock,
  Users,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { apiGet, apiDelete } from '@/lib/api-client'
import { toast } from 'sonner'

interface ExcuseItem {
  id: string
  studentId: string
  studentName: string
  studentCode: string
  dateKey: string
  reason: string | null
  createdAt: string
}

// YYYY-MM-DD key in LOCAL time (matches server-side dayKey()).
function todayKeyLocal(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function ExcuseReviewPanel() {
  const [items, setItems] = useState<ExcuseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(todayKeyLocal())
  const [cancelTarget, setCancelTarget] = useState<ExcuseItem | null>(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ date: string; items: ExcuseItem[] }>(`/api/student/excuses?date=${date}`)
      setItems(res.items)
    } catch {
      // Silent fail — keep existing data
    } finally {
      setLoading(false)
    }
  }, [date])

  useEffect(() => {
    load()
  }, [load])

  async function confirmCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await apiDelete(`/api/student/excuses/${cancelTarget.id}`)
      toast.success(`Izin ${cancelTarget.studentName} (${cancelTarget.studentCode}) dibatalkan`)
      setItems((prev) => prev.filter((i) => i.id !== cancelTarget.id))
      setCancelTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal membatalkan izin')
    } finally {
      setCancelling(false)
    }
  }

  const formattedDate = items.length > 0
    ? new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-purple-500" />
            Siswa yang Izin
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-background px-2 py-1">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="date"
                value={date}
                max={todayKeyLocal()}
                onChange={(e) => setDate(e.target.value || todayKeyLocal())}
                className="bg-transparent text-xs outline-none"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-7 gap-1 px-2 text-[10px]">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
        {formattedDate && (
          <p className="text-xs text-muted-foreground">{formattedDate}</p>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
            <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Tidak ada siswa yang izin pada tanggal ini.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-xl border border-purple-200/60 bg-purple-50/40 p-3 dark:border-purple-800/40 dark:bg-purple-950/20 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold">{r.studentName}</span>
                    <Badge variant="outline" className="gap-1 text-[10px] border-purple-300 bg-purple-100 text-purple-700 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                      <Users className="h-3 w-3" /> {r.studentCode}
                    </Badge>
                  </div>
                  {r.reason && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{r.reason}</p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground/70">
                    <Clock className="h-3 w-3" />
                    Diajukan {new Date(r.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="shrink-0 gap-1.5"
                  onClick={() => setCancelTarget(r)}
                >
                  <X className="h-3.5 w-3.5" /> Batalkan Izin
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => { if (!o && !cancelling) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Izin</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin membatalkan izin <strong>{cancelTarget?.studentName}</strong> ({cancelTarget?.studentCode})? Jika dibatalkan, hari tersebut akan dihitung terhadap kuota siswa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Tutup</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              onClick={(e) => {
                e.preventDefault()
                confirmCancel()
              }}
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Memproses...
                </>
              ) : (
                <>
                  <X className="h-3.5 w-3.5" /> Ya, Batalkan
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
