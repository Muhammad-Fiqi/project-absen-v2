'use client'

import { GraduationCap, ShieldCheck, QrCode, Clock, BarChart3, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LandingProps {
  onSelectStudent: () => void
  onSelectTeacher: () => void
}

const features = [
  { icon: QrCode, title: 'QR Dinamis', desc: 'QR berputar setiap 24 jam, anti-foto screenshot' },
  { icon: Clock, title: 'Jendela Waktu', desc: 'Absensi hanya dibuka saat sesi berlangsung' },
  { icon: BarChart3, title: 'Laporan Real-time', desc: 'Pantau 20 pertemuan & tingkat kehadiran' },
]

export function Landing({ onSelectStudent, onSelectTeacher }: LandingProps) {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-grid">
        {/* Animated gradient blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-blob dark:bg-primary/30" />
          <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl animate-blob dark:bg-emerald-500/25 [animation-delay:2s]" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-primary/15 blur-3xl animate-blob dark:bg-primary/20 [animation-delay:4s]" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sistem Absensi Aman & Adil
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Absensi PTE Academic{' '}
              <span className="bg-gradient-to-r from-primary via-emerald-600 to-primary bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
                Anti-Curang
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Aplikasi absensi untuk kursus PTE yang adil, transparan, dan sulit dimanipulasi.
              Banyak sesi per hari (offline & online) dengan materi sama — siswa bebas pilih sesi.
              Kuota personal 10–20 sesi, verifikasi QR dinamis & jendela waktu.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-primary to-emerald-600 shadow-md transition-transform hover:scale-[1.02] hover:shadow-lg sm:w-auto"
                onClick={onSelectStudent}
              >
                <GraduationCap className="h-5 w-5" />
                Masuk sebagai Siswa
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full gap-2 shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md sm:w-auto"
                onClick={onSelectTeacher}
              >
                <ShieldCheck className="h-5 w-5" />
                Masuk sebagai Pengajar
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Demo: siswa <code className="rounded bg-muted px-1.5 py-0.5">PTE001</code> · password <code className="rounded bg-muted px-1.5 py-0.5">sukseswhv2026</code>{' '}
              · pengajar <code className="rounded bg-muted px-1.5 py-0.5">pengajar</code> / <code className="rounded bg-muted px-1.5 py-0.5">pengajar123</code>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            3 Fitur Utama
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Kombinasi inovatif memastikan kehadiran siswa benar-benar valid dan adil.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden border-border/60 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-muted text-accent-foreground transition-all group-hover:from-primary group-hover:to-emerald-600 group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mb-1 font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Cara Kerja
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { step: '01', title: 'Pengajar Buka Sesi', desc: 'Pengajar membuat/membuka sesi pertemuan dan menampilkan QR dinamis di layar kelas.' },
              { step: '02', title: 'Siswa Scan QR', desc: 'Siswa scan QR dinamis yang ditampilkan pengajar. Sistem memverifikasi keaslian QR & jendela waktu.' },
              { step: '03', title: 'Laporan Otomatis', desc: 'Hitung kehadiran otomatis sampai 20 pertemuan. Lihat statistik per siswa & per sesi real-time.' },
            ].map((s) => (
              <div
                key={s.step}
                className="relative rounded-2xl border border-border/60 bg-card p-6 transition-transform hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 bg-gradient-to-br from-primary to-emerald-600 bg-clip-text text-4xl font-bold text-transparent">
                  {s.step}
                </div>
                <h3 className="mb-2 font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}