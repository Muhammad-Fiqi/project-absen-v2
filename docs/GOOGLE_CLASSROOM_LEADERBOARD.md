# Google Classroom Leaderboard

Alur sinkronisasi:

```text
Google Classroom -> Apps Script -> POST /api/integrations/google-classroom/sync -> Turso -> /api/leaderboard -> dashboard
```

## Konfigurasi

Tambahkan secret yang sama di environment Next.js dan Apps Script:

```env
GOOGLE_CLASSROOM_SYNC_SECRET=isi-secret-panjang-dan-acak
```

Isi konfigurasi di `script.gs`:

```js
NEXT_API_URL: 'https://DOMAIN-ANDA.com/api/integrations/google-classroom/sync',
NEXT_API_SECRET: 'isi-secret-yang-sama'
```

Leaderboard memakai roster Google Classroom untuk course `872792240658`. Data disimpan terpisah dari tabel `Student` aplikasi. Identitas utamanya adalah `Classroom User ID`; nama, email Classroom, daftar coursework, status pengumpulan, dan total `assignedGrade` ditampilkan sebagai data leaderboard.

## Payload Apps Script

Kirim request dengan header `Authorization: Bearer <secret>` atau `x-appscript-secret: <secret>`:

```js
const response = UrlFetchApp.fetch('https://DOMAIN-ANDA.com/api/integrations/google-classroom/sync', {
  method: 'post',
  contentType: 'application/json',
  headers: { Authorization: 'Bearer ' + SYNC_SECRET },
  payload: JSON.stringify({
    students: [
      {
        classroomUserId: 'google-user-id',
        name: 'Nama dari Classroom',
        email: 'student@example.com',
        avatarUrl: 'https://lh3.googleusercontent.com/...',
        points: 865,
        missionsCompleted: 8,
        totalMissions: 10,
        progress: [
          { id: 'coursework-1', name: 'Tugas 1', submitted: true, points: 85, maxPoints: 100 },
        ],
      },
    ],
    courseId: '872792240658',
  }),
  muteHttpExceptions: true,
});
Logger.log(response.getContentText());
```

Pengiriman ulang data bersifat idempotent: poin di-update berdasarkan kombinasi `courseId` dan `classroomUserId`, bukan dibuat sebagai baris duplikat. Siswa yang sudah tidak ada di roster terbaru akan dihapus dari leaderboard.

Fungsi `syncLeaderboardToNextJs()` dapat dijalankan langsung dari editor Apps Script tanpa argumen. Fungsi akan mengambil roster dan coursework terbaru secara otomatis. Pastikan `NEXT_API_URL` dan `NEXT_API_SECRET` sudah diisi terlebih dahulu.


## Cara kerja angka coursework

- `totalMissions` adalah jumlah semua coursework yang dikembalikan `getAllCourseWork()`, termasuk coursework tanpa `maxPoints`.
- `missionsCompleted` bertambah satu jika status submission siswa adalah `TURNED_IN` atau `RETURNED`.
- `points` adalah jumlah seluruh `assignedGrade` numerik siswa.
- Coursework yang sudah dikumpulkan tetapi belum dinilai tetap menambah `missionsCompleted`, tetapi tidak menambah `points`.
- `progress` berisi nama tugas, status pengumpulan, nilai siswa, dan `maxPoints` untuk setiap coursework.
- `avatarUrl` berasal dari `student.profile.photoUrl` Google Classroom dan digunakan sebagai avatar leaderboard.

Untuk mengubah definisinya, edit fungsi `getAllCourseWork()` atau `calculateStudentProgress()` di `script.gs`.

## Endpoint dashboard

- `GET /api/leaderboard`: student, admin, dan pengajar melihat daftar roster Classroom yang tersinkron.
- Student: tab leaderboard tersedia di dashboard student.
- Admin/pengajar: tab `Leaderboard` tersedia di panel masing-masing.

Data tidak diperbarui realtime. Apps Script mengambil data saat trigger atau fungsi sinkronisasi dijalankan, kemudian menyimpannya di database. Halaman leaderboard mengambil snapshot database saat dibuka atau tombol `Refresh` ditekan. Jadi perubahan nilai atau submission baru terlihat setelah sinkronisasi Apps Script selesai, lalu halaman direfresh.

Setelah deploy, restart aplikasi sekali agar `ensureDummyTables()` membuat tabel `ClassroomLeaderboard` di Turso. Student perlu join Classroom melalui `https://classroom.google.com/c/872792240658`, lalu menunggu sinkronisasi Apps Script berikutnya.
