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

1. Buka situs → langsung tampil halaman **Masuk** → tab **Admin** → username **`admin`**, kata sandi **`admin123`**.
   - Situs selalu dibuka di halaman login Admin / Panitia. Voting siswa, PTK, juri, dan formulir **hanya** lewat link yang dibagikan admin (lihat tabel di bawah).
   - **Panitia (PTK)** masuk lewat tab **Panitia (PTK)** pada halaman yang sama.
2. **Segera ganti** kata sandi: **Pengaturan › Akun**.
3. **Pengaturan › Umum**: isi identitas sekolah, kota tanda tangan, dan pilih **Kepala Sekolah** (setelah data PTK diisi).
4. **Pengaturan › Tampilan**: pilih warna tema — warna menu samping dan tombol mengikuti warna ini.
5. **Pengaturan › Kop Surat**: unggah **logo sekolah** (kanan) dan **logo yayasan/dinas** (kiri), atur baris kop. Logo PNG berlatar transparan tetap transparan (tidak berlatar hitam).
   Urutan baris kop diatur dengan menahan ikon ⋮⋮ lalu menggeser (atau fokus ikon itu dan tekan ↑/↓).
6. **Data Siswa → Unduh Template Excel → Impor Excel** (format: Nama | Jenis Kelamin | NISN | Tempat Lahir | Tanggal Lahir | Kelas).
7. **Data PTK → Impor Excel** (Nama | Tanggal Lahir | NIP/NIY/NUPTK | Jabatan), lalu **Kata Sandi Massal** → cetak kartunya.
8. **Mode gelap / terang**: ketuk ikon 🌙/☀️ di bilah atas (admin) atau di pojok kanan atas halaman login & link. Bawaannya mengikuti pengaturan HP/laptop; pilihan disimpan di perangkat masing-masing. Dokumen cetak, kop, piagam, dan layar hasil tetap tampil seperti aslinya.
9. Ingin mencoba dulu? **Pengaturan › Mode Demo → Mulai Demo**. Data contoh dibuat terpisah dan dihapus saat demo diakhiri.

### Link yang dibagikan admin (tombol **Bagikan Link** di halaman event)
| Link | Untuk | Isi halaman |
|---|---|---|
| **Link Voting OSIS** | Siswa & PTK | Tab **Siswa** (NISN) dan **PTK** (nama + kata sandi). Setelah memilih, layar kembali ke login siswa — cocok untuk HP/laptop yang dipakai bergantian. |
| **Link Voting & Penilaian Lomba** | Siswa & Juri | Tab **Siswa** (kelas → nama) dan **Juri**: tampil **daftar juri event ini saja** (PTK & juri tamu) — ketuk nama, isi kata sandi, Masuk. Tanpa mengetik/mencari nama. |
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

> 📺 Bila peserta banyak (lebih dari 8 di layar awal, atau lebih dari 6 saat hasil ditampilkan), layar hasil otomatis bisa **digulir**: 6 teratas tampil sebagai grafik, sisanya di daftar **Peringkat 7–dst.** di bawahnya. Tombol kendali melayang di pojok kanan bawah. Nama peserta selalu tampil utuh.

> 🔊 Efek suara berasal dari perangkat yang menampilkan layar (IFP/laptop). Pastikan volume IFP menyala. Ikon speaker di layar untuk mematikan/menyalakan efek suara.

> Menu **Kehadiran** dan **Cetak Dokumen** ada di dalam setiap event (tab *Kehadiran* dan *Cetak*), tidak lagi di menu samping.

### Kehadiran lomba
Tab **Kehadiran** pada event lomba menampilkan kolom **Lomba yang di-voting** untuk setiap siswa (beserta lomba yang diikuti sebagai peserta) dan ringkasan jumlah siswa yang sudah voting per cabang. Informasi yang sama ikut ke **Excel** dan **cetak Daftar Hadir**.

### Login Panitia (PTK) & Juri
Tidak perlu mengetik atau mencari nama: tab **Panitia (PTK)** di halaman awal menampilkan PTK yang menjadi panitia atau juri, dan tab **Juri** di link lomba hanya menampilkan juri event tersebut. Ketuk nama → isi **kata sandi** → **Masuk**. (Pada Link Voting OSIS, tab PTK tetap punya kolom cari karena berisi semua guru.)

