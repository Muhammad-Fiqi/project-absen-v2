'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
  MinusCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api-client'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface CalendarDay {
  day: number
  dayOfWeek: number
  status: 'none' | 'present' | 'late' | 'excused' | 'missed' | 'future'
  hasSessions: boolean
  sessionTitle?: string
  mode?: string
  note?: string
  dateKey: string
}

interface CalendarMonth {
  year: number
  month: number
  label: string
  days: CalendarDay[]
}

interface CalendarStats {
  present: number
  late: number
  excused: number
  missed: number
}

interface CalendarData {
  months: CalendarMonth[]
  stats: CalendarStats
}

const DAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const STATUS_META: Record<string, {
  label: string
  bg: string
  bgDark: string
  icon: typeof CheckCircle2
  dotColor: string
}> = {
  present: {
    label: 'Hadir',
    bg: 'bg-emerald-500',
    bgDark: 'dark:bg-emerald-500',
    icon: CheckCircle2,
    dotColor: 'bg-emerald-500',
  },
  late: {
    label: 'Terlambat',
    bg: 'bg-amber-500',
    bgDark: 'dark:bg-amber-500',
    icon: Clock,
    dotColor: 'bg-amber-500',
  },
  excused: {
    label: 'Izin',
    bg: 'bg-purple-500',
    bgDark: 'dark:bg-purple-500',
    icon: ShieldCheck,
    dotColor: 'bg-purple-500',
  },
  missed: {
    label: 'Tidak Hadir',
    bg: 'bg-red-400/60',
    bgDark: 'dark:bg-red-500/50',
    icon: XCircle,
    dotColor: 'bg-red-400',
  },
  future: {
    label: 'Akan Datang',
    bg: 'bg-muted',
    bgDark: 'dark:bg-muted',
    icon: MinusCircle,
    dotColor: 'bg-muted-foreground/40',
  },
}

function DayCell({ day }: { day: CalendarDay }) {
  const [open, setOpen] = useState(false)

  if (day.day === 0) {
    return <div />
  }

  const meta = day.status !== 'none' ? STATUS_META[day.status] : null

  const cellContent = (
    <button
      onClick={(e) => {
        e.stopPropagation()
        if (meta) setOpen(true)
      }}
      className={`
        relative flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium
        transition-all duration-150 sm:h-10 sm:w-10 sm:text-sm
        ${meta
          ? `${meta.bg} ${meta.bgDark} text-white shadow-sm hover:scale-110 hover:shadow-md cursor-pointer`
          : day.hasSessions
            ? 'bg-muted/60 text-muted-foreground cursor-pointer hover:bg-muted'
            : 'text-muted-foreground/50'
        }
        ${day.status === 'future' ? 'animate-pulse' : ''}
      `}
      aria-label={meta ? `${day.dateKey} - ${meta.label}` : day.dateKey}
    >
      {day.day}
    </button>
  )

  if (!meta || day.status === 'future') {
    return cellContent
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {cellContent}
      </PopoverTrigger>
      <PopoverContent className="w-64 rounded-2xl border-border/60 p-4" side="top" align="center">
        <div className="mb-2 text-sm font-semibold">
          {day.dateKey ? format(parseISO(day.dateKey), 'EEEE, d MMMM yyyy', { locale: idLocale }) : ''}
        </div>
        <div className="flex items-center gap-2 mb-2">
          {(() => {
            const Icon = meta.icon
            return <Icon className="h-4 w-4" style={{ color: day.status === 'present' ? '#10b981' : day.status === 'late' ? '#f59e0b' : day.status === 'excused' ? '#a855f7' : '#f87171' }} />
          })()}
          <Badge
            variant="outline"
            className={`
              gap-1 text-xs
              ${day.status === 'present' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : ''}
              ${day.status === 'late' ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : ''}
              ${day.status === 'excused' ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-300' : ''}
              ${day.status === 'missed' ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/40 dark:text-red-300' : ''}
            `}
          >
            {meta.label}
          </Badge>
        </div>
        {day.sessionTitle && (
          <p className="text-xs text-muted-foreground">{day.sessionTitle}</p>
        )}
        {day.mode && (
          <p className="text-xs text-muted-foreground">
            Mode: {day.mode === 'online' ? 'Online' : 'Offline'}
          </p>
        )}
        {day.note && (
          <div className="mt-2 rounded-lg bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Catatan:</span> {day.note.replace(/^Izin:\s*/i, '')}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function CalendarMonthView({ month }: { month: CalendarMonth }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">{month.label}</h3>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-6 items-center justify-center text-[10px] font-medium text-muted-foreground/70 sm:h-7 sm:text-xs"
          >
            {label}
          </div>
        ))}
        {month.days.map((d, i) => (
          <DayCell key={`${d.dateKey}-${i}`} day={d} />
        ))}
      </div>
    </div>
  )
}

export function AttendanceCalendar() {
  const [data, setData] = useState<CalendarData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCalendar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiGet<CalendarData>('/api/student/calendar')
      setData(res)
    } catch {
      setError('Gagal memuat kalender kehadiran')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCalendar()
  }, [loadCalendar])

  return (
    <Card className="border-border/60 transition-transform hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="pb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between gap-2"
        >
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            Kalender Kehadiran
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Stats row */}
        {data && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {data.stats.present > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                <span className="text-muted-foreground">{data.stats.present} hadir</span>
              </span>
            )}
            {data.stats.late > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                <span className="text-muted-foreground">{data.stats.late} terlambat</span>
              </span>
            )}
            {data.stats.excused > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                <span className="text-muted-foreground">{data.stats.excused} izin</span>
              </span>
            )}
            {data.stats.missed > 0 && (
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                <span className="text-muted-foreground">{data.stats.missed} tidak hadir</span>
              </span>
            )}
          </div>
        )}

        {/* Legend */}
        {data && (
          <div className="mt-2 flex flex-wrap gap-3">
            {(['present', 'late', 'excused', 'missed', 'future'] as const).map((s) => {
              const meta = STATUS_META[s]
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`h-3 w-3 rounded ${meta.dotColor}`} />
                  <span className="text-[10px] text-muted-foreground">{meta.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </CardHeader>

      {expanded && (
        <CardContent>
          {loading ? (
            <div className="space-y-6">
              {[1].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 28 }, (_, j) => (
                      <Skeleton key={j} className="h-8 w-8 rounded-lg sm:h-10 sm:w-10" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-dashed border-border/60 py-8 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={loadCalendar}>
                Coba Lagi
              </Button>
            </div>
          ) : data ? (
            <div className="space-y-6">
              {data.months.map((m) => (
                <CalendarMonthView key={`${m.year}-${m.month}`} month={m} />
              ))}
            </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  )
}