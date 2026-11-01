# 📋 Panduan Instalasi — MEvent (Manajemen Event Sekolah)

MEvent terdiri dari dua bagian:

| Bagian | Isi | Dipasang di |
|---|---|---|
| **Backend** | `Kode.gs`, `Admin.gs`, `Demo.gs` | Google Apps Script (akun Google sekolah) |
| **Frontend** | `index.html`, `css/`, `js/` (isi ZIP ini) | GitHub Pages |

Kerjakan berurutan: **Backend dulu → salin URL → Frontend**.

---

## Bagian A — Backend (Google Apps Script)

1. Buka **https://script.google.com** → **Proyek baru**. Beri nama proyek, misalnya `MEvent`.
2. Buat **3 berkas** lalu tempel isinya:
   - Berkas bawaan `Kode.gs` → hapus isinya, tempel seluruh **Kode.gs**.
   - Klik **＋ → Skrip** → beri nama `Admin` → tempel seluruh **Admin.gs**.
   - Klik **＋ → Skrip** → beri nama `Demo` → tempel seluruh **Demo.gs**.
   - Tekan **Ctrl+S** (simpan).
3. Jalankan **setup SEKALI saja**:
   - Di bilah atas, pilih fungsi **`setupAwal`** → klik **▶ Jalankan**.
   - Klik **Tinjau izin** → pilih akun → **Lanjutan** → **Buka MEvent (tidak aman)** → **Izinkan**.
     (Peringatan ini normal untuk skrip buatan sendiri.)
   - Buka **Log eksekusi**: harus muncul `✅ Setup selesai!`.
   - Di Google Drive kini ada folder **📁 MEvent** berisi spreadsheet **MEvent_DB** dan folder Logo, Foto, Berkas, dll.
   - Bila `setupAwal` dijalankan lagi, data **tidak** dibuat ulang — fungsi hanya memperbarui struktur sheet ke versi terbaru.
4. **Deploy sebagai Web App**:
   - Klik **Terapkan → Deployment baru** → ikon roda gigi → **Aplikasi web**.
   - **Jalankan sebagai:** *Saya* · **Siapa yang memiliki akses:** *Siapa saja*.
   - Klik **Terapkan** → salin **URL aplikasi web** (berakhiran **`/exec`**).

> 💡 Zona waktu kode sudah diatur ke **WITA (Asia/Makassar)**.

---

## Bagian B — Frontend (GitHub Pages)

1. Ekstrak ZIP. **Folder hasil ekstraksi inilah folder proyek** — isinya langsung `index.html`, `css/`, `js/`.
2. Buka **`js/config.js`** dengan Notepad, ganti teks `PASTE_URL_WEB_APP_DI_SINI` dengan URL `/exec` dari langkah A4, lalu simpan:
   ```js
   const GAS_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
   ```
3. Buka PowerShell **di folder hasil ekstraksi itu** (di File Explorer: klik address bar → ketik `powershell` → Enter), lalu pastikan `dir` menampilkan `index.html` di baris paling atas. **Jangan** jalankan perintah git di folder induknya.
4. Buat repository baru di GitHub (**Public**, tanpa README), lalu jalankan satu per satu:
   ```bash
   git init
   git add .
   git commit -m "Upload pertama MEvent"
   git branch -M main
   git remote add origin https://github.com/USERNAME/mevent.git
   git push -u origin main
   ```
   Saat diminta *Password*, tempel **Personal Access Token** (bukan sandi akun GitHub). Layar memang tidak menampilkan karakter apa pun saat menempel — itu normal.
5. Di GitHub: **Settings → Pages** → *Deploy from a branch* → **main / (root)** → **Save**, lalu centang **Enforce HTTPS**.
6. Tunggu 1–2 menit. Situs tersedia di `https://USERNAME.github.io/mevent/`.

---

## Bagian C — Penggunaan Pertama

1. Buka situs → **Admin / Panitia** → tab **Admin** → username **`admin`**, kata sandi **`admin123`**.
   - Halaman awal hanya berisi login **Admin / Panitia** dan Formulir. Login voting siswa, PTK, dan juri **tidak** ada di halaman awal — semuanya lewat link yang dibagikan admin (lihat tabel di bawah).
   - **Panitia (PTK)** masuk lewat tab **Panitia (PTK)** pada halaman yang sama.
