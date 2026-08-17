# Perubahan Sistem Pengurangan Kuota Student 

Ubah mekanisme pengurangan kuota student dengan ketentuan berikut. 

## 1. Pengurangan Kuota Harian 

- Sistem **tidak lagi mengurangi kuota setelah student melakukan absensi** . 

- Kuota student harus **berkurang sebanyak 1 kuota setiap hari** secara otomatis. 

- Pengurangan kuota dilakukan berdasarkan tanggal/hari, **bukan berdasarkan absensi** . 

- Student **tidak perlu melakukan absensi terlebih dahulu** agar kuotanya berkurang. 

- Pastikan dalam satu hari kuota hanya dapat berkurang **maksimal 1 kali per student** untuk mencegah double deduction. 

- Jika kuota student sudah 0, jangan mengurangi menjadi nilai negatif. 

## 2. Fitur "Izin" 

Tambahkan tombol **"Izin"** pada bagian atas panel/dashboard student agar mudah ditemukan. 

Ketentuan fitur izin: 

- Student dapat menekan tombol **"Izin"** untuk mengecualikan dirinya dari pengurangan kuota pada hari tersebut. 

- Jika student telah mengajukan izin dan izin tersebut valid/diterima, maka **kuota tidak dikurangi pada hari tersebut** . 

- Setiap akun student memiliki batas penggunaan izin sebanyak **maksimal 5 kali** . 

- Sistem harus mencatat jumlah izin yang telah digunakan oleh masingmasing student. 

- Student tidak dapat menggunakan izin lagi jika kuota penggunaan izin sudah mencapai 5 kali. 

- Cegah student menggunakan izin lebih dari 1 kali untuk tanggal yang sama. 

- Tampilkan informasi jumlah izin yang tersisa, misalnya: **"Sisa izin: 3/5"** . 

## 3. Fitur "Ajukan Permintaan Cuti Kelas" 

Tambahkan fitur **"Ajukan Permintaan Cuti Kelas"** pada panel student disamping tombol buat permintaan kuota. 

Student harus mengisi: 

- Alasan cuti. 

- Tanggal mulai cuti. 

- Tanggal selesai cuti. 

### Ketentuan: 

- Alasan cuti wajib diisi dan harus memiliki penjelasan yang cukup/masuk akal. 

- Pengajuan cuti harus dilakukan **paling lambat 3 hari sebelum tanggal mulai cuti** . 

- Pengajuan yang kurang dari 3 hari sebelum tanggal mulai cuti harus ditolak oleh sistem. 

- Pengajuan cuti harus memiliki status, minimal: 

   - pending 

   - approved 

   - rejected 

- Pengajuan pending harus dapat dilihat dan diproses oleh **admin/tutor** . 

- Admin/tutor dapat menyetujui atau menolak pengajuan cuti. Admin/Tutor juga bisa melihat student yang sedang cuti sudah berapa hari lagi mengikuti kelas. 

- Jika ditolak, student harus dapat melihat status bahwa pengajuannya ditolak. 

- Jika disetujui, periode cuti menjadi periode yang dikecualikan dari pengurangan kuota. 

## 4. Dampak Cuti terhadap Kuota 

Jika pengajuan cuti student telah **disetujui oleh admin/tutor** : 

- Kuota **tidak boleh berkurang selama periode cuti** . 

- Pengurangan kuota tidak dilakukan pada tanggal mulai cuti sampai tanggal selesai cuti. 

- Setelah periode cuti selesai, sistem kembali melakukan pengurangan kuota harian seperti biasa. 

- Hari cuti yang telah disetujui **tidak dihitung sebagai penggunaan fitur "izin"** . 

- Cuti yang ditolak **tidak memberikan pengecualian pengurangan kuota** . 

## 5. Prioritas Pengecualian Kuota 

Saat sistem menjalankan proses pengurangan kuota harian, lakukan pengecekan dengan urutan: 

1. Apakah student sedang dalam periode cuti yang **approved** ? 

`o` Jika ya → **jangan kurangi kuota** . 

2. Jika tidak sedang cuti, apakah student memiliki **izin valid untuk hari tersebut** ? 

`o` Jika ya → **jangan kurangi kuota** . 

3. Jika tidak ada cuti atau izin → **kurangi kuota sebanyak 1** . 

4. Pastikan proses tersebut hanya berjalan **satu kali per student per hari** . 

## 6. Perubahan Database 

Sebelum melakukan perubahan kode, periksa struktur database yang sudah ada. 

Jangan membuat tabel/field baru jika sebenarnya sudah tersedia dan dapat digunakan kembali. 

Jika diperlukan, tambahkan struktur untuk menyimpan: 

