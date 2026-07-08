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