2. **Segera ganti** kata sandi: **Pengaturan › Akun**.
3. **Pengaturan › Umum**: isi identitas sekolah, kota tanda tangan, dan pilih **Kepala Sekolah** (setelah data PTK diisi).
4. **Pengaturan › Kop Surat**: unggah **logo sekolah** (kanan) dan **logo yayasan/dinas** (kiri), atur baris kop. Logo PNG berlatar transparan tetap transparan (tidak berlatar hitam).
5. **Data Siswa → Unduh Template Excel → Impor Excel** (format: Nama | Jenis Kelamin | NISN | Tempat Lahir | Tanggal Lahir | Kelas).
6. **Data PTK → Impor Excel** (Nama | Tanggal Lahir | NIP/NIY/NUPTK | Jabatan), lalu **Kata Sandi Massal** → cetak kartunya.
7. Ingin mencoba dulu? **Pengaturan › Mode Demo → Mulai Demo**. Data contoh dibuat terpisah dan dihapus saat demo diakhiri.

### Link yang dibagikan admin (tombol **Bagikan Link** di halaman event)
| Link | Untuk | Isi halaman |
|---|---|---|
| **Link Voting OSIS** | Siswa & PTK | Tab **Siswa** (NISN) dan **PTK** (nama + kata sandi). Setelah memilih, layar kembali ke login siswa — cocok untuk HP/laptop yang dipakai bergantian. |
| **Link Voting & Penilaian Lomba** | Siswa & Juri | Tab **Siswa** (kelas → nama) dan **Juri** (PTK / juri tamu → lembar penilaian). |
| **Link Formulir** | Pendaftar | Satu link per formulir, juga dari ikon QR di tab Formulir. |
| **Link Layar Hasil** | IFP / proyektor | Terbuka **tanpa login admin**, jadi admin tetap bisa memakai aplikasi di laptopnya. Tombol **Ganti Link** membatalkan link lama. |

Setiap link punya **kode QR** (tombol *QR Besar* untuk ditampilkan di layar agar siswa cukup memindai).

### Alur hari-H pemilihan OSIS
1. Event OSIS → tab **Calon** → pilih **Sistem Pencalonan**:
   - **Pasangan** — Ketua & Wakil maju dalam satu nomor urut.
   - **Calon Tunggal** — setiap calon maju sendiri; **suara terbanyak = Ketua, terbanyak kedua = Wakil Ketua**.
2. Tambah calon + foto → nyalakan **Voting** → **Bagikan Link** voting ke perangkat pemilih.
3. Buka **Link Layar Hasil** di IFP. Layar mula-mula hanya menampilkan **jumlah suara masuk**.
4. Saat pengumuman, tekan **Tampilkan Hasil** (atau tombol Spasi): hitung mundur + drumroll, grafik persentase tumbuh, lalu fanfare, tepuk tangan, dan konfeti. **Umumkan Pemenang** menampilkan nama pemenang satu per satu.
5. Matikan voting → tab **Hasil** → cetak **Rekap** & **Berita Acara** (otomatis menyebut Ketua & Wakil untuk sistem calon tunggal).

> 🔊 Efek suara berasal dari perangkat yang menampilkan layar (IFP/laptop). Pastikan volume IFP menyala. Ikon speaker di layar untuk mematikan/menyalakan efek suara.

### Kehadiran lomba
Tab **Kehadiran** pada event lomba menampilkan kolom **Lomba yang di-voting** untuk setiap siswa (beserta lomba yang diikuti sebagai peserta) dan ringkasan jumlah siswa yang sudah voting per cabang. Informasi yang sama ikut ke **Excel** dan **cetak Daftar Hadir**.

### Alur lomba
Event Lomba → **Cabang & Peserta** (mode Juri/Voting/Gabungan + bobot) → **Juri & Kriteria** → bagikan **Link Voting & Penilaian Lomba** → **Kunci Penilaian** → tab **Hasil** (tetapkan urutan bila seri) → **Cetak Piagam Juara**. Di layar hasil, tombol nama cabang (atau panah ← →) berpindah cabang seketika.

---

## Bagian D — Memperbarui Aplikasi

**Backend** (bila ada perubahan `.gs`):
1. Ganti isi `Kode.gs`, `Admin.gs`, `Demo.gs` dengan versi baru → **Ctrl+S**.
2. Jalankan **`setupAwal`** sekali lagi → hanya memperbarui struktur sheet (menambah kolom baru), data tetap aman.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.**
⚠️ Jangan memilih *Deployment baru* — URL `/exec` akan berubah dan aplikasi berhenti bekerja.