### Alur lomba
Event Lomba → **Cabang & Peserta** (jadwal **Tanggal Mulai – Tanggal Selesai**, kosongkan tanggal selesai bila hanya 1 hari; mode Juri/Voting/Gabungan/Babak/Rank 1/Tambah-Kurang Poin + bobot; peserta perorangan atau **regu**; urutan tampil peserta diatur dengan menggeser ikon ⋮⋮) → **Juri & Kriteria** → bagikan **Link Voting & Penilaian Lomba** → **Kunci Penilaian** → tab **Hasil** (tetapkan urutan bila seri) → **Cetak Piagam Juara**. Di layar hasil, tombol nama cabang (atau panah ← →) berpindah cabang seketika.

### Lomba sistem babak / eliminasi (mis. Spelling Bee, Cerdas Cermat)
Skor tiap babak = **jumlah jawaban benar**. Peserta yang lolos maju ke babak berikutnya sampai **Final**.

1. **Cabang & Peserta** → pilih cabang → Mode Penilaian **Babak / Eliminasi**.
2. Atur **Susunan Babak**: nama babak dan jumlah soal/kata (mis. Babak 1 — 20, Babak 2 — 15, Final — 10). **+ Tambah Babak** menyisipkan babak sebelum Final (maks. 10 babak). Babak yang sudah berisi skor terkunci (ikon gembok) dan tidak bisa dihapus.
3. Pilih **Penentuan Juara**:
   - **Total akumulasi semua babak** — juara = jumlah benar terbanyak dari semua babak yang diikuti.
   - **Skor babak final saja** — juara = jumlah benar terbanyak di Final; bila sama, total akumulasi jadi penentu.
   Peserta yang mencapai babak lebih jauh selalu berada di atas peserta yang gugur lebih awal.
4. **Simpan Pengaturan**, lalu tambahkan juri di tab **Juri & Kriteria** (tidak perlu kriteria).
5. Saat lomba berjalan:
   - **Juri** membuka link penilaian → memilih babak → mengisi jumlah benar dengan tombol **−/+** atau mengetik angka. Skor **tersimpan otomatis**; angka tidak bisa melebihi jumlah soal.
   - Juri juga bisa langsung menggeser **Lolos ke …** di bawah nama peserta (atau **Loloskan … teratas → Terapkan**); peserta yang lolos langsung muncul di babak berikutnya.
   - **Panitia** di tab **Juri & Kriteria** → kartu **Skor Babak**: bisa mengisi/mengoreksi skor, lalu menandai **Lolos** (atau isi angka di **Loloskan … teratas → Terapkan**, nilai seri di batas kelulusan ikut lolos) → **Simpan Skor & Lolos**. Peserta yang lolos langsung muncul di babak berikutnya, juga di HP juri.
   - Ulangi sampai Final. **Juara baru ditetapkan setelah finalis mendapat skor Final.**
6. Tab **Hasil** menampilkan skor per babak, total, status (Gugur di …/Finalis/Juara). **Cetak Lembar Juri** untuk babak ini punya kolom centang per soal (bila ≤ 20 soal) + Jumlah Benar + Lolos. Layar hasil menampilkan "SKOR … MASUK" untuk babak yang sedang berjalan.

