---
Task ID: 1
Agent: main
Task: Eksplorasi & identifikasi file

Work Log:
- Membaca seluruh struktur project (schema, types, API routes, components)
- Mengidentifikasi file yang akan dihapus: selfie-capture.tsx, verify-selfie/route.ts, device.ts

Stage Summary:
- Peta lengkap dependency antar file tersusun

---
Task ID: 2
Agent: main
Task: Hapus file tidak digunakan

Work Log:
- Menghapus src/components/pte/selfie-capture.tsx
- Menghapus src/app/api/verify-selfie/route.ts
- Menghapus src/lib/device.ts

Stage Summary:
- 3 file dihapus

---
Task ID: 3
Agent: main
Task: Sederhanakan prisma schema

Work Log:
- Menghapus model DeviceLog
- Menghapus field geo, selfie, device, pin dari Session/Course/Attendance
- Menambahkan maxAttendees Int @default(10) ke Session
- qrSecret sekarang required (bukan optional)
- Regenerate client dan push schema

Stage Summary:
- Schema dari 7 model → 6 model
- Attendance field berkurang dari 15+ → 7

---
Task ID: 4
Agent: main
Task: Sederhanakan types.ts, security.ts

Work Log:
- types.ts: hapus AttendanceMethod, FactorsInfo, sederhanakan AttendanceSubmitRequest/Response
- security.ts: hapus generateSessionPin, haversineMeters, signPayload, verifySignature

Stage Summary:
- Types lebih bersih, hanya QR-related

---
Task ID: 5
Agent: full-stack-developer-api
Task: Rewrite semua API routes

Work Log:
- Updated setup/route.ts
- Updated sessions/route.ts (tambah maxAttendees)
- Updated sessions/bulk/route.ts (tambah maxAttendees)
- Rewrote sessions/[id]/attendance/route.ts (QR-only + capacity check)
- Updated sessions/[id]/attendees/route.ts
- Updated sessions/[id]/qr/route.ts (hapus sessionPin, tambah maxAttendees)
- Updated sessions/[id]/excused/route.ts
- Updated student/dashboard/route.ts (tambah maxAttendees, attendeeCount)
- Updated students/route.ts (hapus flaggedCount)
- Updated reports/course/route.ts (hapus flagged)

Stage Summary:
- Semua API routes cocok dengan schema baru
- Attendance check: QR + time + quota + daily + capacity

---
Task ID: 6
Agent: full-stack-developer-frontend
Task: Rewrite semua komponen frontend

Work Log:
- Rewrote attendance-flow.tsx (QR scan sederhana)
- Simplified landing.tsx (3 fitur, bukan 6)
- Updated teacher-dashboard.tsx (tambah input maxAttendees)
- Updated student-dashboard.tsx (hapus factor references)
- Updated attendees-view.tsx (sederhanakan)
- Updated students-manage.tsx (hapus flagged)
- Updated reports-view.tsx (hapus flagged)
- Updated bulk-session-dialog.tsx (tambah maxAttendees)

Stage Summary:
- UI QR-only, lebih bersih dan sederhana

---
Task ID: 10
Agent: main
Task: Buat SETUP.md lengkap

Work Log:
- Tulis SETUP.md 300+ baris
- Fokus Vercel + Turso
- Hanya pakai Bun (tidak npm/yarn/pnpm)
- Command spesifik per terminal (CMD/WSL)
- Termasuk instruksi hapus file tidak berguna
- Termasuk arsitektur diagram

Stage Summary:
- SETUP.md lengkap siap digunakan