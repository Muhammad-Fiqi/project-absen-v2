'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Award, CheckCircle2, Circle, Crown, Loader2, Medal, RefreshCw, Trophy } from 'lucide-react'
import { apiGet } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

type LeaderboardEntry = {
  id: string
  name: string
  avatarUrl: string | null
  rank: number
  points: number
  missionsCompleted: number
  totalMissions: number
  progress: Array<{ id: string; name: string; submitted: boolean; points: number | null; maxPoints: number | null }>
  certificateStatus: string
  pointsRequired: number
  syncedAt: string
}

type LeaderboardResponse = {
  maxPoints: number
  currentStudentId: string | null
  current: LeaderboardEntry | null
  entries: LeaderboardEntry[]
  totalEntries: number
  hasMore: boolean
  latestSyncedAt: string | null
  syncedFrom: string
}

export function LeaderboardPanel({ compact = false, showClassroomJoinCaption = false, onBack }: { compact?: boolean; showClassroomJoinCaption?: boolean; onBack?: () => void }) {
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)

  async function load(loadAll = showAll) {
    setLoading(true)
    try {
      const query = loadAll ? '?limit=0' : '?limit=10'
      setData(await apiGet<LeaderboardResponse>(`/api/leaderboard${query}`))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat leaderboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const current = data?.current ?? null
  const sortedEntries = useMemo(() => data?.entries ?? [], [data])
  const progress = current ? Math.min((current.points / current.pointsRequired) * 100, 100) : 0

  async function showAllEntries() {
    setShowAll(true)
    await load(true)
  }

  return (
    <div className={compact ? 'space-y-4' : 'animate-fade-in space-y-4 w-full md:w-[70%] px-2 mt-6 md:mx-auto'}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            {onBack && <Button type="button" variant="ghost" size="icon" onClick={onBack} aria-label="Kembali ke dashboard"><ArrowLeft className="h-4 w-4" /></Button>}
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Mission Leaderboard</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking berdasarkan skor yang disinkronkan dari Google Classroom melalui Apps Script.
          </p>
          {data?.latestSyncedAt && <p className="mt-1 text-[11px] text-muted-foreground/80">Sinkron terakhir: {new Date(data.latestSyncedAt).toLocaleString('id-ID')}</p>}
          {showClassroomJoinCaption && (
            <p className="mt-2 text-xs text-muted-foreground">
              Tidak menemukan nama Anda? Mohon join terlebih dahulu pada{' '}
              <a
                href="https://classroom.google.com/c/872792240658"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline underline-offset-2"
              >
                Google Classroom
              </a>
              {' '}agar data leaderboard Anda dapat diperbarui.
            </p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => { void load() }} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
      ) : data && data.entries.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Belum ada skor yang disinkronkan dari Google Classroom.
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {current && (
            <Card className="overflow-hidden border-primary/30 bg-linear-to-br from-primary/10 via-primary/5 to-transparent">
              <CardContent className="p-5 h-screen overflow-y-scroll">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar src={current.avatarUrl} name={current.name} size="large" />
                    <div>
                      <p className="text-xs text-muted-foreground">Progress Anda</p>
                      <p className="font-bold">{current.name}</p>
                      <p className="text-xs text-muted-foreground">Peringkat #{current.rank} dari {data.entries.length} siswa</p>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-muted-foreground">Total Mission Points</p>
                    <p className="text-3xl font-black">{current.points}<span className="text-sm font-medium text-muted-foreground"> / {current.pointsRequired}</span></p>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Progress sertifikat</span><span>{Math.round(progress)}%</span></div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Student Leaderboard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-2!">
                  {sortedEntries.map((entry) => (
                    <div key={entry.id} className={`rounded-xl border p-3 ${entry.id === data.currentStudentId ? 'border-primary/40 bg-primary/5' : 'border-border/60'}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex w-8 justify-center text-sm font-bold text-muted-foreground">
                          {entry.rank === 1 ? <Crown className="h-5 w-5 text-amber-500" /> : entry.rank === 2 ? <Medal className="h-5 w-5 text-slate-400" /> : entry.rank === 3 ? <Medal className="h-5 w-5 text-orange-500" /> : `#${entry.rank}`}
                        </div>
                        <Avatar src={entry.avatarUrl} name={entry.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{entry.name}</span>{entry.id === data.currentStudentId && <Badge variant="secondary" className="text-[10px]">Anda</Badge>}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground"><div className="h-1.5 w-30 sm:w-50 md:w-60 lg:w-100 xl:w-150 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min((entry.points / entry.pointsRequired) * 100, 100)}%` }} /></div>{entry.missionsCompleted}/{entry.totalMissions} tugas dikumpulkan</div>
                        </div>
                        <div className="text-right"><p className="font-black">{entry.points}</p><p className="text-[10px] text-muted-foreground">points</p></div>
                      </div>
                      {entry.progress.length > 0 && (
                        <details className="mt-3 border-t border-border/50 pt-2">
                          <summary className="cursor-pointer list-none text-[11px] font-semibold text-primary">Daftar tugas ({entry.progress.length})</summary>
                          <div className="mt-2 space-y-1">
                            {entry.progress.map((mission) => (
                              <div key={mission.id} className="flex items-center gap-2 text-xs">
                                {mission.submitted ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary" /> : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                                <span className="min-w-0 flex-1 truncate">{mission.name}</span>
                                <span className="shrink-0 text-muted-foreground">
                                  {mission.submitted ? 'Dikumpulkan' : 'Belum dikumpulkan'}
                                  {mission.points !== null && ` · ${mission.points}${mission.maxPoints !== null ? `/${mission.maxPoints}` : ''} poin`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
            </CardContent>
          </Card>

          {data.hasMore && !showAll && (
            <Button type="button" variant="outline" className="w-full" onClick={showAllEntries} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Tampilkan semua ({data.totalEntries} student)
            </Button>
          )}

          <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 mb-3 text-center text-xs text-muted-foreground">
            <Award className="h-4 w-4 text-primary" /> Target sertifikat: {current?.pointsRequired ?? data.maxPoints ?? 1000} points
          </div>
        </>
      ) : null}
    </div>
  )
}

function Avatar({ src, name, size = 'small' }: { src: string | null; name: string; size?: 'small' | 'large' }) {
  const sizeClass = size === 'large' ? 'h-12 w-12 rounded-xl text-lg' : 'h-9 w-9 rounded-lg text-xs'

  return src ? (
    <img src={src} alt={`Avatar ${name}`} className={`${sizeClass} shrink-0 object-cover`} referrerPolicy="no-referrer" />
  ) : (
    <div className={`flex shrink-0 items-center justify-center bg-muted font-bold ${sizeClass}`}>{getInitials(name)}</div>
  )
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}