> **Dari versi sebelumnya ke 1.3:** lakukan 3 langkah di atas, lalu perbarui frontend (isi ulang `GAS_URL`). Data lama tetap terbaca; kehadiran dari voting kini dihitung otomatis dari daftar pemilih, jadi tidak ada data yang perlu dipindahkan.

**Frontend** (bila ada perubahan di `css/` atau `js/`):
1. Bila mengubah kode sendiri, naikkan angka versi di `index.html` (mis. `?v=1.1.0` → `?v=1.1.1`) dan `APP_VER` di `js/core.js` agar HP pengguna langsung memuat versi baru. (Paket 1.3.0 ini sudah dinaikkan.)
   Jangan lupa isi ulang `GAS_URL` di `js/config.js` bila berkas itu ikut tertimpa.
2. Jalankan dari folder proyek:
   ```bash
   git add .
   git commit -m "Perbarui MEvent"
   git push
   ```

---

## Bagian E — Tips Kecepatan

- Aplikasi memakai cache di perangkat (tampil seketika), cache server berversi, dan satu panggilan untuk satu layar.
- Saklar (buka/tutup voting, kunci penilaian, sistem pencalonan) dan nilai juri langsung berubah di layar lalu disimpan di latar; bila server menolak, tampilan dikembalikan dan muncul pesan.
- Suara yang masuk tidak lagi membatalkan cache halaman awal & daftar siswa, sehingga login dan halaman voting tetap cepat saat ramai.
- Saat hari-H, Apps Script yang lama tidak dipakai bisa "dingin" (1–3 detik di panggilan pertama). Aplikasi otomatis mengirim *ping* pemanas saat dibuka. Bila ingin selalu hangat, buat pemicu: **Pemicu → Tambah pemicu → fungsi `warmup` → Berbasis waktu → Setiap 10 menit**.
- Untuk melihat kecepatan, buka Console browser (F12) lalu ketik `Perf.table()`.

---

## Bagian F — Jika Ada Kendala

| Gejala | Penyebab | Solusi |
|---|---|---|
| Layar "URL server belum diatur" | `js/config.js` belum diisi | Isi `GAS_URL`, lalu push ulang |
| "Server membalas HTTP … (bukan JSON)" | Akses web app bukan *Siapa saja*, atau URL salah | Edit deployment → akses *Siapa saja*; pastikan URL berakhiran `/exec` |
| "Aplikasi belum di-setup" | `setupAwal` belum dijalankan | Jalankan `setupAwal` sekali |
| Situs 404 di GitHub Pages | `index.html` tidak berada di root repository | Push dari folder yang berisi `index.html` langsung |
| Tampilan polos tanpa warna | Folder `css/` & `js/` tidak ikut | Push lewat terminal, jangan upload lewat web |
| Foto/logo tidak tampil | Akun Workspace melarang berbagi "siapa saja dengan link" | Minta admin Workspace mengizinkan berbagi tautan, atau unggah ulang |
| Logo PNG berlatar **hitam** (diunggah sebelum versi 1.3) | Gambar dari Google Drive kehilangan transparansi | Jalankan `setupAwal` sekali (memperbaiki otomatis) atau **Ganti** logo di Pengaturan › Kop Surat |
| Siswa/PTK tidak menemukan menu voting di halaman awal | Sejak 1.3, voting hanya lewat link | Bagikan **Link Voting** dari tombol **Bagikan Link** di halaman event |
| PTK "Kata sandi belum diatur" | PTK belum punya sandi | Data PTK → ikon kunci, atau Kata Sandi Massal |
| Perubahan belum muncul | Cache browser | Ctrl+Shift+R atau naikkan `?v=` di `index.html` |
| Layar IFP: "Link layar tidak berlaku" | Link diganti admin, atau link Mode Demo setelah demo diakhiri | Buka **Bagikan Link** lalu pakai link layar yang baru |
| Layar IFP tidak bersuara | Volume IFP mati, atau ikon speaker di layar dimatikan | Nyalakan volume; suara berbunyi setelah tombol *Tampilkan Hasil* ditekan |
| Link voting: "Event tidak ditemukan" | Status event bukan *Berjalan* | Ubah status event menjadi Berjalan |
