'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Bell, Check, Shield, Calendar, Info } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'announcement-popup-dismissed'

function getInitialShowAgain(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STORAGE_KEY) !== 'true'
}

export function AnnouncementPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [showAgain, setShowAgain] = useState(getInitialShowAgain)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleClose = useCallback(() => {
    if (!showAgain) {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
    onClose()
  }, [showAgain, onClose])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  if (!mounted || !isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="h-[90vh] max-h-175 w-[90vw] overflow-y-auto rounded-lg p-6 sm:p-8"
        onOverlayClick={handleOverlayClick}
        showCloseButton={false} 
      >
        <div className="relative max-md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 hover:bg-muted/50"
            onClick={handleClose}
            aria-label="Tutup pengumuman"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <DialogHeader className="text-center pb-4">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold">Penting Wajib Baca!</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Berhubung masih banyak siswa yang belum memahami update penting pada sistem pengurangan kuota absensi, kami Tim IT Ruang PTE ingin menginformasikan kembali bahwa sistem pengurangan absensi per tanggal <strong>18 agustus</strong>  kemarin memiliki update sebagai berikut:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              REMINDER
            </h4>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>Kuota berkurang <strong>1 setiap hari</strong> secara otomatis jika ada sesi aktif pada hari itu</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>Mohon untuk selalu absen terlebih dahulu sebelum hari-H sesi kelas dimulai pada <strong>jam 7 malam</strong> guna menghindari kelas yang tidak tersedia karena penuh</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>Selalu gunakan fitur <strong>izin</strong> atau <strong>ajukan cuti</strong> jika berhalangan hadir agar kuota absen tidak terpotong</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>Student hanya perlu masuk 1 kali per hari</span>
              </li>
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/20">
              <div className="mb-2 flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Shield className="h-4 w-4" />
                <span className="font-semibold">Fitur "Izin"</span>
              </div>
              <ul className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Mengecualikan potongan kuota hari ini</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Maksimal <strong>izin 5 kali</strong> per akun</span>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="mb-2 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">Fitur "Cuti Kelas"</span>
              </div>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Jika berhalangan hadir dalam waktu yang lama</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Perlu persetujuan admin/tutor</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>Ajukan mulai hari ini atau sebelum periode cuti dimulai</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Prioritas pengecualian:</strong> Cuti (disetujui) → Izin (valid) → Potong kuota normal.
                tombol izin dan ajukan cuti ada dibagian atas
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-3 pb-2">
          <div className="flex w-full items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                id="dont-show-again"
                checked={!showAgain}
                onCheckedChange={(checked) => setShowAgain(!checked)}
                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <span className="text-sm text-muted-foreground">Jangan tampilkan lagi</span>
            </label>
          </div>
          <Button className="w-full sm:w-auto" onClick={handleClose} size="default">
            Paham, Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}