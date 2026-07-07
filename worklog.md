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

---
Task ID: FE-1
Agent: full-stack-developer
Task: Add dark mode, improve styling, add extension request UI, real-time attendee counter

Work Log:
- Wrapped children in `<ThemeProvider attribute="class" defaultTheme="light">` in layout.tsx (next-themes already installed)
- Created theme-toggle.tsx (sun/moon button with rotate/scale transition). Avoided hydration mismatch by using `resolvedTheme` instead of `mounted` flag (react-hooks/set-state-in-effect lint rule disallows setState-in-effect pattern)
- Added ThemeToggle next to user dropdown in header.tsx, plus gradient logo badge with status dot and gradient text title
- Updated qr-display.tsx interface to include attendeeCount, totalStudents, and expanded session object (mode, platform, teacher, topicOfDay). Added two prominent top cards: live clock (HH:MM:SS WIB, tick every second) with LIVE ping indicator, and attendee counter with progress bar ("X dari Y siswa sudah absen"). QR card now has gradient blur glow effect, session meta badges, and shadow-md hover. Fullscreen dialog also shows live clock + attendee count.
- Created request-extension.tsx: student dialog with 5/10/15/20 quick buttons + custom input (1-50), reason textarea with min-5-char validation and live counter (X/500), summary card showing estimated new quota, and embedded previous-requests list with status badges (pending/approved/denied)
- Updated student-dashboard.tsx: added "Minta Perpanjangan" button (gradient) in exhausted banner and outline-amber variant in expiring-soon banner. Wrapped today's DayGroupCard in gradient-border wrapper (from-primary via-emerald-500). Added bottom ExtensionRequestsSection showing pending/approved/denied counts + history list with refresh
- Created extension-requests.tsx: teacher review view with summary stats, filter buttons (pending/approved/denied/all), rich list rows showing student code/name/email/phone + current quota + requested sessions + reason + created time. Review dialog supports approve (with optional granted-sessions override) and deny (with mandatory note). Auto-refreshes every 30s. Skeleton loading states
- Updated teacher-dashboard.tsx: added 6th tab "Permintaan" between Siswa & Laporan with destructive badge showing pending count (auto-refreshed every 30s + on tab open). Added animate-fade-in to all TabsContent for smooth transitions
- Updated landing.tsx hero with 3 animated gradient blobs (animate-blob, staggered delays), gradient title text (animate-gradient-x), gradient hover lift + shadow-md on feature cards and step cards, gradient hover on icon containers, hero buttons with shadow + scale-on-hover
- Added `animate-blob` and `animate-gradient-x` keyframes to globals.css
- Applied hover lift (hover:-translate-y-0.5) + shadow-md hover across StatCard, DayGroupCard, ExtensionRequestsSection, MiniStat, feature/step cards
- Fixed Prisma client staleness: ran `bun run db:generate` + `bun run db:push`, killed stale next-server PID 6184, restarted dev server with nohup

Verification (curl + auth flow):
- Login pengajar → GET /api/extension-requests?status=pending → 200 (empty list initially)
- Login siswa PTE009 → POST /api/extension-requests {requestedSessions:10, reason:"..."} → 200, status pending
- GET /api/extension-requests as teacher → sees Bayu Setiawan's request (currentQuota:17, +10)
- PATCH /api/extension-requests/[id]/review {action:"approve", note:"..."} → 200, student sessionQuota: 17→27
- GET /api/sessions/[id]/qr → returns attendeeCount:0, totalStudents:10, full session object (mode/platform/teacher/topicOfDay)
- bun run lint → 0 errors, 0 warnings

Stage Summary:
- Dark mode fully working (toggle in header, persists via next-themes localStorage, .dark class on <html>)
- QR display now has prominent live clock + real-time attendee counter (polls on 20s rotation), glow effect, session meta badges
- Students can request extension via dialog (from exhausted/expiring banners or bottom section); sees own request history
- Teachers get dedicated "Permintaan" tab with badge count, review dialog (approve/deny + override + note), 30s auto-refresh
- Styling polished across all touched components: gradient accents, hover lift, shadow depth, skeleton loading, fade-in tab transitions, animated gradient hero
- All existing functionality preserved (login, attendance flow, reports, student management)

