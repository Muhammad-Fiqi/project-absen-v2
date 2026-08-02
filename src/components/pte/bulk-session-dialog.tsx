'use client'

import { useState, useEffect } from 'react'
import {
  Plus, Trash2, Layers, Loader2, Building2, Video, Clock, Sparkles, LayoutTemplate,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiGet, apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface SessionRow {
  id: string
  startTime: string
  endTime: string
  teacher: string
  platform: string
  room: string
}

const TEACHER_OPTIONS = ['Mr Dimas', 'Mr Faisal']
const ONLINE_PLATFORMS = ['Google Meet', 'Discord', 'Zoom']

function makeRow(overrides?: Partial<SessionRow>, id?: string): SessionRow {
  const rowId = overrides?.id || id || crypto.randomUUID()
  const cleanOverrides = { ...overrides }
  delete cleanOverrides.id
  return {
    id: rowId,
    startTime: '10:00',
    endTime: '11:30',
    teacher: 'Mr Dimas',
    platform: 'Google Meet',
    room: 'Office',
    ...cleanOverrides,
  }
}

function generateId() {
  return crypto.randomUUID()
}

const SPREADSHEET_TEMPLATE = {
  offline: [
    { startTime: '10:00', endTime: '11:30', teacher: 'Mr Dimas', platform: 'Office', room: 'Office' },
    { startTime: '11:30', endTime: '13:00', teacher: 'Mr Dimas', platform: 'Office', room: 'Office' },
    { startTime: '13:00', endTime: '14:30', teacher: 'Mr Faisal', platform: 'Office', room: 'Office' },
    { startTime: '14:30', endTime: '16:00', teacher: 'Mr Faisal', platform: 'Office', room: 'Office' },
  ] as const,
  online: [
    { startTime: '05:00', endTime: '06:00', teacher: 'Mr Dimas', platform: 'Google Meet', room: '' },
    { startTime: '07:00', endTime: '08:00', teacher: 'Mr Dimas', platform: 'Discord', room: '' },
    { startTime: '11:00', endTime: '12:00', teacher: 'Mr Dimas', platform: 'Discord', room: '' },
    { startTime: '14:00', endTime: '15:00', teacher: 'Mr Dimas', platform: 'Google Meet', room: '' },
    { startTime: '20:00', endTime: '21:00', teacher: 'Mr Dimas', platform: 'Google Meet', room: '' },
    { startTime: '20:00', endTime: '21:00', teacher: 'Mr Dimas', platform: 'Discord', room: '' },
  ] as const,
}

interface BulkSessionDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}

