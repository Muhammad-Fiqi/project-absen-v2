'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronUp, Loader2, RefreshCw, Search, UserRoundX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { apiGet } from '@/lib/api-client'
import { toast } from 'sonner'

interface AbsenceStudent {
  id: string
  name: string
  studentCode: string
  missedDates: string[]
}

export function AbsencesPanel() {
  const [students, setStudents] = useState<AbsenceStudent[]>([])
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const result = await apiGet<{ students: AbsenceStudent[] }>('/api/reports/absences')
      setStudents(result.students)
    } catch {
      toast.error('Gagal memuat rekap bolos siswa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return students
      .filter((student) => student.missedDates.length > 0)
      .filter((student) =>
        !normalized ||
        student.name.toLowerCase().includes(normalized) ||
        student.studentCode.toLowerCase().includes(normalized)
      )
      .sort((a, b) => b.missedDates.length - a.missedDates.length || a.name.localeCompare(b.name, 'id'))
  }, [students, query])

  const totalMissedDays = filtered.reduce((sum, student) => sum + student.missedDates.length, 0)

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRoundX className="h-4 w-4 text-destructive" /> Rekap Bolos Siswa
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {filtered.length} siswa · {totalMissedDays} hari kelas terlewat · dihitung sejak akun dibuat
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} aria-label="Muat ulang rekap bolos">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau kode siswa"
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex h-28 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {query ? 'Tidak ada siswa bolos yang cocok dengan pencarian.' : 'Tidak ada tanggal bolos tercatat.'}
          </div>
        ) : (
          <div className="max-h-112 divide-y divide-border/40 overflow-y-auto">
            {filtered.map((student) => {
              const expanded = expandedId === student.id
              return (
                <div key={student.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : student.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{student.name}</span>
                        <span className="text-xs text-muted-foreground">{student.studentCode}</span>
                      </div>
                    </div>
                    <Badge variant="destructive" className="shrink-0">
                      {student.missedDates.length} hari
                    </Badge>
                    {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </button>
                  {expanded && (
                    <div className="flex flex-wrap gap-2 border-t border-border/40 bg-muted/20 px-4 py-3">
                      {student.missedDates.map((date) => (
                        <Badge key={date} variant="outline" className="gap-1 border-destructive/30 bg-background font-normal">
                          <CalendarDays className="h-3 w-3 text-destructive" />
                          {new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', {
                            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}