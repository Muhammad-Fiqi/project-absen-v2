Hasil pengukuran lengkap memperkuat bahwa website memang mengalami perlambatan nyata.

## Temuan utama

| Komponen | Hasil |
|---|---:|
| Redirect `ruangpte.com → www.ruangpte.com` | Ada |
| DNS/connect awal | ± **2,55 detik** |
| Time to first byte halaman | ± **6,68 detik** |
| Total halaman awal | ± **6,80 detik** |
| Ukuran HTML awal | 18,26 KB |
| JavaScript terbesar | **847,6 KB** |
| JavaScript besar lainnya | 224,4 KB dan 112,6 KB |
| CSS terbesar | **145,2 KB** |
| Resource dengan durasi request | sekitar **4–7 detik** |

## Diagnosis sementara

### 1. Bundle JavaScript terlalu besar

File terbesar:

```text
/_next/static/chunks/cd1f9a3d97b583fd.js
847.638 bytes
```

Jika dikombinasikan dengan chunk JavaScript lain, browser harus mengunduh lebih dari **1,3 MB JavaScript** sebelum aplikasi dapat berjalan penuh. Untuk halaman yang hanya menampilkan layar awal “Memuat sesi…”, ukuran ini cukup mencurigakan.

Kemungkinan penyebabnya:

- Library baru ikut masuk ke bundle utama
- Komponen dashboard dimuat langsung di halaman awal
- Library chart, PDF, Excel, editor, ikon, atau kalender tidak di-`dynamic import`
- Seluruh kode role admin/guru/siswa ikut dikirim ke semua pengguna
- Dependency baru tidak dipisah berdasarkan halaman

### 2. Ada latency jaringan/origin yang tinggi

Bukan hanya ukuran file. Hampir setiap file statis juga membutuhkan beberapa detik untuk diambil. Ini mengindikasikan kemungkinan tambahan:

- Latency dari lokasi probe ke origin/CDN
- Cache Vercel tidak efektif atau cache header terlalu konservatif
- Domain melakukan redirect sebelum sampai ke halaman utama
- Ada konfigurasi middleware atau rewrite yang ikut memproses request
- Deployment/origin sedang lambat atau mengalami masalah regional

Header menunjukkan:

```text
cache-control: public, max-age=0, must-revalidate
```

Untuk asset Next.js yang memiliki nama file dengan hash, konfigurasi cache seperti ini patut diperiksa. Asset hash biasanya aman diberi cache jangka panjang, sehingga browser tidak perlu mengunduh ulang setiap kali.

### 3. Proses “Memuat sesi…” kemungkinan menunggu autentikasi/API

HTML awal berhasil dikirim, tetapi aplikasi menampilkan:

```text
Memuat sesi…
```

Artinya hambatan yang dirasakan pengguna bisa terjadi setelah HTML diterima, misalnya:

- Pemanggilan endpoint session/auth terlalu lambat
- Request database dijalankan sebelum halaman utama dirender
- Request session gagal dan diulang berkali-kali
- Middleware autentikasi memproses terlalu banyak hal
- Beberapa request API berjalan serial, bukan paralel

### 4. Redirect `www` sebaiknya dirapikan

Saat ini:

```text
https://ruangpte.com
→ https://www.ruangpte.com/
```

Redirect tunggal tidak biasanya menyebabkan 6 detik sendiri, tetapi menambah satu koneksi dan memperburuk kondisi jika latency jaringan sedang tinggi. Pilih satu domain kanonis dan pastikan domain lainnya hanya melakukan redirect cepat.

## Kesimpulan

Kemungkinan terbesar bukan resource metadata SEO. Metadata yang terlihat—title, description, keywords, Open Graph—hanya berukuran kecil dan tidak menjelaskan perlambatan beberapa detik.

**Prioritas penyebab saat ini:**

1. **Bundle JS 847 KB yang kemungkinan bertambah setelah update**
2. **Proses autentikasi/session atau API yang menahan tampilan utama**
3. **Latency tinggi pada request Vercel/CDN**
4. **Konfigurasi cache asset dan redirect domain**
5. Kemungkinan resource pihak ketiga, walaupun dari HTML awal tidak terlihat banyak URL eksternal

## Urutan perbaikan yang saya rekomendasikan

1. Jalankan bundle analyzer dan cari isi file `cd1f9a3d97b583fd.js`.
2. Ubah komponen berat menjadi lazy-loaded/dynamic import.
3. Jangan memuat dashboard, chart, PDF, Excel, editor, dan komponen role lain di halaman awal.
4. Ukur endpoint session serta endpoint API utama secara terpisah.
5. Pastikan request session/API tidak diulang dan tidak berjalan serial.
6. Periksa middleware, rewrite, dan konfigurasi domain `www`.
7. Pastikan asset `_next/static/*` menggunakan cache jangka panjang.
8. Bandingkan deployment terakhir dengan deployment sebelum update.

Saya belum dapat melakukan perbandingan deployment atau membaca runtime logs karena konektor Vercel yang aktif belum mengembalikan project/team `absen-ruangpte`. Jadi angka di atas berasal dari pengukuran langsung terhadap website produksi; indikasinya kuat, tetapi identifikasi file atau perubahan kode penyebabnya masih memerlukan akses ke deployment/repository project tersebut.