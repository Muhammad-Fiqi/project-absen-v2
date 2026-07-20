'use client'

import { useState } from 'react'
import { GraduationCap, ArrowLeft, Loader2, KeyRound, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'

interface StudentLoginProps {
  onBack: () => void
  onSuccess: (data?: { id: string; studentCode: string; name: string; email: string | null; phone: string | null; courseCode: string; courseId: string | null }) => void
}

export function StudentLogin({ onBack, onSuccess }: StudentLoginProps) {
  const [studentCode, setStudentCode] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!studentCode || !password) return
    setLoading(true)
    try {
      const res = await apiPost<{
        success: boolean
        student: { id: string; studentCode: string; name: string; email: string | null; phone: string | null; courseCode: string; courseId: string | null; courseName?: string }
      }>('/api/auth/student', { studentCode, password })
      toast.success('Berhasil masuk!')
      onSuccess(res.student)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal masuk')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-10">
      <Card className="relative w-full border-border/60 shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <button
            onClick={onBack}
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Login Siswa</CardTitle>
          <CardDescription>
            Masuk dengan kode siswa dan password default Anda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Siswa</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="code"
                  placeholder="contoh: PTE001"
                  className="pl-9 uppercase"
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="sukseswhv2026"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                gunakan password default <code className="rounded bg-muted px-1.5 py-0.5">sukseswhv2026</code>
              </p>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
              Masuk
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}