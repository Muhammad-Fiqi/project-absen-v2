# PTE Attendance System - Worklog

## Project Overview
Web-based attendance application for PTE (Pearson Test of English) course students.
- Sustainable, accessible anywhere, secure database, cheap to deploy
- Anti-fraud: dynamic rotating QR, geo-fencing, device fingerprint, session PIN, selfie VLM verification
- Track 10-20 sessions per course (personal quota)
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

Stage Summary:
- Model bisnis baru fully working: multi-sesi/hari (offline+online), materi sama per hari, 1 absen/hari, kuota personal 10-20, extend flow dengan audit
- Demo logins: siswa PTE001-PTE010 (PIN = 4-digit), pengajar/pengajar123, admin/admin123, dimas/dimas123, faisal/faisal123
- 6 lapis anti-curang aktif: QR dinamis 20s, PIN sesi, geo-fencing (offline only), device fingerprint, selfie VLM (opsional), time window

---
Task ID: FE-1
Agent: full-stack-developer
Task: Add dark mode, improve styling, add extension request UI, real-time attendee counter

Work Log:
- Wrapped children in `<ThemeProvider attribute="class" defaultTheme="light">` in layout.tsx (next-themes already installed)
- Created theme-toggle.tsx (sun/moon button with rotate/scale transition)
- Added ThemeToggle next to user dropdown in header.tsx
- Updated qr-display.tsx with live clock, attendee counter, gradient glow effect
- Created request-extension.tsx: student dialog for extension requests
- Created extension-requests.tsx: teacher review view
- Updated student-dashboard.tsx: extension request buttons and history
- Updated teacher-dashboard.tsx: 6th tab "Permintaan"
- Updated landing.tsx hero with animated gradient blobs
- Applied hover lift + shadow effects across components

Stage Summary:
- Dark mode fully working
- QR display now has live clock + real-time attendee counter
- Extension requests (student→teacher) working
- All existing functionality preserved

---
Task ID: QA-1 + FE-2
Agent: main
Task: QA testing, bug fixes

Work Log:
- Fixed: AttendanceFlow modal infinite loop (Maximum update depth exceeded)
- Fixed: Active session status overrides time window
- Verified: Student login, attendance, extension requests, QR display
- Verified: Teacher dashboard all 6 tabs

Stage Summary:
- All bugs fixed
- All features verified

---
Task ID: 2
Agent: main
Task: Continue project - fix missing packages, add new features

Work Log:
- Fixed missing packages (html5-qrcode, qrcode)
- Added allowedDevOrigins to next.config.ts
- Server back to working state

Stage Summary:
- Foundation fixed and ready for new feature development
- Next: bulk session creation, calendar heatmap, izin system, student profile

---
Task ID: 2
Agent: full-stack-developer
Task: Add bulk session creation feature for teachers

Work Log:
- Created POST /api/sessions/bulk backend route (src/app/api/sessions/bulk/route.ts)
  - Accepts courseId, date (YYYY-MM-DD), topicOfDay, sessions[] array
  - Teacher auth via getCurrentTeacher()
  - Auto-generates sessionNumber, sessionPin, qrSecret per session
  - Validates date, time ranges, course existence; max 30 sessions per batch
  - Returns created sessions count and array
- Created BulkSessionDialog component (src/components/pte/bulk-session-dialog.tsx)
  - Date picker + shared topicOfDay input
  - Two sections: "Jadwal Kelas Offline" and "Jadwal Kelas Online"
  - Each section has add/remove row with time range, teacher dropdown, platform/room fields
  - "Template Spreadsheet" button pre-fills 4 offline + 6 online sessions matching the user's spreadsheet
  - Live summary: "4 offline + 6 online = 10 sesi akan dibuat"
  - Teacher dropdown (Mr Dimas, Mr Faisal), platform select (Google Meet, Discord, Zoom)
  - Responsive layout, scrollable session rows, shadcn/ui components throughout
- Integrated into TeacherDashboard (src/components/pte/teacher-dashboard.tsx)
  - Added "Buat Banyak Sesi" button with Layers icon next to existing "Sesi Baru" button
  - Imported BulkSessionDialog with bulkOpen state, calls loadSessions() on success
- Lint passes with 0 errors, 0 warnings

Stage Summary:
- Teachers can now create all sessions for a day in one dialog (offline + online, mixed teachers/platforms)
- Spreadsheet template button saves time for the recurring 4+6 session pattern
- Backend validates and creates sessions atomically with auto-generated PIN/QR secret
- Dev server running clean, no errors

