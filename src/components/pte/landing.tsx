'use client'

import { GraduationCap, ShieldCheck, QrCode, MapPin, Camera, Fingerprint, Clock, BarChart3, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface LandingProps {
  onSelectStudent: () => void
  onSelectTeacher: () => void
}

const features = [
  { icon: QrCode, title: 'QR Dinamis', desc: 'QR berputar setiap 20 detik, anti-foto screenshot' },
  { icon: MapPin, title: 'Geo-fencing', desc: 'Wajib berada di radius lokasi kelas' },
  { icon: Fingerprint, title: 'Sidik Perangkat', desc: 'Satu perangkat tidak bisa absen dua siswa' },
  { icon: Camera, title: 'Verifikasi Selfie AI', desc: 'AI mendeteksi selfie asli vs foto dokumen' },
  { icon: Clock, title: 'Jendela Waktu', desc: 'Absensi hanya dibuka saat sesi berlangsung' },
  { icon: BarChart3, title: 'Laporan Real-time', desc: 'Pantau 20 pertemuan & tingkat kehadiran' },
]

export function Landing({ onSelectStudent, onSelectTeacher }: LandingProps) {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Sistem Absensi Aman & Adil
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Absensi PTE Academic{' '}
              <span className="bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                Anti-Curang
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Aplikasi absensi untuk kursus PTE yang adil, transparan, dan sulit dimanipulasi.
              Banyak sesi per hari (offline & online) dengan materi sama — siswa bebas pilih sesi.
              Kuota personal 10–20 sesi, verifikasi multi-faktor: QR dinamis, PIN, geo-lokasi & wajah AI.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="w-full gap-2 sm:w-auto" onClick={onSelectStudent}>
                <GraduationCap className="h-5 w-5" />
                Masuk sebagai Siswa
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="w-full gap-2 sm:w-auto" onClick={onSelectTeacher}>
                <ShieldCheck className="h-5 w-5" />
                Masuk sebagai Pengajar
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Demo: siswa <code className="rounded bg-muted px-1.5 py-0.5">PTE001</code> · PIN <code className="rounded bg-muted px-1.5 py-0.5">0001</code>{' '}
              · pengajar <code className="rounded bg-muted px-1.5 py-0.5">pengajar</code> / <code className="rounded bg-muted px-1.5 py-0.5">pengajar123</code>
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            6 Lapis Perlindungan Anti-Curang
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Kombinasi inovatif memastikan kehadiran siswa benar-benar valid dan adil.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="group relative overflow-hidden border-border/60 transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
              { step: '02', title: 'Siswa Absen Multi-Faktor', desc: 'Siswa scan QR + masukkan PIN sesi + aktifkan lokasi (+ selfie opsional). Sistem memverifikasi semua.' },
              { step: '03', title: 'Laporan Otomatis', desc: 'Hitung kehadiran otomatis sampai 20 pertemuan. Lihat statistik per siswa & per sesi real-time.' },
            ].map((s) => (
              <div key={s.step} className="relative rounded-2xl border border-border/60 bg-card p-6">
                <div className="mb-3 text-4xl font-bold text-primary/20">{s.step}</div>
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