### Lomba beregu dengan sistem tambah / kurang poin (mis. cerdas cermat)
1. **Cabang & Peserta** → pilih cabang → Mode Penilaian **Tambah/Kurang Poin**. Isi **Poin awal** tiap regu (mis. 0) dan **Tombol poin** dipisah koma (mis. `100, -100, 50, -50`) → **Simpan Pengaturan**.
2. Di kartu Peserta Cabang tekan **Buat Regu** → isi nama regu (mis. *Regu A — Garuda*) → centang anggota dari data siswa (cari nama/NISN atau saring kelas) → **Simpan Regu**. Satu siswa hanya boleh ada di satu regu per cabang. Regu bisa diubah lewat ikon ✏️, urutan tampil digeser seperti peserta biasa.
3. Tambahkan juri/operator di tab **Juri & Kriteria**.
4. Saat lomba: **juri** membuka link penilaian → **Papan Poin** → ketuk **+100** saat regu menjawab benar, **−100** saat salah (tombol **±** untuk nilai lain). Total berubah seketika dan tersimpan otomatis; salah ketuk → **Batalkan**, atau buka **Riwayat**. Bila ada lebih dari satu juri, poin juri lain ikut muncul setiap beberapa detik.
5. Panitia juga bisa mengetuk poin di kartu **Papan Poin** (tab Juri & Kriteria) dan membatalkan ketukan dari **Riwayat ketukan terakhir**.
6. Tab **Hasil**: peringkat, jumlah benar (+), salah (−), total poin. Bila total sama di posisi juara, tetapkan urutan dengan tombol **Tetapkan Urutan**. **Cetak Piagam Juara** untuk regu mencetak **satu piagam per anggota**. Lembar Juri cetak berisi kolom turus poin per regu.

> Regu juga bisa dipakai di mode lain (Juri, Voting, Babak, Rank 1) — misalnya lomba yel-yel beregu yang dinilai juri. Kehadiran semua anggota regu tercatat otomatis.

### Layar hasil
- **Voting** (OSIS, voting lomba, gabungan): tampil "suara masuk" lebih dulu, lalu tekan **Tampilkan Hasil** (Spasi) untuk membuka perolehan dengan animasi.
- **Juri, Babak, Rank 1, dan Tambah/Kurang Poin**: hasil **langsung tampil dan diperbarui live** (sekitar tiap 4 detik) tanpa tombol ungkap. Batang dan angka bergerak saat skor berubah. Pada **sistem babak** hanya peserta yang **belum tereliminasi** yang tampil, beserta total benar dan skor babak yang sedang berjalan. Selama pertandingan berjalan layar hanya menampilkan **skor sementara tanpa label juara**. Juara (mahkota, "JUARA 1/2/3", tombol **Umumkan Juara**) baru muncul — lengkap dengan animasi dan efek suara — setelah **juri menekan "Nyatakan Pertandingan Selesai"** di HP-nya, atau panitia menyalakan **Pertandingan Selesai** di tab Juri & Kriteria / tombol **Nyatakan Selesai** di tab Hasil. Menyatakan selesai sekaligus mengunci penilaian; membuka kunci penilaian membuat pertandingan kembali "belum selesai".

### Cetak hasil penilaian juri (dokumentasi & arsip)
Tab **Cetak → Hasil Penilaian Juri** (juga tombol **Cetak Hasil Penilaian** di tab Juri & Kriteria dan **Hasil Penilaian Juri** di tab Hasil). Pilih cabang, lalu:
- **Juri / Gabungan:** *Rincian nilai per juri* — satu halaman per juri berisi nilai setiap kriteria, nilai akhir, catatan, waktu penilaian, dan tanda tangan juri (bisa pilih satu juri saja); *Rekapitulasi dewan juri* — nilai akhir tiap juri berdampingan, rata-rata, skor voting (bila gabungan), skor akhir, peringkat, dan tanda tangan seluruh juri.
- **Babak:** skor setiap babak, status lolos, siapa yang menginput dan kapan, ditambah rekap babak.
- **Rank 1:** posisi juara beserta juri yang menetapkan dan waktunya.
- **Tambah/Kurang Poin:** klasemen regu + riwayat lengkap setiap ketukan poin (waktu, regu, poin, jumlah berjalan, juri).

Setiap dokumen mencantumkan status penilaian (belum dikunci / terkunci / selesai), daftar peserta tidak hadir, dan waktu cetak. Kop surat, tanda tangan kepala sekolah, dan penanda tangan ke-2 (mis. Ketua Panitia) bisa diatur; pilih **Lanskap** bila kolom kriteria/juri banyak. Tekan **Cetak / Simpan PDF** untuk mencetak atau menyimpan sebagai PDF arsip.

### Foto layar penuh di halaman voting
Pada voting lomba dan pemilihan OSIS, **ketuk foto** peserta/calon untuk membukanya layar penuh seperti galeri HP: **geser kiri/kanan** untuk foto berikutnya, **cubit atau ketuk 2×** untuk memperbesar, **geser ke bawah**, tombol ✕, atau tombol **Kembali** HP untuk menutup. Tombol **Pilih** di bawah foto langsung memilih peserta itu (voting OSIS tetap meminta konfirmasi). Pada voting lomba, memilih dari daftar dilakukan dengan mengetuk **nama** peserta.

