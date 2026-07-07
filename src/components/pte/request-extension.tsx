'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Gift, Loader2, Send, History, CheckCircle2, XCircle, Clock, AlertCircle,
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

interface RequestExtensionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Quota info to show context in dialog header */
  quota?: { used: number; total: number; remaining: number; exhausted: boolean }
  onSubmitted?: () => void
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

const STATUS_META: Record<
  ExtensionRequestRow['status'],
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
  denied: {
    label: 'Ditolak',
    icon: XCircle,
    cls: 'bg-destructive/10 text-destructive border-destructive/30',
  },
}

export function RequestExtension({ open, onOpenChange, quota, onSubmitted }: RequestExtensionProps) {
  const [requestedSessions, setRequestedSessions] = useState<number>(10)
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState<string>('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<ExtensionRequestRow[]>([])
  const [loadingList, setLoadingList] = useState(false)

  const loadRequests = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await apiGet<{ requests: ExtensionRequestRow[] }>('/api/extension-requests')
      setRequests(res.requests)
    } catch {
      // Silent — list is supplementary
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadRequests()
  }, [open, loadRequests])

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setRequestedSessions(10)
      setCustomMode(false)
      setCustomValue('')
      setReason('')
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const finalSessions = customMode ? Number(customValue) : requestedSessions
    if (!finalSessions || finalSessions < 1 || finalSessions > 50) {
      toast.error('Jumlah sesi harus 1–50')
      return
    }
    if (reason.trim().length < 5) {
      toast.error('Alasan minimal 5 karakter')
      return
    }
    setLoading(true)
    try {
      await apiPost('/api/extension-requests', {
        requestedSessions: finalSessions,
        reason: reason.trim(),
      })
      toast.success(`Permintaan perpanjangan ${finalSessions} sesi terkirim`)
      setReason('')
      setCustomMode(false)
      setCustomValue('')
      setRequestedSessions(10)
      await loadRequests()
      onSubmitted?.()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim permintaan')
    } finally {
      setLoading(false)
    }
  }

  const finalSessions = customMode ? Number(customValue) || 0 : requestedSessions

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground">
              <Gift className="h-4 w-4" />
            </div>
            Minta Perpanjangan Kuota
          </DialogTitle>
          <DialogDescription>
            Ajukan permintaan tambahan sesi ke pengajar. Pengajar akan meninjau dan menyetujui/menolak permintaan Anda.
            {quota && (
              <span className="mt-1 block">
                Kuota saat ini: <strong>{quota.used}/{quota.total}</strong> sesi terpakai · sisa{' '}
                <strong className={quota.exhausted ? 'text-destructive' : ''}>{quota.remaining}</strong>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Requested sessions */}
          <div className="space-y-2">
            <Label className="text-xs">Jumlah sesi yang diminta</Label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 20].map((n) => (
                <Button
                  key={n}
                  type="button"
                  size="sm"
                  variant={!customMode && requestedSessions === n ? 'default' : 'outline'}
                  onClick={() => {
                    setCustomMode(false)
                    setRequestedSessions(n)
                  }}
                  className="h-9 font-semibold"
                >
                  +{n}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={customMode ? 'default' : 'outline'}
                onClick={() => setCustomMode(true)}
                className="h-9 gap-1"
              >
                Custom
              </Button>
              {customMode && (
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="1–50"
                  className="h-9 w-32"
                  autoFocus
                />
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                Akan diminta: <strong className="text-foreground">{finalSessions || 0} sesi</strong>
              </span>
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-xs">
              Alasan permintaan <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mis. Saya ingin menambah sesi untuk persiapan ujian PTE bulan depan karena masih perlu banyak latihan speaking."
              maxLength={500}
            />
            <div className="flex items-center justify-between text-[11px]">
              <span className={reason.trim().length < 5 ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}>
                {reason.trim().length < 5 ? `Minimal 5 karakter (${reason.trim().length}/5)` : '✓ Alasan cukup'}
              </span>
              <span className="text-muted-foreground">{reason.length}/500</span>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5 text-primary" />
              Ringkasan
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sesi yang diminta</span>
              <span className="font-bold text-primary">+{finalSessions || 0} sesi</span>
            </div>
            {quota && (
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimasi kuota baru</span>
                <span className="font-medium">{quota.total + (finalSessions || 0)} sesi</span>
              </div>
            )}
            <p className="mt-2 text-[11px] text-muted-foreground">
              Permintaan akan ditinjau pengajar. Anda akan melihat status di bawah setelah dikirim.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || finalSessions < 1 || reason.trim().length < 5}
              className="gap-1.5 bg-gradient-to-r from-primary to-emerald-600 hover:opacity-90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim Permintaan
            </Button>
          </DialogFooter>
        </form>

        {/* Previous requests */}
        <div className="mt-2 border-t border-border/60 pt-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            Riwayat Permintaan Anda
          </h4>
          {loadingList ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
              Belum ada permintaan sebelumnya.
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
                            <span className="text-sm font-semibold">+{r.requestedSessions} sesi</span>
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