---
Task ID: 3+4
Agent: full-stack-developer
Task: Add student attendance calendar heatmap and izin (excused absence) system

Work Log:
- Created `src/app/api/student/calendar/route.ts` — GET endpoint returning 3-month calendar heatmap data (current month + 2 previous months) with day-level attendance status (present/late/excused/missed/future/none), session info, and aggregated stats
- Created `src/components/pte/attendance-calendar.tsx` — Full calendar heatmap component with:
  - 3-month vertical stack with Mon-Sun grid layout
  - Color-coded cells: green (present), amber (late), purple (excused), red (missed), gray (future)
  - Responsive sizing: 32px on mobile, 40px on desktop
  - Stats summary row (hadir/terlambat/izin/tidak hadir counts)
  - Legend with color swatches
  - Click-to-view Popover with date details, session info, and notes
  - Collapsible card with loading skeletons
  - Uses date-fns for locale-aware formatting (id locale)
- Updated `src/components/pte/student-dashboard.tsx`:
  - Imported and placed AttendanceCalendar between quota card and today/upcoming sections
  - Added "Izin" stat card (purple tone, shown only when excused > 0)
  - Added 'purple' tone variant to StatCard component
- Updated `src/app/api/student/dashboard/route.ts`:
  - Added `excused` count to stats (counted from all attendances, not just verified)
- Updated `src/lib/types.ts`:
  - Added `excused: number` to StudentDashboard.stats
- Created `src/app/api/sessions/[id]/excused/route.ts` — POST endpoint for teacher to mark student absence as excused:
  - Teacher auth required
  - Creates new attendance record (verified=false, status=excused) or updates existing absent record
  - Notes prefixed with "Izin: " + reason
  - Excused absences do NOT consume quota (verified stays false)
  - Prevents marking already-present/late/excused students
- Updated `src/components/pte/attendees-view.tsx`:
  - Added "Izin" button (purple outline) next to absent/missing students
  - Added Izin Dialog with student info, quick reason chips (Sakit, Urusan keluarga, etc.), and free-text textarea
  - Added excused count to summary stats (5 columns now)
  - Updated excused status style to purple colors
  - After marking izin, automatically refreshes the attendees list
  - Toast notifications for success/error
- All lint checks pass, dev server compiling cleanly

Stage Summary:
- Student attendance calendar heatmap: fully implemented with 3-month view, color coding, stats, legend, and interactive popovers
- Izin (excused absence) system: fully implemented with teacher-side marking dialog and student-side calendar visibility
- Excused absences do not consume student quota
- Both features integrated into existing UI seamlessly
---
Task ID: 2 (continuation)
Agent: main
Task: Fix environment issues, verify new features, final integration

Work Log:
- Fixed missing npm packages (html5-qrcode, qrcode, @types/qrcode)
- Added allowedDevOrigins to next.config.ts to fix cross-origin warnings
- Regenerated Prisma client (bun run db:generate + db:push) to fix stale client
- Verified all new files created by subagents:
  - src/app/api/sessions/bulk/route.ts (bulk session creation API)
  - src/app/api/student/calendar/route.ts (calendar heatmap API)
  - src/app/api/sessions/[id]/excused/route.ts (izin/excused absence API)
  - src/components/pte/bulk-session-dialog.tsx (bulk session creation UI)
  - src/components/pte/attendance-calendar.tsx (calendar heatmap UI)
- Verified proper integration:
  - BulkSessionDialog integrated in teacher-dashboard.tsx (Layers button)
  - AttendanceCalendar integrated in student-dashboard.tsx (between quota and today)
  - Izin button integrated in attendees-view.tsx (ShieldCheck purple button)
  - Student stats show excused count (purple StatCard when > 0)
  - stats.excused added to StudentDashboard types and API
- Final lint: 0 errors, 0 warnings

Stage Summary:
- All 3 major new features verified and properly integrated
- Bulk Session Creation: teacher can create 4 offline + 6 online sessions at once with "Template Spreadsheet" button
- Calendar Heatmap: 3-month attendance calendar with color-coded days (present/late/excused/missed/future), interactive popovers, stats
- Izin System: teacher marks absent students as excused (doesn't consume quota), quick reason chips, student sees on calendar
- Total API routes: 13 endpoints serving student/teacher/admin flows
- Total PTE components: 17 frontend components
- Sandbox networking limitation prevented agent-browser E2E verification, but server compiles and serves requests cleanly