### Peserta tidak hadir
Juri bisa mengeluarkan peserta yang tidak datang: tombol **Tidak hadir** di kartu peserta (penilaian kriteria) atau tombol **Peserta tidak hadir** di bawah halaman penilaian (semua sistem). Peserta tersebut hilang dari daftar penilaian, peringkat, layar hasil, dan daftar hadir — **nilai lamanya tidak dihapus**, dan bisa dipulihkan dengan **Hadir kembali**. Panitia juga bisa melakukannya lewat ikon 👤✕ di tabel peserta. Menghapus peserta permanen tetap hanya bisa oleh panitia (ikon 🗑).

### Halaman penilaian juri (kriteria)
Deretan tombol peserta di atas kini menampilkan **nomor + nama** (hijau ✓ = sudah dinilai, biru = sedang dinilai). Tombol **Daftar Peserta** membuka daftar lengkap berisi nama, kelas, status (Sudah/Belum/Sebagian) dan nilai — ketuk nama untuk langsung menilai. Di bawah kriteria tertulis **Berikutnya: nama peserta** agar juri tahu siapa yang tampil selanjutnya.

### Lomba sistem Rank 1 (gugur bila salah menjawab)
Semua peserta diberi pertanyaan yang sama; yang salah menjawab gugur. Peserta yang **bertahan paling akhir adalah Juara 1**. Juri tidak memberi nilai — cukup **menetapkan Juara 1, 2, 3** (dan juara harapan bila ada).

1. **Cabang & Peserta** → pilih cabang → Mode Penilaian **Rank 1 (Gugur)**. Atur **Jumlah Juara** dan **Juara Harapan** (0–5) → **Simpan Pengaturan**.
2. Tambahkan juri di tab **Juri & Kriteria** (tidak perlu kriteria). **Cetak Lembar Juri** berisi kolom "gugur pada soal ke-" dan kotak penetapan juara untuk dicatat saat lomba.
3. Setelah lomba selesai, **juri** membuka link penilaian → setiap posisi (**Juara 1**, **Juara 2**, …, **Juara Harapan 1**) → **Pilih** → ketuk nama peserta. Tersimpan otomatis. Memilih peserta yang sudah menempati posisi lain akan menukar posisinya.
4. Panitia juga bisa menetapkan/mengoreksi di kartu **Penetapan Juara — Rank 1** (tab Juri & Kriteria) → **Simpan Penetapan**.
5. Tab **Hasil**, **Rekap**, layar hasil, dan **piagam** langsung memakai penetapan ini (piagam harapan tertulis "Juara Harapan 1", dst).

---

## Bagian D — Memperbarui Aplikasi

**Backend** (bila ada perubahan `.gs`):
1. Ganti isi `Kode.gs`, `Admin.gs`, `Demo.gs` dengan versi baru → **Ctrl+S**.
2. Jalankan **`setupAwal`** sekali lagi → hanya memperbarui struktur sheet (menambah kolom baru), data tetap aman.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan.**
⚠️ Jangan memilih *Deployment baru* — URL `/exec` akan berubah dan aplikasi berhenti bekerja.

> **Dari 1.9.4 ke 1.9.5 (foto peserta & calon tampil layar penuh saat diketuk):** cukup ganti `Kode.gs` (hanya angka versi yang berubah), buat versi deployment baru, lalu perbarui frontend. Bila memperbarui dari versi lebih lama, ikuti juga catatan 1.9.4 di bawah.

> **Dari versi sebelumnya ke 1.9.4 (perbaikan layar "Gagal memuat data … reading 'forEach'" di halaman juri):** ganti ketiga berkas `.gs`, buat versi deployment baru, lalu perbarui frontend. Tidak ada kolom baru (bila belum pernah memasang 1.9.2, jalankan `setupAwal` sekali). **Penting: perbarui backend dan frontend bersamaan** — sejak versi ini aplikasi memberi peringatan bila versi tampilan dan server berbeda.