---
Task ID: QA-1 + FE-2
Agent: main (cron review)
Task: QA testing, bug fixes, new features (dark mode, extension requests, real-time counter, active-status override)

Work Log:
- QA tested all flows via agent-browser: landing, student login (PTE001, PTE006), teacher login, all 6 teacher tabs
- Found critical bug: AttendanceFlow modal crashed with "Maximum update depth exceeded" — infinite loop in PIN/selfie/geo useEffects (factors.pin/factors.selfie/factors.geo in dependency arrays + setFactors creating new object refs)
- Fixed: Rewrote PIN, selfie, and geo useEffects to use functional setFactors with early-return if state unchanged, removed factors.* from deps
- Fixed: Active session status now overrides time window check — teacher can open attendance anytime (both in attendance API and student dashboard API)
- Verified: Students can now see "Absen" buttons on today's active sessions and open the attendance modal without crash
- Verified: Dark mode toggle works (light ↔ dark, persists in localStorage)
- Verified: Student "Minta Perpanjangan" flow: PTE006 (expiring) → fill form (+10, reason) → submit → request created (pending)
- Verified: Teacher "Permintaan" tab: shows pending count badge, list of requests, "Tinjau" review dialog, approve/deny with note
- Verified: Extension approval updates student quota (PTE006: 8 → 18, audit log created)
- Verified: QR Live tab shows live clock (WIB), real-time attendee counter (0/10 siswa), rotating QR

Backend changes:
- attendance API: `session.status === 'active'` overrides time window (line ~124)
- student dashboard API: `effectivelyOpen = s.status === 'active' ? true : window.open` for canCheckIn
- Extension Request model added to Prisma schema (student requests, teacher reviews)
- New APIs: POST/GET /api/extension-requests, PATCH /api/extension-requests/[id]/review
- QR API enhanced: returns attendeeCount, totalStudents, session mode/platform/teacher/topicOfDay
- db:push run successfully (ExtensionRequest table created)

Frontend changes (by subagent FE-1 + main fixes):
- Dark mode: ThemeProvider in layout.tsx, ThemeToggle component in header
- QR Display: live clock, attendee counter with progress bar, gradient glow, session meta badges
- RequestExtension component: student self-service quota extension request dialog
- ExtensionRequests component: teacher review tab with approve/deny
- Student dashboard: exhausted/expiring banners now have "Minta Perpanjangan" button, extension history section
- Teacher dashboard: 6th tab "Permintaan" with pending count badge
- Styling: hover lift effects, gradient accents, skeleton loaders, fade-in animations, animated gradient blobs on landing

Stage Summary:
- All bugs fixed: attendance modal infinite loop, time window blocking active sessions
- All new features working: dark mode, extension requests (student→teacher), real-time attendee counter, live clock
- 6 anti-fraud layers active: QR dinamis 20s, PIN sesi, geo-fencing (offline), device fingerprint, selfie VLM, time window + active override
- Demo logins: siswa PTE001-PTE010 (PIN=4-digit), pengajar/pengajar123, admin/admin123
- Lint: 0 errors, 0 warnings
- Server: running on port 3000, all APIs responding 200

Unresolved issues / next phase recommendations:
1. Selfie VLM verification: the /api/verify-selfie endpoint uses z-ai-web-dev-sdk — should test with real selfie image to confirm VLM analysis works
2. Geo-fencing: in headless browser, geolocation API may not work — test on real device
3. QR scanner: html5-qrcode requires camera access — test on real device with actual QR display
4. Consider adding: student attendance calendar heatmap view, teacher bulk session creation, email notifications for extension approvals
5. Consider adding: student profile page with editable info, teacher can mark student as "excused" (izin) for missed sessions