export function BulkSessionDialog({ open, onOpenChange, onCreated }: BulkSessionDialogProps) {
  const [loading, setLoading] = useState(false)
  const todayKey = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(todayKey)
  const [topicOfDay, setTopicOfDay] = useState('')
  const [maxAttendees, setMaxAttendees] = useState(10)
  const [offlineRows, setOfflineRows] = useState<SessionRow[]>([])
  const [onlineRows, setOnlineRows] = useState<SessionRow[]>([])

  // Initialize with one row each when opened
  useEffect(() => {
    if (open) {
      setOfflineRows([makeRow({ platform: 'Office', room: 'Office' })])
      setOnlineRows([makeRow({ platform: 'Google Meet', room: '' })])
    }
  }, [open])

  const offlineCount = offlineRows.length
  const onlineCount = onlineRows.length
  const totalCount = offlineCount + onlineCount

  // Load existing topicOfDay for the selected date
  const loadExistingTopic = async () => {
    if (!date) return
    try {
      const res = await apiGet<{ days: { dayKey: string; topicOfDay: string | null }[] }>('/api/sessions')
      const sameDay = res.days.find((d) => d.dayKey === date)
      if (sameDay?.topicOfDay && !topicOfDay) {
        setTopicOfDay(sameDay.topicOfDay)
      }
    } catch {
      // silent
    }
  }

  useEffect(() => {
    if (open && date) loadExistingTopic()
  }, [open, date])

  function applyTemplate() {
    setOfflineRows(SPREADSHEET_TEMPLATE.offline.map((r) => makeRow(r)))
    setOnlineRows(SPREADSHEET_TEMPLATE.online.map((r) => makeRow(r)))
    toast.success('Template spreadsheet diterapkan')
  }

  function updateOfflineRow(id: string, field: keyof SessionRow, value: string) {
    setOfflineRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function updateOnlineRow(id: string, field: keyof SessionRow, value: string) {
    setOnlineRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function removeOfflineRow(id: string) {
    setOfflineRows((prev) => prev.filter((r) => r.id !== id))
  }

  function removeOnlineRow(id: string) {
    setOnlineRows((prev) => prev.filter((r) => r.id !== id))
  }

  function addOfflineRow() {
    setOfflineRows((prev) => [...prev, makeRow({ platform: 'Office', room: 'Office' })])
  }

  function addOnlineRow() {
    setOnlineRows((prev) => [...prev, makeRow({ platform: 'Google Meet', room: '' })])
  }

  async function handleSubmit() {
    if (!date) {
      toast.error('Pilih tanggal terlebih dahulu')
      return
    }
    if (offlineRows.length === 0 && onlineRows.length === 0) {
      toast.error('Tambahkan minimal 1 sesi')
      return
    }

    // Validate all rows have valid times
    const allRows = [
      ...offlineRows.map((r) => ({ ...r, mode: 'offline' as const })),
      ...onlineRows.map((r) => ({ ...r, mode: 'online' as const })),
    ]
    for (const r of allRows) {
      if (!r.startTime || !r.endTime) {
        toast.error('Semua sesi wajib punya jam mulai & selesai')
        return
      }
    }

    setLoading(true)
    try {
      // Get course ID
      const rep = await apiGet<{ course: { id: string } }>('/api/reports/course')
      await apiPost('/api/sessions/bulk', {
        courseId: rep.course.id,
        date,
        topicOfDay: topicOfDay || undefined,
        maxAttendees,
        sessions: allRows.map((r) => {
          const start = new Date(`${date}T${r.startTime}`)
          const end = new Date(`${date}T${r.endTime}`)
          return {
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            mode: r.mode,
            platform: r.platform || undefined,
            room: r.room || undefined,
            teacher: r.teacher || undefined,
          }
        }),
      })
      toast.success(`${totalCount} sesi berhasil dibuat!`)
      onOpenChange(false)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal membuat sesi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Buat Banyak Sesi
          </DialogTitle>
          <DialogDescription>
            Buat semua sesi untuk satu hari sekaligus (offline + online). Semua sesi berbagi materi (topicOfDay) yang sama.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date & Topic */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Materi Hari Ini (topicOfDay)</Label>
              <Input
                value={topicOfDay}
                onChange={(e) => setTopicOfDay(e.target.value)}
                placeholder="Mis. Speaking: Read Aloud"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Maks Peserta</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(Math.max(1, Math.min(100, Number(e.target.value))))}
              />
            </div>
          </div>

          {/* Template button */}
          <Button type="button" variant="outline" size="sm" onClick={applyTemplate} className="gap-1.5 w-fit">
            <LayoutTemplate className="h-3.5 w-3.5" />
            Template Spreadsheet
            <Badge variant="secondary" className="ml-1 text-[10px]">4+6 sesi</Badge>
          </Button>

          {/* Summary */}
          {totalCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>
                <strong>{offlineCount}</strong> offline + <strong>{onlineCount}</strong> online ={' '}
                <strong>{totalCount}</strong> sesi akan dibuat
              </span>
            </div>
          )}

          {/* Offline section */}
          <SessionSection
            title="Jadwal Kelas Offline"
            icon={<Building2 className="h-4 w-4 text-primary" />}
            mode="offline"
            rows={offlineRows}
            onUpdateRow={updateOfflineRow}
            onRemoveRow={removeOfflineRow}
            onAddRow={addOfflineRow}
          />

          {/* Online section */}
          <SessionSection
            title="Jadwal Kelas Online"
            icon={<Video className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
            mode="online"
            rows={onlineRows}
            onUpdateRow={updateOnlineRow}
            onRemoveRow={removeOnlineRow}
            onAddRow={addOnlineRow}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            type="button"
            disabled={loading || totalCount === 0}
            onClick={handleSubmit}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Buat {totalCount} Sesi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ==================== Session Section ====================

function SessionSection({
  title, icon, mode, rows, onUpdateRow, onRemoveRow, onAddRow,
}: {
  title: string
  icon: React.ReactNode
  mode: 'offline' | 'online'
  rows: SessionRow[]
  onUpdateRow: (id: string, field: keyof SessionRow, value: string) => void
  onRemoveRow: (id: string) => void
  onAddRow: () => void
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold">{title}</h3>
            <Badge variant="secondary" className="text-[10px]">{rows.length} sesi</Badge>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onAddRow} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Tambah
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Belum ada sesi {mode}. Klik &quot;Tambah&quot; untuk menambah.
          </p>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-y-auto scrollbar-thin pr-1">
            {rows.map((row, idx) => (
              <SessionRowEditor
                key={row.id}
                row={row}
                index={idx}
                mode={mode}
                onUpdate={(field, value) => onUpdateRow(row.id, field, value)}
                onRemove={() => onRemoveRow(row.id)}
                canRemove={rows.length > 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ==================== Session Row Editor ====================

function SessionRowEditor({
  row, index, mode, onUpdate, onRemove, canRemove,
}: {
  row: SessionRow
  index: number
  mode: 'offline' | 'online'
  onUpdate: (field: keyof SessionRow, value: string) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const platformOptions = mode === 'offline'
    ? ['Office', 'Kantor Pusat', 'Cabang']
    : ONLINE_PLATFORMS

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/40 bg-background/50 p-2">
      {/* Row number */}
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
        {index + 1}
      </span>

      {/* Time range */}
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3 text-muted-foreground" />
        <Input
          type="time"
          value={row.startTime}
          onChange={(e) => onUpdate('startTime', e.target.value)}
          className="h-7 w-[5.5rem] text-xs"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          type="time"
          value={row.endTime}
          onChange={(e) => onUpdate('endTime', e.target.value)}
          className="h-7 w-[5.5rem] text-xs"
        />
      </div>

      {/* Platform (shown as quick-select for offline) */}
      {mode === 'offline' && (
        <div className="flex items-center gap-1">
          <Building2 className="h-3 w-3 text-muted-foreground" />
          <Input
            value={row.room}
            onChange={(e) => onUpdate('room', e.target.value)}
            placeholder="Ruang"
            className="h-7 w-20 text-xs"
          />
        </div>
      )}

      {/* Platform (for online) */}
      {mode === 'online' && (
        <div className="flex items-center gap-1">
          <Video className="h-3 w-3 text-muted-foreground" />
          <select
            value={row.platform}
            onChange={(e) => onUpdate('platform', e.target.value)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs"
          >
            {platformOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      )}

      {/* Teacher */}
      <div className="flex items-center gap-1">
        <select
          value={row.teacher}
          onChange={(e) => onUpdate('teacher', e.target.value)}
          className="h-7 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">Pengajar</option>
          {TEACHER_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Remove */}
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="ml-auto h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}