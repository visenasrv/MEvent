# MEvent — Manajemen Event Sekolah

Aplikasi web untuk **pemilihan OSIS**, **perlombaan** (juri + voting siswa), **formulir pendaftaran**, **daftar hadir**, dan **dokumen cetak** (rekap, berita acara, lembar juri, piagam, SK) — dengan **Mode Demo** berisi data contoh.

Versi 1.9.6: cetak daftar hadir dipisah per kelas (1 kelas = 1 halaman, urut nama, jumlah L/P); kolom Paraf diganti Keterangan.

Versi 1.9.5: foto peserta lomba & calon OSIS di halaman voting tampil layar penuh saat diketuk (geser, perbesar, pilih langsung).

Versi 1.9.4: halaman juri tidak lagi macet bila data/cache dari versi lain; peringatan otomatis bila versi tampilan dan server Apps Script berbeda.

Versi 1.9.3: cetak **Hasil Penilaian Juri** (rincian nilai per juri + rekapitulasi dewan juri, riwayat input, tanda tangan) untuk dokumentasi dan arsip.

Versi 1.9.2: juara di layar hasil baru tampil setelah juri menyatakan pertandingan selesai; juri bisa menandai peserta tidak hadir (bisa dipulihkan).

Versi 1.9: peserta **beregu** dan sistem **tambah/kurang poin** (cerdas cermat), layar hasil **langsung & live** untuk penilaian non-voting (sistem babak hanya menampilkan peserta yang belum tereliminasi), dan halaman penilaian juri menampilkan nama peserta.

Versi 1.8: **mode gelap/terang**, jadwal cabang lomba **lebih dari satu hari**, dan login panitia/juri cukup mengetuk nama dari daftar pendek (tanpa mencari) lalu mengisi kata sandi.

Versi 1.7: sistem penilaian **Rank 1** (gugur bila salah — juri cukup menetapkan Juara 1, 2, 3 dan juara harapan) dan juri bisa langsung meloloskan peserta ke babak berikutnya.

Versi 1.6: sistem penilaian **babak / eliminasi** untuk lomba seperti Spelling Bee — skor = jumlah jawaban benar per babak, peserta lolos maju ke babak berikutnya sampai Final, total akumulasi otomatis, juara dari total atau skor final; juri menilai dari HP dengan simpan otomatis.

Versi 1.5: geser-urut (kop surat, peserta, pertanyaan formulir) berfungsi di mouse & layar sentuh, kolom ukuran font tidak terpotong, menu Kehadiran & Cetak Dokumen dipindah ke dalam event.

Versi 1.4: situs langsung membuka login Admin/Panitia, menu samping mengikuti warna tema, tampilan tidak terpotong di semua ukuran layar, dan layar hasil bisa digulir saat peserta banyak (nama utuh, logo tanpa teks).

Versi 1.3: logo PNG transparan tidak lagi berlatar hitam; login voting siswa, PTK, dan juri hanya lewat link dari admin (halaman awal: Admin / Panitia).

Versi 1.2: respons lebih cepat (optimistic UI, cache bercakupan, login & kirim suara lebih ringan) dan info lomba yang di-voting di kehadiran.

Versi 1.1: link voting khusus (Siswa & PTK / Siswa & Juri), link formulir & layar hasil dengan kode QR, layar hasil "suara masuk → tampilkan hasil" dengan animasi dan suara, serta sistem calon OSIS pasangan atau tunggal (wakil = suara terbanyak ke-2).

- Frontend: HTML/CSS/JavaScript murni (SPA), di-hosting di GitHub Pages
- Backend: Google Apps Script sebagai REST API + Google Sheets & Drive

## Struktur

```
index.html
css/style.css
js/config.js     ← isi GAS_URL di sini
js/icons.js      ← subset ikon Lucide
js/core.js       ← api(), cache, router, komponen UI
js/kop.js        ← kop surat, dokumen cetak, piagam
js/public.js     ← halaman publik, voting, juri, formulir
js/admin.js      ← panel admin/panitia (dimuat setelah login)
js/admin2.js     ← formulir, pengaturan, editor piagam
js/layar.js      ← layar hasil proyektor/IFP (efek suara & animasi), dimuat saat dibuka
```

Lihat **PANDUAN-INSTALASI.md** untuk langkah pemasangan.
