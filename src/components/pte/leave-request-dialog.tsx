'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDays, Loader2, Send, History, CheckCircle2, XCircle, Clock, AlertCircle,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { apiGet, apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface LeaveRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
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

const STATUS_META: Record<
  LeaveRequestRow['status'],
  { label: string; icon: typeof Clock; cls: string }
> = {
  pending: {
    label: 'Menunggu',
    icon: Clock,
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300/40',
  },
  approved: {
    label: 'Disetujui',
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/40',
  },
  rejected: {
    label: 'Ditolak',
    icon: XCircle,
    cls: 'bg-destructive/10 text-destructive border-destructive/30',
  },
}

function dateInputValue(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function LeaveRequestDialog({ open, onOpenChange, onSubmitted }: LeaveRequestDialogProps) {
  const [reason, setReason] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<LeaveRequestRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const minStart = useCallback(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return dateInputValue(d)
  }, [])

  const loadRequests = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await apiGet<{ requests: LeaveRequestRow[] }>('/api/student/leave-requests')
      setRequests(res.requests)
    } catch {
      // Silent — list is supplementary
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadRequests()
      setStartDate(minStart())
      setEndDate('')
    }
  }, [open, loadRequests, minStart])

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setReason('')
      setStartDate('')
      setEndDate('')
    }
  }, [open])

  const startTooSoon = startDate ? startDate < minStart() : false
  const rangeInvalid = startDate && endDate && endDate < startDate

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (reason.trim().length < 10) {
      toast.error('Alasan cuti minimal 10 karakter')
      return
    }
    if (!startDate || startTooSoon) {
      toast.error('Cuti harus diajukan paling lambat 3 hari sebelum tanggal mulai')
      return
    }
    if (!endDate || rangeInvalid) {
      toast.error('Tanggal selesai cuti harus setelah tanggal mulai')
      return
    }
    setLoading(true)
    try {
      await apiPost('/api/student/leave-requests', {
        reason: reason.trim(),
        startDate,
        endDate,
      })
      toast.success('Pengajuan cuti kelas berhasil dikirim untuk ditinjau admin/tutor')
      setReason('')
      setStartDate('')
      setEndDate('')
      await loadRequests()
      onSubmitted?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengajukan cuti kelas')
    } finally {
      setLoading(false)
    }
  }

  const valid = reason.trim().length >= 10 && startDate && !startTooSoon && endDate && !rangeInvalid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </div>
            Ajukan Permintaan Cuti Kelas
          </DialogTitle>
          <DialogDescription>
            Cuti kelas mengecualikan kuota harian Anda selama periode cuti (beberapa hari). Pengajuan harus masuk{' '}
            <strong>paling lambat 3 hari sebelum</strong> tanggal mulai, dan harus disetujui admin/tutor.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="leave-reason" className="text-xs">
              Alasan cuti <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="leave-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mis. Saya harus mengikuti acara keluarga di luar kota dari tanggal 20–24 dan tidak dapat mengikuti kelas."
              maxLength={500}
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className={reason.trim().length < 10 ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}>
                {reason.trim().length < 10 ? `Minimal 10 karakter (${reason.trim().length}/10)` : '✓ Alasan cukup'}
              </span>
              <span className="text-muted-foreground">{reason.length}/500</span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leave-start" className="text-xs">Tanggal mulai cuti</Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                min={minStart()}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              {startTooSoon && (
                <p className="text-[10px] text-destructive">Minimal 3 hari sebelum tanggal mulai.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-end" className="text-xs">Tanggal selesai cuti</Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                min={startDate || minStart()}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
              {rangeInvalid && (
                <p className="text-[10px] text-destructive">Selesai harus setelah tanggal mulai.</p>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-primary" />
              Ringkasan
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Periode cuti</span>
              <span className="font-bold text-primary">
                {startDate && endDate ? `${startDate} s/d ${endDate}` : '—'}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Selama cuti disetujui, kuota harian Anda tidak akan berkurang. Hari cuti tidak dihitung sebagai penggunaan izin harian.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || !valid}
              className="gap-1.5 bg-gradient-to-r from-primary to-emerald-600 hover:opacity-90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim Pengajuan
            </Button>
          </DialogFooter>
        </form>

        {/* Previous requests */}
        <div className="mt-2 border-t border-border/60 pt-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            Riwayat Cuti Anda
          </h4>
          {loadingList ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
              Belum ada pengajuan cuti.
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin">
              {requests.map((r) => {
                const meta = STATUS_META[r.status]
                return (
                  <Card key={r.id} className="border-border/60 transition-colors hover:bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`gap-1 text-[10px] ${meta.cls}`}>
                              <meta.icon className="h-3 w-3" /> {meta.label}
                            </Badge>
                            <span className="text-xs font-semibold">{r.startDate} s/d {r.endDate}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{r.reason}</p>
                          <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground/80">
                            <span>{new Date(r.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            {r.reviewedAt && (
                              <span>· direview {new Date(r.reviewedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                            )}
                          </div>
                          {r.reviewNote && (
                            <p className="mt-1 rounded bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                              <strong>Catatan:</strong> {r.reviewNote}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