- jumlah izin yang telah digunakan student; 

- tanggal penggunaan izin; 

- pengajuan cuti; 

- alasan cuti; 

- tanggal mulai dan selesai cuti; 

- status pengajuan cuti; 

- admin/tutor yang memproses pengajuan; 

- waktu pengajuan, persetujuan, atau penolakan. 

Gunakan struktur database dan naming convention yang konsisten dengan project saat ini. 

## 7. Backend dan Security 

Jangan hanya menerapkan aturan pada frontend. 

Semua validasi berikut harus dilakukan di **backend/server** : 

- batas maksimal 5 kali izin; 

- izin hanya dapat digunakan untuk tanggal yang valid; 

- pencegahan duplicate izin; 

- batas pengajuan cuti minimal 3 hari sebelumnya; 

- validasi tanggal mulai dan selesai; 

- status approval cuti; 

- pengurangan kuota harian; 

- pengecualian kuota berdasarkan izin/cuti. 

Student tidak boleh dapat memanipulasi request dari frontend untuk mengubah kuota, jumlah izin, atau status cuti. 

## 8. Dampak terhadap Sistem yang Sudah Ada 

Sebelum mengubah kode: 

1. Analisis terlebih dahulu bagaimana sistem absensi saat ini mengurangi kuota. 

2. Cari seluruh API, server action, function, cron/job, database query, atau komponen frontend yang berkaitan dengan pengurangan kuota. 

3. Identifikasi seluruh dependency yang terdampak. 

4. Hapus/ubah mekanisme pengurangan kuota yang sebelumnya bergantung pada absensi. 

5. Pastikan sistem absensi tetap berfungsi normal setelah mekanisme pengurangan kuota diubah. 

6. Jangan mengubah fitur lain yang tidak berkaitan dengan requirement ini. 

## 9. Testing 

Setelah implementasi selesai, lakukan testing terhadap minimal skenario berikut: 

- Student normal → kuota berkurang 1 setiap hari. 

- Student melakukan absensi → kuota tetap hanya berkurang 1 kali, bukan tambahan pengurangan. 

- Student tidak melakukan absensi → kuota tetap berkurang 1. 

- Student menggunakan izin → kuota tidak berkurang pada hari tersebut. 

- Student mencoba menggunakan izin lebih dari 5 kali → ditolak. 

- Student mencoba menggunakan izin dua kali pada tanggal yang sama → ditolak. 

- Student mengajukan cuti lebih dari 3 hari sebelumnya → dapat diajukan. 

- Student mengajukan cuti kurang dari 3 hari sebelumnya → ditolak. 

- Admin/tutor menyetujui cuti → kuota tidak berkurang selama periode cuti. 

- Admin/tutor menolak cuti → kuota tetap mengikuti aturan normal. 

- Student berada dalam periode cuti → tidak ada pengurangan kuota. 

- Setelah cuti selesai → pengurangan kuota kembali normal. 

- Pastikan satu student tidak mengalami double deduction pada tanggal yang sama. 

- Pastikan kuota tidak pernah menjadi angka negatif. 

## 10. Prinsip Implementasi 

Sebelum coding, **jelaskan terlebih dahulu kepada saya** : 

1. Bagaimana mekanisme pengurangan kuota saat ini bekerja. 

2. File/API/function mana saja yang akan diubah. 

3. Perubahan database/schema yang diperlukan. 

4. Bagaimana mekanisme pengurangan kuota harian akan dijalankan. 

5. Bagaimana sistem menentukan apakah student mendapat pengecualian karena izin atau cuti. 

6. Potensi edge case yang ditemukan. 

Setelah analisis disetujui, implementasikan perubahan secara bertahap. 

Setelah implementasi, jalankan testing dan debugging sampai seluruh acceptance criteria di atas terpenuhi. Jangan menganggap fitur selesai hanya karena tidak terdapat error pada saat build. 

**Ada satu hal penting yang perlu Anda pastikan:** istilah **"izin"** dan **"cuti"** sebaiknya memang dibuat sebagai dua mekanisme berbeda. 

- **Izin** → pengecualian **1 hari** , maksimal 5 kali per akun. 

- **Cuti kelas** → pengecualian **beberapa hari** , harus diajukan dan disetujui admin/tutor. 

Saya juga sengaja menambahkan aturan **"3 hari sebelumnya"** sebagai validasi backend. Misalnya cuti mulai **10 Agustus** , maka pengajuan harus sudah masuk paling lambat **7 Agustus** . Jika maksud Anda berbeda—misalnya _minimal 3 hari kerja_ atau _3×24 jam_ —aturan itu sebaiknya ditentukan secara eksplisit karena implementasinya berbeda. 