> **Dari versi sebelumnya ke 1.9.3 (cetak hasil penilaian juri):** ganti ketiga berkas `.gs`, buat versi deployment baru, lalu perbarui frontend (tidak ada kolom baru; bila belum pernah memasang 1.9.2, jalankan `setupAwal` sekali).

> **Dari versi sebelumnya ke 1.9.2 (juara tampil setelah selesai, peserta tidak hadir):** ganti ketiga berkas `.gs`, **jalankan `setupAwal` sekali** (menambah kolom **Selesai** di Cabang_Lomba dan **Hadir** di Peserta_Lomba), buat versi deployment baru, lalu perbarui frontend.

> **Dari versi sebelumnya ke 1.9 (regu, tambah/kurang poin, layar live):** ganti ketiga berkas `.gs`, **wajib jalankan `setupAwal` sekali** (membuat sheet baru **Poin_Log**, kolom **Anggota** di Peserta_Lomba, dan kolom **PoinCfg** di Cabang_Lomba), lalu buat versi deployment baru. Perbarui frontend. Data lama tetap aman.

> **Dari versi sebelumnya ke 1.8 (mode gelap, jadwal cabang beberapa hari, login pilih nama):** ganti ketiga berkas `.gs`, **wajib jalankan `setupAwal` sekali** (menambah kolom **TanggalSelesai** di Cabang_Lomba; bila memperbarui langsung dari 1.6 atau lebih lama, sheet Peringkat_Lomba dan kolom JumlahHarapan ikut dibuat), lalu buat versi deployment baru. Perbarui frontend. Cabang lama tetap 1 hari sampai tanggal selesai diisi.

> **Dari versi sebelumnya ke 1.7 (Rank 1, juri meloloskan):** ganti ketiga berkas `.gs`, **wajib jalankan `setupAwal` sekali** (membuat sheet baru **Peringkat_Lomba** dan kolom **JumlahHarapan** di Cabang_Lomba), lalu buat versi deployment baru seperti langkah 3. Setelah itu perbarui frontend.

> **Dari versi sebelumnya ke 1.6 (sistem babak):** ganti ketiga berkas `.gs`, **wajib jalankan `setupAwal` sekali** (membuat sheet baru **Skor_Babak** dan kolom **Babak** di Cabang_Lomba), lalu buat versi deployment baru seperti langkah 3. Setelah itu perbarui frontend. Cabang lama tidak berubah.

> **Dari versi sebelumnya ke 1.5:** lakukan 3 langkah di atas, lalu perbarui frontend (isi ulang `GAS_URL`). Data lama tetap terbaca; kehadiran dari voting kini dihitung otomatis dari daftar pemilih, jadi tidak ada data yang perlu dipindahkan.

**Frontend** (bila ada perubahan di `css/` atau `js/`):
1. Bila mengubah kode sendiri, naikkan angka versi di `index.html` (mis. `?v=1.1.0` → `?v=1.1.1`) dan `APP_VER` di `js/core.js` agar HP pengguna langsung memuat versi baru. (Paket 1.9.5 ini sudah dinaikkan.)
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
| "Gagal memuat data — Cannot read properties of undefined (reading 'forEach')" / peringatan **Versi server berbeda** | Versi frontend (Vercel/GitHub) tidak sama dengan versi Apps Script — biasanya `.gs` sudah diganti tapi belum dibuat **Versi baru** di Kelola deployment, atau HP juri masih membuka halaman versi lama | Pasang backend & frontend dari paket yang sama, buat **Versi baru** deployment, lalu di HP juri tutup tab dan buka ulang (atau tarik ke bawah untuk muat ulang). Angka versi tampil di bawah pesan galat |
| Layar IFP: "Link layar tidak berlaku" | Link diganti admin, atau link Mode Demo setelah demo diakhiri | Buka **Bagikan Link** lalu pakai link layar yang baru |
| Layar IFP tidak bersuara | Volume IFP mati, atau ikon speaker di layar dimatikan | Nyalakan volume; suara berbunyi setelah tombol *Tampilkan Hasil* ditekan |
| Link voting: "Event tidak ditemukan" | Status event bukan *Berjalan* | Ubah status event menjadi Berjalan |
