# FE-1 — Dark Mode + Styling + Extension Request UI

## Context
PTE Attendance System (Next.js 16 single-page app). Task FE-1: add dark mode, improve styling, add real-time attendee counter on QR display, add student extension-request flow, add teacher extension-request review.

## Files Modified
- `src/app/layout.tsx` — wrapped children in `<ThemeProvider attribute="class" defaultTheme="light">`
- `src/app/globals.css` — added `animate-blob` and `animate-gradient-x` keyframe utilities
- `src/components/pte/theme-toggle.tsx` — NEW: sun/moon toggle button (uses `resolvedTheme` to avoid hydration mismatch)
- `src/components/pte/header.tsx` — added ThemeToggle next to user menu, gradient logo badge with status dot, gradient text title
- `src/components/pte/qr-display.tsx` — REWRITE: added live clock card (HH:MM:SS WIB, updates every second), live attendee counter card with progress bar, polling for attendee count via 20s rotation fetch, glow effect on QR (gradient blur backdrop), session meta badges (mode/teacher/room/topicOfDay), skeleton loading state, fullscreen mode shows clock + attendee
- `src/components/pte/request-extension.tsx` — NEW: student dialog with requestedSessions buttons (5/10/15/20) + custom input, reason textarea (min 5 chars), summary card, list of previous requests (status badges), calls POST /api/extension-requests
- `src/components/pte/student-dashboard.tsx` — added "Minta Perpanjangan" button in exhausted banner (gradient) and expiring-soon banner (outline amber), gradient border wrapper for today's DayGroupCard, ExtensionRequestsSection at bottom showing pending/approved/denied counts and history list with reload button
- `src/components/pte/extension-requests.tsx` — NEW: teacher review view, filter buttons (pending/approved/denied/all), list with student info, review dialog with approve/deny actions, optional granted-sessions override, note field, auto-refresh every 30s, skeleton loading
- `src/components/pte/teacher-dashboard.tsx` — added 6th tab "Permintaan" between Siswa & Laporan, badge with pending count (auto-refreshes every 30s), animate-fade-in on all TabsContent
- `src/components/pte/landing.tsx` — animated gradient blobs in hero, gradient title text with animate-gradient-x, hover lift + shadow on feature cards and step cards, gradient hover on icon containers, hero buttons with shadow + scale-on-hover

## APIs Verified Working
- `GET /api/sessions/[id]/qr` returns `attendeeCount`, `totalStudents`, expanded `session` object (mode, platform, teacher, topicOfDay) — already implemented by R1-R10 backend
- `POST /api/extension-requests` — student creates request (1-50 sessions, reason ≥5 chars)
- `GET /api/extension-requests` — student gets own requests; teacher gets all (filter by `?status=`)
- `PATCH /api/extension-requests/[id]/review` — teacher approves/denies (with optional `grantedSessions` override + `note`)

## Issues Found & Fixed
- Prisma client was stale (didn't know about `extensionRequest` model). Fixed by running `bun run db:generate` + `bun run db:push` and restarting the dev server (killed PID 6184 — system didn't auto-restart, so started `bun run dev` manually with `nohup`).
- ESLint rule `react-hooks/set-state-in-effect` rejected the canonical `useEffect(() => setMounted(true), [])` pattern for next-themes hydration. Refactored ThemeToggle to use `resolvedTheme` directly (undefined on SSR + first client render = no mismatch with defaultTheme="light").

## Lint Status
`bun run lint` → PASS (0 errors, 0 warnings)
