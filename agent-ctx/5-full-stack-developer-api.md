---
Task ID: 5
Agent: full-stack-developer-api
Task: Rewrite all API routes for simplified QR-only schema

Work Log:
- Updated setup/route.ts — removed room, geoRadiusM, requiredFactors from course creation
- Updated sessions/route.ts — removed generateSessionPin import, geo/pin/sessionPin fields, added maxAttendees support (default 10), room no longer falls back to course.room
- Updated sessions/bulk/route.ts — removed generateSessionPin import, geo/pin references, added per-session and global maxAttendees support (default 10)
- Rewrote sessions/[id]/attendance/route.ts for QR-only — complete rewrite with checks: qr, time, quota, daily, capacity; no geo/selfie/device/pIN; simple attendance record (sessionId, studentId, status, checkInTime, dayKey, qrVerified, verified, notes)
- Updated sessions/[id]/attendees/route.ts — removed method, factorsPassed, factorsRequired, geoVerified, geoDistanceM, pinVerified, selfieVerified, flagged, ipAddress from output; kept only id, status, checkInTime, verified, qrVerified, notes
- Updated sessions/[id]/qr/route.ts — removed sessionPin from response, added maxAttendees to session response, used QR_ROTATION_SECONDS constant
- Updated sessions/[id]/excused/route.ts — removed method: 'button' from attendance create
- Updated student/dashboard/route.ts — removed requiredFactors from course response, added maxAttendees and attendeeCount (via db.attendance.groupBy) to each session in dayGroups
- Updated students/route.ts — removed flaggedCount from student rows and flagged from attendance select
- Updated reports/course/route.ts — removed all flagged references from perStudent and overall sections
- sessions/[id]/extend/route.ts — no changes needed (kept as-is)
- Lint passed with zero errors

Stage Summary:
- All 10 API route files updated to match simplified QR-only Prisma schema
- QR-only attendance with maxAttendees capacity check added
- All imports verified correct against updated lib/security.ts exports
- No reference to removed fields (method, deviceFingerprint, ipAddress, geoLat, geoLng, geoVerified, geoDistanceM, selfieVerified, selfieImageUrl, pinVerified, factorsPassed, factorsRequired, flagged, sessionPin, requiredFactors, locationLat, locationLng, geoRadiusM, room on Course, DeviceLog model)