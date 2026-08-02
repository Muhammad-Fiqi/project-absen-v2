'use client'

import { useState } from 'react'
import {
  GraduationCap, ShieldCheck, Clock, BarChart3, ArrowRight, Check, MapPin, Phone, Mail, Award, BookOpen, Sparkles, Compass, CheckCircle2, ChevronRight, QrCode, CreditCard, Building2, HelpCircle, UserCheck, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface LandingProps {
  onSelectStudent: () => void
  onSelectTeacher: () => void
  onSelectAdmin?: () => void
}

const CLASS_PACKAGES = [
  {
    id: 'standard',
    name: 'Kelas Standard',
    price: 'Rp 1.000.000',
    popular: false,
    badge: 'Program Dasar',
    description: 'Cocok untuk persiapan dasar PTE Academic dengan akses modul dan latihan terbimbing.',
    features: [
      'Modul & Materi Pembelajaran PTE Gratis',
      'Penjemputan Gratis dari Stasiun Kediri',
      'Akses Aplikasi APEUni Sharing',
      'Sesi Absensi Kelas (20 Pertemuan)',
      'Konsultasi Pengajar via Grup Sesi',
    ],
  },
  {
    id: 'garansi',
    name: 'Kelas Garansi',
    price: 'Rp 1.500.000',
    popular: true,
    badge: 'Paling Populer',
    description: 'Solusi lengkap dengan garansi mengulang & fasilitas penjemputan dari Bandara Juanda.',
    features: [
      'Semua Benefit Kelas Standard',
      'Garansi Mengulang Kelas Gratis (Jika Skor < 24 WHV)',
      'Bantuan Cetak Bank Reference Senilai AUD 5.000',
      'Gratis Sewa Sepeda Selama Kelas Offline di Pare',
      'Penjemputan Gratis dari Bandara Juanda atau Stasiun Kediri',
      'Konsultasi WHV & Feedback Feedback Lifetime',
    ],
  },
  {
    id: 'garansi-app',
    name: 'Kelas Garansi + Aplikasi',
    price: 'Rp 1.700.000',
    popular: false,
    badge: 'Paket VIP',
    description: 'Paket terlengkap untuk skor maksimal dengan akun aplikasi APEUni Privat khusus.',
    features: [
      'Semua Benefit Kelas Garansi',
      'Aplikasi APEUni Privat VIP (Bukan Sharing)',
    ],
  },
]

export function Landing({ onSelectStudent, onSelectTeacher, onSelectAdmin }: LandingProps) {
  const [selectedPkg, setSelectedPkg] = useState<typeof CLASS_PACKAGES[0] | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  function handleSelectPackage(pkg: typeof CLASS_PACKAGES[0]) {
    setSelectedPkg(pkg)
    setPaymentModalOpen(true)
  }

  return (
    <div className="animate-fade-in space-y-16 pb-16">
      {/* Hero Banner Section with Neumorphic Touch */}
      <section className="relative overflow-hidden border-b border-border/60 bg-grid py-12 sm:py-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-blob" />
          <div className="absolute -right-24 top-12 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl animate-blob [animation-delay:2s]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-xs shadow-sm bg-primary/10 text-primary border-primary/20">
                <Award className="h-3.5 w-3.5" />
                Pusat Kursus PTE Academic — Kampung Inggris Pare, Kediri
              </Badge>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl leading-tight">
                Raih Skor PTE Impian &{' '}
                <span className="bg-gradient-to-r from-primary via-blue-600 to-sky-500 bg-clip-text text-transparent animate-gradient-x bg-[length:200%_auto]">
                  Terbang ke Australia
                </span>
              </h1>

              <p className="text-base text-muted-foreground sm:text-lg max-w-2xl mx-auto lg:mx-0">
                <strong>Ruang PTE</strong> adalah lembaga bimbingan persiapan Pearson Test of English (PTE Academic) resmi di Kampung Inggris Pare, Kediri. Khusus dirancang untuk pejuang <strong>Working Holiday Visa (WHV) Australia</strong>, studi luar negeri, dan visa keahlian.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 rounded-2xl bg-gradient-to-r from-primary to-blue-600 shadow-neu-hover hover:scale-[1.02] transition-transform"
                  onClick={onSelectStudent}
                >
                  <GraduationCap className="h-5 w-5" />
                  Masuk Akun Siswa
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto gap-2 rounded-2xl border-border/80 shadow-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={onSelectTeacher}
                >
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Portal Pengajar & Admin
                </Button>
              </div>

              {/* Quick stats pills */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/40 max-w-md mx-auto lg:mx-0 text-center">
                <div className="p-2 rounded-xl bg-card border border-border/40">
                  <p className="text-lg font-bold text-primary">100%</p>
                  <p className="text-[11px] text-muted-foreground">Fokus WHV & Study</p>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border/40">
                  <p className="text-lg font-bold text-blue-600">Max 10</p>
                  <p className="text-[11px] text-muted-foreground">Siswa per Sesi</p>
                </div>
                <div className="p-2 rounded-xl bg-card border border-border/40">
                  <p className="text-lg font-bold text-primary">24/7</p>
                  <p className="text-[11px] text-muted-foreground">Booking Flexibel</p>
                </div>
              </div>
            </div>

            {/* Hero Neumorphic Card */}
            <div className="lg:col-span-5">
              <div className="rounded-[32px] border border-border/60 bg-card p-6 shadow-neu-extruded space-y-5">
                <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-neu-inset">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Ruang PTE Pare</h3>
                    <p className="text-xs text-muted-foreground">Kampung Inggris Kediri</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span><strong>Jadwal Fleksibel:</strong> Pilih sesi harian offline atau online sesuai waktu Anda.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span><strong>Sistem Absensi Real-Time:</strong> Pantau sisa kuota dan sisa pertemuan secara transparan.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <span><strong>Fasilitas Penjemputan:</strong> Bebas bingung dari Stasiun Kediri / Bandara Juanda.</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-muted/40 p-4 border border-border/40 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Garansi WHV Australia (Skor Min 24)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Program garansi mengulang jika belum mencapai target skor WHV. Gratis konsultasi berkas & bantuan reference bank.
                  </p>
                </div>

                <Button
                  className="w-full rounded-2xl gap-2 font-semibold shadow-neu-extruded"
                  onClick={() => {
                    const el = document.getElementById('paket-kelas')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  Lihat Pilihan Paket Kelas
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profil Perusahaan: Visi & Misi */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge variant="outline" className="mb-2 gap-1 text-xs">
            <Compass className="h-3.5 w-3.5 text-primary" /> Profil Perusahaan
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Visi & Misi Ruang PTE</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Komitmen kami untuk memberikan kualitas pengajaran PTE Academic standar internasional di Kampung Inggris Pare.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visi */}
          <Card className="rounded-[32px] border-border/60 shadow-neu-extruded p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Visi Kami</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              &quot;Menjadi pusat bimbingan persiapan PTE Academic terpercaya dan terdepan di Indonesia yang menghantarkan para alumni mencapai skor target WHV Australia, studi luar negeri, dan peluang karir global secara efisien dan terukur.&quot;
            </p>
          </Card>

          {/* Misi */}
          <Card className="rounded-[32px] border-border/60 shadow-neu-extruded p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold">Misi Kami</h3>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Menyediakan kurikulum bimbingan PTE Academic teruji dengan materi & simulasi tes terupdate.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Menerapkan batas kelas kecil (maksimal 10 siswa/sesi) agar bimbingan bersifat personal.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <span>Memberikan garansi pendampingan & konsultasi WHV lifetime hingga siswa lolos skor.</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Program Unggulan & Paket Kelas Section */}
      <section id="paket-kelas" className="mx-auto max-w-6xl px-4 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge className="mb-2 bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
            <CreditCard className="h-3.5 w-3.5" /> Biaya & Program Kelas
          </Badge>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pilihan Paket Kelas Ruang PTE</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pilih paket bimbingan yang sesuai dengan kebutuhan target skor dan anggaran Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CLASS_PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`relative rounded-[32px] border transition-all flex flex-col justify-between ${
                pkg.popular
                  ? 'border-primary ring-2 ring-primary/20 shadow-neu-hover'
                  : 'border-border/60 shadow-neu-extruded'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-[11px] px-3 shadow-md">
                    {pkg.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-6 pb-4">
                {!pkg.popular && (
                  <Badge variant="outline" className="w-fit text-[10px] mb-1">
                    {pkg.badge}
                  </Badge>
                )}
                <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
                <CardDescription className="text-xs min-h-[36px]">{pkg.description}</CardDescription>
                <div className="pt-3">
                  <span className="text-2xl font-extrabold text-foreground">{pkg.price}</span>
                  <span className="text-xs text-muted-foreground"> / program</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-6 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Benefit Paket:</p>
                <ul className="space-y-2 text-xs">
                  {pkg.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  className={`w-full rounded-2xl font-medium gap-1.5 ${
                    pkg.popular ? 'bg-primary text-primary-foreground shadow-md' : ''
                  }`}
                  variant={pkg.popular ? 'default' : 'outline'}
                  onClick={() => handleSelectPackage(pkg)}
                >
                  Pilih Paket
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* Alamat & Kontak Perusahaan */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-[32px] border border-border/60 bg-muted/30 p-6 sm:p-10 shadow-neu-extruded space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div>
              <Badge variant="outline" className="gap-1 text-xs mb-2">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Alamat & Kontak
              </Badge>
              <h2 className="text-xl font-bold sm:text-2xl">Lokasi & Layanan Informasi Ruang PTE</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Kunjungi kampus kami di Pare Kediri atau hubungi tim administrasi untuk informasi pendaftaran.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-2xl bg-background shadow-sm"
              onClick={() => window.open('https://maps.google.com/?q=Ruang+PTE+Kampung+Inggris+Pare+Kediri', '_blank')}
            >
              <MapPin className="h-4 w-4 text-primary" />
              Buka Google Maps
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/40">
              <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Alamat Kampus</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Jl. Brawijaya, Area Kampung Inggris Pare, Kabupaten Kediri, Jawa Timur 64212.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/40">
              <Phone className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Kontak WhatsApp</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  +62 812-3456-7890 (Admin Pendaftaran)
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Senin – Sabtu (08.00 – 17.00 WIB)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-card border border-border/40">
              <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Email Informasi</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  info@ruangpte.com / admin@ruangpte.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Payment / Registration Dialog Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Pendaftaran {selectedPkg?.name}
            </DialogTitle>
            <DialogDescription>
              Detail biaya dan metode pembayaran resmi Ruang PTE Pare Kediri.
            </DialogDescription>
          </DialogHeader>

          {selectedPkg && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl bg-muted/40 p-4 border border-border/60">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">{selectedPkg.name}</span>
                  <span className="font-bold text-base text-primary">{selectedPkg.price}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">{selectedPkg.description}</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-foreground">Metode Pembayaran Tersedia:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl border border-border/60 bg-card text-center space-y-1">
                    <QrCode className="h-5 w-5 mx-auto text-primary" />
                    <p className="font-semibold">QRIS All Payment</p>
                    <p className="text-[10px] text-muted-foreground">Gopay, OVO, ShopeePay, BCA</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-card text-center space-y-1">
                    <CreditCard className="h-5 w-5 mx-auto text-blue-600" />
                    <p className="font-semibold">Transfer Bank</p>
                    <p className="text-[10px] text-muted-foreground">BCA / Mandiri / BRI</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-blue-700 dark:text-blue-300">
                <p className="font-medium">Petunjuk Pendaftaran:</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Setelah melakukan pembayaran, Anda akan diberikan Kode Siswa oleh Admin untuk digunakan saat masuk ke aplikasi absensi.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Tutup
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-primary to-blue-600"
              onClick={() => {
                setPaymentModalOpen(false)
                onSelectStudent()
              }}
            >
              Lanjut ke Login Siswa
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}