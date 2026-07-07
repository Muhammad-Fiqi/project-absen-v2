# PTE Attendance System - Worklog

## Project Overview
Web-based attendance application for PTE (Pearson Test of English) course students.
- Sustainable, accessible anywhere, secure database, cheap to deploy
- Anti-fraud: dynamic rotating QR, geo-fencing, device fingerprint, session PIN, selfie VLM verification
- Track 20 sessions per course
- Single-page app (only `/` route) with role-based views (Student / Teacher / Admin)

## Tech Stack
- Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui
- Prisma ORM + SQLite (cheap, file-based, easy deploy)
- z-ai-web-dev-sdk for VLM selfie verification (backend only)
- Recharts for attendance analytics

---
Task ID: 1
Agent: main
Task: Analyze project state & create initial worklog

Work Log:
- Inspected project structure (Next.js 16 scaffold with full shadcn/ui, Prisma, z-ai-web-dev-sdk available)
- Verified dev server running on port 3000
- Designed database schema and anti-fraud architecture
- Created this worklog

Stage Summary:
- Foundation ready. Next: build Prisma schema, lib utilities, API routes, and single-page UI with Student/Teacher views.

---
Task ID: R1-R10
Agent: main
Task: Refactor ke model bisnis multi-sesi-per-hari dengan kuota personal & extend flow

Work Log:
- Refactor Prisma schema: Session tambah mode/platform/teacher/topicOfDay, hapus unique constraint sessionNumber; Student tambah sessionQuota/quotaExtendedAt/quotaNote; tambah QuotaExtension model (audit log); Attendance tambah dayKey (enforce 1 sesi/hari)
- Update types.ts: StudentDashboard baru dengan DayGroup (group by day), quota object, today/upcomingDays/recentDays
- Update seed: 21 hari × (4 offline + 5 online) = 189 sesi; topicOfDay sama per hari; kuota variasi per siswa (7-20); PTE009 exhausted (7/7), PTE006 expiring (7/8), PTE005 expiring (7/10)
- Update attendance API: cek kuota (block 403 jika habis), cek 1-sesi-per-hari via dayKey (block 409 jika sudah absen hari ini), geo skip untuk sesi online
- Add /api/students (list + quota usage + extension history) dan /api/students/[id]/extend (tambah/set kuota + audit log via transaction)
- Update student dashboard API: group sesi by day, today card, quota progress, banner exhausted/expiring
- Update student dashboard UI: quota meter, banner "habis"/"hampir habis", DayGroupCard dengan mode/platform/teacher, today prominent, riwayat
- Update teacher dashboard: 5 tab (Jadwal/QR/Kehadiran/Siswa&Kuota/Laporan), sessions grouped by day, create-session form dengan mode toggle (offline/online) + platform/teacher/topicOfDay
- Build StudentsManage component: list siswa + quota progress, filter (all/exhausted/expiring/healthy), expand detail + extension history, ExtendDialog (add/set mode)
- Update reports: per-day summary (offline/online count), quota ranking per siswa, quota usage stats
- Fix bug: student route.ts hilang (Write awal gagal) — re-create
- Fix bug: PIN seed pakai code.slice(-4) = "E009" bukan "0009" — ganti ke code.replace(/\D/g,'').padStart(4,'0')
- Fix bug: Prisma client stale di dev server — restart server dengan `(nohup next dev &)`

Verification (agent-browser):
- Landing page renders dengan info multi-sesi & kuota 10-20
- Login siswa PTE009 (Bayu, exhausted): dashboard tampil banner "Kuota sesi Anda habis! 7/7", sisa kuota 0, 100% terpakai
- Login pengajar: dashboard 5 tab, jadwal grouped by day (offline 4 + online 5 per hari), topicOfDay tampil
- API /api/students: PTE009 exhausted, PTE006 expiring terdeteksi
- Extend Bayu +10 sesi via API: quota 7→17, QuotaExtension audit record dibuat
- Re-login Bayu: banner "habis" hilang, sisa kuota 10/17, "Terakhir diperpanjang: 7 Jul 2026" tampil

Stage Summary:
- Model bisnis baru fully working: multi-sesi/hari (offline+online), materi sama per hari, 1 absen/hari, kuota personal 10-20, extend flow dengan audit
- Demo logins: siswa PTE001-PTE010 (PIN = 4 digit angka), pengajar pengajar/pengajar123, admin/admin123, dimas/dimas123, faisal/faisal123
- 6 lapis anti-curang aktif: QR dinamis 20s, PIN sesi, geo-fencing (offline only), device fingerprint, selfie VLM (opsional), time window
