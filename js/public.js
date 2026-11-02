/* ============================================================
   MEvent — public.js
   Halaman awal, login (NISN, voting lomba, PTK/juri, admin),
   voting OSIS & lomba, terima kasih, formulir, beranda PTK, juri.
   ============================================================ */
'use strict';

function sekolah() { return (AppState.pub && AppState.pub.sekolah) || {}; }
function heroLogo(cls) { const s = sekolah(); const l = logoHtml(s.LogoUrl, 'logo sekolah'); return '<div class="hero-logo ' + (cls || '') + '">' + (l || ic('graduation-cap', 'ic-xl')) + '</div>'; }
function appbar(o) {
  return '<div class="appbar">' + (o.back !== false ? '<button class="btn btn-ghost btn-icon" data-act="back" aria-label="Kembali">' + ic('arrow-left') + '</button>' : '') +
    (o.logo ? '<span class="avatar avatar-sm" style="background:var(--primary-tint)">' + (logoHtml(sekolah().LogoUrl) || ic('graduation-cap', 'ic-sm')) + '</span>' : '') +
    '<div class="grow"><div class="ttl ellipsis">' + esc(o.title) + '</div>' + (o.sub ? '<div class="sub ellipsis">' + esc(o.sub) + '</div>' : '') + '</div>' + (o.right || '') + temaBtn() + '</div>';
}
function demoHintCard(kind) {
  const h = AppState.mode === 'demo' && AppState.pub && AppState.pub.demoHint;
  if (!h) return '';
  let t = '';
  if (kind === 'admin') t = 'Username <b>' + esc(h.admin.username) + '</b> · kata sandi <b>' + esc(h.admin.password) + '</b>';
  if (kind === 'ptk') t = 'Pilih nama mana saja · kata sandi <b>' + esc(h.ptkPassword) + '</b><br><span class="small">' + h.ptkContoh.map(esc).join(' · ') + '</span>';
  if (kind === 'tamu') t = 'Juri tamu <b>' + esc(h.juriTamu.nama) + '</b> · kata sandi <b>' + esc(h.juriTamu.password) + '</b>';
  if (kind === 'juri') t = 'Juri PTK: kata sandi <b>' + esc(h.ptkPassword) + '</b> · juri tamu <b>' + esc(h.juriTamu.nama) + '</b>: <b>' + esc(h.juriTamu.password) + '</b>';
  if (kind === 'nisn') t = 'Contoh NISN demo: ' + h.nisn.map(n => '<b class="mono">' + n + '</b>').join(', ');
  return '<div class="alert alert-amber mt-16 small">' + ic('flask-conical', 'ic-sm') + '<div><b>Akun demo:</b> ' + t + '</div></div>';
}
function bindBack(el, target) { el.addEventListener('click', (e) => { if (e.target.closest('[data-act=back]')) { if (typeof target === 'function') target(); else go(target || ''); } }); }

/* Akhiri sesi pemilih tanpa menghapus sesi admin/PTK yang tersimpan di perangkat. */
function endVoter() {
  AppState.vote = null;
  if (AppState.role === 'siswa' || AppState.role === 'lomba' || AppState.role === 'ptkv') { AppState.token = ''; AppState.role = ''; AppState.user = null; restoreSession(); }
}
/** Halaman login siswa dari link voting yang sedang dipakai (tujuan setelah memilih). */
function kioskHome() { const k = AppState.kiosk; return k ? (k.kind === 'osis' ? 'voting-osis/' : 'voting-lomba/') + k.eventId : ''; }

/* ============================================================
   HALAMAN AWAL
   ============================================================ */
registerPage('home', {
  init(el) { el.addEventListener('click', onHomeClick); },
  // Aplikasi dibuka langsung di halaman login Admin / Panitia. Voting & juri lewat link dari admin.
  show(el) { endVoter(); AppState.kiosk = null; history.replaceState(null, '', location.pathname + location.search + '#/masuk-admin'); route(); },
  onPub() { const el = $('.page[data-page="home"]'); if (el && !el.hidden) renderHome(el); }
});
function renderHome(el) {
  const p = AppState.pub, s = sekolah();
  const osis = p && p.osis.find(o => o.VotingDibuka === 'Ya');
  const lomba = p && p.lomba.length ? p.lomba : null;
  let evCard;
  if (!p) evCard = '<div class="card card-pad"><div class="sk sk-line" style="width:40%"></div><div class="sk sk-line" style="width:80%;height:22px"></div><div class="sk sk-line" style="width:35%"></div></div>';
  else if (osis || lomba) {
    const judul = osis ? osis.Judul : lomba[0].EventJudul;
    evCard = '<div class="card card-pad"><div class="row between"><span class="small muted" style="font-weight:700;letter-spacing:.06em">EVENT BERLANGSUNG</span><span class="badge badge-green"><span class="dot"></span>Voting Dibuka</span></div>' +
      '<div style="font-size:19px;font-weight:700;margin-top:6px;line-height:1.3">' + esc(judul) + '</div>' +
      '<div class="row muted mt-8">' + ic('calendar', 'ic-sm') + '<span>' + esc(osis ? tgl(osis.TanggalMulai) : lomba.map(l => l.NamaCabang).join(' · ')) + '</span></div></div>';
  } else evCard = '<div class="card card-pad"><div class="small muted" style="font-weight:700;letter-spacing:.06em">EVENT BERLANGSUNG</div><div style="font-size:17px;font-weight:700;margin-top:6px">Belum ada voting yang dibuka</div><div class="muted mt-8 small">Pantau pengumuman panitia untuk jadwal pemilihan & lomba.</div></div>';
  const menu = (act, icon, tile, t, sub, off, badge) => '<div class="card menu-card card-tap' + (off ? ' is-off' : '') + '" tabindex="0" role="button" data-act="' + act + '"><span class="icon-tile ' + tile + '">' + ic(icon, 'ic-lg') + '</span><div class="grow"><div class="t">' + t + '</div><div class="s">' + sub + '</div></div>' + (badge || '') + '<span class="chev">' + ic('chevron-right') + '</span></div>';
  const sess = AppState.token && (AppState.role === 'admin' || AppState.role === 'ptk' || AppState.role === 'tamu') && AppState.user;
  el.innerHTML = '<div class="pub"><div class="pub-inner">' +
    '<div class="hero">' + heroLogo() + '<div class="hero-school">' + esc(s.NamaSekolah || (p ? 'Sekolah' : '…')) + '</div><div class="hero-app">MEvent</div><div class="hero-sub">Manajemen Event Sekolah</div></div>' +
    '<div class="float-card">' + evCard + '</div><div class="pub-body">' +
    (sess ? '<div class="card menu-card card-tap mt-16" data-act="lanjut" tabindex="0" role="button" style="border-color:var(--primary-tint-2);background:var(--primary-tint)">' + avatarHtml(AppState.user.nama) + '<div class="grow"><div class="t">Lanjutkan sebagai ' + esc(AppState.user.nama) + '</div><div class="s">' + (AppState.role === 'admin' ? 'Buka dasbor admin' : 'Buka beranda PTK') + '</div></div><span class="chev">' + ic('chevron-right') + '</span></div>' : '') +
    '<div class="pub-section-title">Masuk</div>' +
    menu('masuk-admin', 'shield-check', '', 'Admin / Panitia', 'Kelola event, calon, lomba, dan hasil') +
    '<div class="card card-pad mt-12 row" style="align-items:flex-start;background:var(--primary-tint);border-color:var(--primary-tint-2)"><span class="icon-tile" style="background:var(--surface)">' + ic('qr-code', 'ic-lg') + '</span><div class="grow"><div style="font-weight:700">Voting siswa, PTK & juri</div><div class="small muted mt-8" style="line-height:1.5">Gunakan <b>link atau kode QR</b> yang dibagikan panitia. Halaman voting dan penilaian juri hanya bisa dibuka dari link tersebut.</div></div></div>' +
    '<button class="btn btn-soft btn-block btn-lg mt-8" data-act="formulir">' + ic('file-text') + ' Isi Formulir Pendaftaran' + (p && p.jumlahFormulir ? ' <span class="pill-num">' + p.jumlahFormulir + '</span>' : '') + '</button>' +
    (AppState.mode === 'live' && p && p.demo && p.demo.aktif ? '<div class="card menu-card card-tap mt-16" data-act="demo" tabindex="0" role="button" style="border-style:dashed"><span class="icon-tile amber">' + ic('flask-conical', 'ic-lg') + '</span><div class="grow"><div class="t">Coba Mode Demo</div><div class="s">Jelajahi semua fitur dengan data contoh</div></div><span class="chev">' + ic('chevron-right') + '</span></div>' : '') +
    (AppState.mode === 'demo' && p && (osis || (p.lombaEvent || []).length) ? '<div class="card card-pad mt-16" style="border-style:dashed"><div class="small muted" style="font-weight:700;letter-spacing:.05em">COBA LINK DEMO</div><div class="stack mt-8" style="gap:8px">' +
      (osis ? '<button class="btn btn-soft btn-block" data-act="demo-link" data-v="voting-osis/' + esc(osis.EventID) + '">' + ic('vote', 'ic-sm') + ' Link Voting OSIS (Siswa & PTK)</button>' : '') +
      ((p.lombaEvent || [])[0] ? '<button class="btn btn-soft btn-block" data-act="demo-link" data-v="voting-lomba/' + esc(p.lombaEvent[0].EventID) + '">' + ic('trophy', 'ic-sm') + ' Link Voting & Penilaian Lomba</button>' : '') + '</div></div>' : '') +
    (AppState.mode === 'demo' && p && p.demoHint ? '<div class="alert alert-amber mt-16 small" style="align-items:flex-start">' + ic('flask-conical', 'ic-sm') + '<div style="line-height:1.6"><b>Akun demo</b><br>Admin: <b>' + esc(p.demoHint.admin.username) + '</b> / <b>' + esc(p.demoHint.admin.password) + '</b><br>PTK & juri tamu: kata sandi <b>' + esc(p.demoHint.ptkPassword) + '</b><br>NISN siswa: ' + p.demoHint.nisn.map(n => '<span class="mono">' + n + '</span>').join(', ') + '</div></div>' : '') +
    '<p class="center muted small" style="margin-top:28px">© ' + new Date().getFullYear() + ' MEvent · ' + esc(s.NamaSekolah || '') + '</p>' +
    '</div></div></div>';
}
function onHomeClick(e) {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'demo') return enterDemo();
  if (a === 'lanjut') return go(AppState.role === 'admin' ? 'dasbor' : 'ptk');
  if (a === 'demo-link') return go(b.dataset.v);
  if (a === 'nisn' || a === 'lomba') {
    const p = AppState.pub;
    if (p && a === 'nisn' && !p.osis.some(o => o.VotingDibuka === 'Ya')) return toast('Voting OSIS belum dibuka', 'Tunggu panitia membuka voting.', 'info');
    if (p && a === 'lomba' && !p.lomba.length) return toast('Voting lomba belum dibuka', 'Tunggu panitia membuka voting.', 'info');
  }
  if (a === 'masuk-admin' && AppState.role === 'admin') return go('dasbor');
  if (a === 'masuk-admin' && (AppState.role === 'ptk' || AppState.role === 'tamu')) return go('ptk');
  go(a);
}
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('card-tap')) e.target.click(); });

/* ============================================================
   LOGIN NISN — Voting OSIS
   ============================================================ */
registerPage('nisn', {
  init(el) {
    el._v = '';
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (k) { nisnKey(el, k.dataset.k); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'back') go('');
      if (b.dataset.act === 'clear') { el._v = ''; nisnPaint(el); }
      if (b.dataset.act === 'masuk') nisnSubmit(el, b);
    });
  },
  show(el) {
    // Login voting hanya lewat link yang dibagikan admin (#/voting-osis/{EventID})
    if (!AppState.kiosk) { toast('Gunakan link dari panitia', 'Voting OSIS dibuka lewat link atau kode QR yang dibagikan panitia.', 'info'); return go(''); }
    endVoter(); warmUpServer();
    el._v = '';
    const p = AppState.pub, osis = p && p.osis.find(o => o.VotingDibuka === 'Ya');
    el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Login Siswa — Voting OSIS', sub: sekolah().NamaSekolah }) +
      '<div class="pub-body center">' + heroLogo('') + '<h3 style="font-size:20px">' + esc(osis ? osis.Judul : 'Pemilihan Ketua OSIS') + '</h3><div class="muted">' + esc(sekolah().NamaSekolah || '') + '</div>' +
      '<span class="badge ' + (osis ? 'badge-green' : 'badge-gray') + ' mt-8"><span class="dot"></span>' + (osis ? 'Voting Dibuka' : 'Voting belum dibuka') + '</span></div>' +
      '<div class="pub-body">' + nisnCardHtml() + '</div>' + keypadHtml() + '</div></div>';
    nisnPaint(el);
    pasangKeyboardNisn(el, () => true);
  }
});
function nisnCardHtml() {
  return '<div class="card card-pad"><div class="row between"><div><div style="font-weight:700;font-size:18px">NISN</div><div class="muted small">Nomor Induk Siswa Nasional</div></div><span class="badge badge-gray" id="nisn-count">0/10</span></div>' +
    '<div class="nisn-box mt-12" id="nisn-box"><span class="ico">' + ic('id-card') + '</span><div class="nisn-digits" id="nisn-digits"></div><button class="btn btn-ghost btn-icon btn-sm" data-act="clear" aria-label="Hapus semua">' + ic('circle-x') + '</button></div>' +
    '<div class="row muted small mt-8">' + ic('info', 'ic-sm') + '<span>NISN tertera di kartu pelajar atau tanyakan wali kelas.</span></div>' +
    '<div id="nisn-err"></div>' +
    '<button class="btn btn-primary btn-block btn-lg mt-16" data-act="masuk">Masuk & Mulai Memilih ' + ic('arrow-right') + '</button>' + demoHintCard('nisn') + '</div>';
}
function keypadHtml() {
  return '<div class="keypad">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => '<button type="button" data-k="' + n + '">' + n + '</button>').join('') +
    '<button type="button" data-k="del" aria-label="Hapus">' + ic('delete', 'ic-lg') + '</button><button type="button" data-k="0">0</button><button type="button" class="k-ok" data-k="ok">' + ic('check') + ' OK</button></div>' +
    '<div class="row muted small center" style="justify-content:center;padding:14px 16px">' + ic('shield-check', 'ic-sm') + '<span>Pilihanmu rahasia · Satu NISN hanya satu kali memilih · Kamu akan otomatis keluar setelah memilih</span></div>';
}
function pasangKeyboardNisn(el, aktif) {
  if (el._kb) return;
  el._kb = (e) => {
    if (el.hidden || !aktif() || !$('#nisn-digits', el)) return;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (/^\d$/.test(e.key)) nisnKey(el, e.key);
    else if (e.key === 'Backspace') nisnKey(el, 'del');
    else if (e.key === 'Enter') nisnKey(el, 'ok');
  };
  document.addEventListener('keydown', el._kb);
}
function nisnKey(el, k) {
  if (k === 'del') el._v = el._v.slice(0, -1);
  else if (k === 'ok') return nisnSubmit(el, $('[data-act=masuk]', el));
  else if (el._v.length < 10) el._v += k;
  nisnPaint(el);
}
function nisnPaint(el) {
  const d = $('#nisn-digits', el); if (!d) return;
  d.innerHTML = el._v ? esc(el._v) : '<span class="ph">Masukkan 10 digit NISN</span>';
  const c = $('#nisn-count', el);
  c.textContent = el._v.length + '/10';
  c.className = 'badge ' + (el._v.length === 10 ? 'badge-green' : 'badge-gray');
  $('#nisn-box', el).classList.toggle('focus', !!el._v);
  $('#nisn-err', el).innerHTML = '';
}
async function nisnSubmit(el, btn) {
  if (btn.classList.contains('is-busy')) return;
  if (el._v.length !== 10) { $('#nisn-err', el).innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-x', 'ic-sm') + '<span>NISN harus 10 digit angka.</span></div>'; return; }
  const res = await busy(btn, () => api('loginNisn', { nisn: el._v, eventId: el._ev || '' }));
  if (!res.success) {
    const code = res.data && res.data.code;
    $('#nisn-err', el).innerHTML = '<div class="alert alert-red mt-12" style="align-items:flex-start">' + ic('circle-x') + '<div class="grow"><b>' + esc(res.message) + '</b>' + (code && code.indexOf('E-') === 0 ? '<div class="small" style="opacity:.8">Kode: ' + esc(code) + '</div>' : '') + '</div></div>';
    if (code === 'E-409') { el._v = ''; setTimeout(() => nisnPaint(el), 2600); }
    return;
  }
  const d = res.data;
  AppState.token = d.token; AppState.role = 'siswa'; AppState.user = d.user;
  AppState.vote = { type: 'osis', event: d.event, kandidat: d.kandidat, user: d.user };
  go('osis');
}

/* ============================================================
   VOTING OSIS (siswa & PTK)
   ============================================================ */
registerPage('osis', {
  auth: 'voter',
  init(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'back') { const t = AppState.vote && AppState.vote.type; endVoter(); go(kioskHome() || (t === 'osis-ptk' ? 'ptk' : '')); }
      if (a === 'acc') b.closest('.acc').classList.toggle('open');
      if (a === 'pilih') konfirmasiOsis(b.dataset.id);
    });
  },
  show(el) {
    const v = AppState.vote;
    if (!v || (v.type !== 'osis' && v.type !== 'osis-ptk' && v.type !== 'osis-ptkv')) return go(kioskHome());
    const u = v.user || AppState.user || {};
    const tunggal = v.event.SistemCalon === 'Tunggal';
    el.innerHTML = '<div class="pub"><div class="pub-inner">' +
      appbar({ title: v.event.Judul, sub: sekolah().NamaSekolah, logo: true, back: v.type !== 'osis', right: '<span class="who-chip"><span class="dot"></span><span class="ellipsis">Halo, ' + esc(String(u.nama || '').split(' ')[0]) + (u.kelas ? ' · ' + esc(u.kelas) : '') + '</span></span>' }) +
      '<div class="pub-body"><div class="alert alert-blue" style="align-items:flex-start">' + ic('lock') + '<div><b>Hak Suara Terlindungi</b><div class="small" style="opacity:.85">' + (tunggal ? 'Pilih satu calon. Suara terbanyak menjadi <b>Ketua</b>, terbanyak kedua menjadi <b>Wakil Ketua</b>.' : 'Pilih satu ' + (v.kandidat.some(k => k.Tipe === 'Pasangan') ? 'pasangan calon' : 'calon') + '.') + ' Pilihanmu bersifat rahasia.</div></div></div>' +
      '<div class="row between" style="margin:18px 4px 12px"><span class="small muted" style="font-weight:700;letter-spacing:.05em">DAFTAR ' + (v.kandidat.some(k => k.Tipe === 'Pasangan') ? 'PASANGAN CALON' : 'CALON') + ' (' + v.kandidat.length + ')</span><span class="badge">Surat Suara Digital</span></div>' +
      v.kandidat.map((k, i) => kartuCalon(k, i)).join('') + '</div>' +
      '<div class="sticky-note">' + ic('shield-check', 'ic-sm') + '<span>Satu orang hanya satu suara · Setelah memilih, kamu otomatis keluar</span></div></div></div>';
  }
});
function kartuCalon(k, i) {
  const pas = k.Tipe === 'Pasangan';
  const foto = (id, nama, role, tag) => '<div><div class="cand-photo">' + photoHtml(id, nama, 500) + (role ? '<span class="tag"><span class="badge ' + (tag === 'w' ? 'badge-amber' : '') + '" style="' + (tag === 'w' ? '' : 'background:var(--primary);color:#fff') + '">' + role + '</span></span>' : '') + '</div>' +
    '<div class="cand-role">' + (role ? 'Calon ' + (tag === 'w' ? 'Wakil' : 'Ketua') : 'Calon') + '</div><div class="cand-name">' + esc(nama) + '</div><div class="muted small">' + (tag === 'w' ? esc(k.Kelas2 ? 'Kelas ' + k.Kelas2 : '') : esc(k.Kelas1 ? 'Kelas ' + k.Kelas1 : '')) + '</div></div>';
  return '<div class="card cand"><div class="cand-head"><span class="cand-no' + (i ? ' dark' : '') + '">' + noUrut(k.NoUrut) + '</span><div class="grow"><span class="badge badge-gray">' + (pas ? 'PASLON ' : 'CALON ') + noUrut(k.NoUrut) + '</span>' +
    (k.Slogan ? '<div style="font-weight:700;font-size:16px;margin-top:4px;line-height:1.25">' + esc(k.Slogan) + '</div>' : '') + '</div></div>' +
    '<div class="cand-photos' + (pas ? '' : ' single') + '">' + foto(k.FotoFileId, k.Nama1, pas ? 'KETUA' : '', 'k') + (pas ? foto(k.FotoFileId2, k.Nama2, 'WAKIL', 'w') : '') + '</div>' +
    ((k.Visi || k.Misi) ? '<div class="acc' + (i === 0 ? ' open' : '') + '"><button class="acc-btn" data-act="acc">' + ic('book-open', 'ic-sm') + ' Visi & Misi <span class="chev">' + ic('chevron-down', 'ic-sm') + '</span></button><div class="acc-body">' +
      (k.Visi ? '<div class="lbl">Visi</div>' + esc(k.Visi) : '') + (k.Misi ? '<div class="lbl" style="margin-top:10px">Misi</div>' + esc(k.Misi) : '') + '</div></div>' : '') +
    '<button class="btn btn-primary btn-block btn-lg mt-12" data-act="pilih" data-id="' + esc(k.KandidatID) + '">' + ic('circle-check') + ' Pilih ' + (pas ? 'Pasangan ' : 'Calon ') + noUrut(k.NoUrut) + '</button></div>';
}
function konfirmasiOsis(id) {
  const v = AppState.vote, k = v.kandidat.find(x => x.KandidatID === id); if (!k) return;
  const m = modal({ kind: 'sheet', body: '<div class="center"><div class="cand-no" style="margin:0 auto 10px;width:60px;height:60px;font-size:26px">' + noUrut(k.NoUrut) + '</div>' +
    '<div style="font-size:20px;font-weight:700">Yakin dengan pilihanmu?</div><div class="muted mt-8">' + esc(k.Nama1) + (k.Nama2 ? ' &amp; ' + esc(k.Nama2) : '') + '</div></div>' +
    '<div class="alert alert-amber mt-16 small">' + ic('triangle-alert', 'ic-sm') + '<span>Setelah dikirim, pilihan tidak bisa diubah.</span></div>' +
    '<button class="btn btn-primary btn-block btn-lg mt-16" id="kirim">' + ic('send') + ' Ya, Kirim Suara</button><button class="btn btn-block btn-lg mt-8" data-close>Kembali</button>' });
  m.q('#kirim').onclick = async (e) => {
    const res = await busy(e.currentTarget, () => api('kirimSuaraOsis', { kandidatId: id, eventId: v.event.EventID }));
    if (!res.success) { m.close(); toast('Suara tidak terkirim', res.message, 'error'); if (res.data && (res.data.code === 'E-409' || res.data.code === 'CLOSED')) { const t = v.type; endVoter(); go(kioskHome() || (t === 'osis-ptk' ? 'ptk' : 'nisn')); } return; }
    m.close();
    const t = v.type;
    endVoter();
    if (t === 'osis-ptk') { swrDrop('ptk'); AppState.ptk = null; }
    AppState.thanks = { title: 'Terima kasih!', sub: t === 'osis' ? 'Suaramu sudah tercatat. Kamu akan otomatis keluar.' : 'Suara Bapak/Ibu sudah tercatat.', next: kioskHome() || (t === 'osis-ptk' ? 'ptk' : 'nisn'), detik: 5 };
    go('terima-kasih');
  };
}

/* ============================================================
   TERIMA KASIH (keluar otomatis — HP dipakai bergantian)
   ============================================================ */
registerPage('terima-kasih', {
  init(el) { el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; clearInterval(el._t); if (b.dataset.act === 'lanjut' && AppState.thanks && AppState.thanks.lanjut) AppState.thanks.lanjut(); else go(el._next || ''); }); },
  show(el) {
    const t = AppState.thanks || { title: 'Terima kasih!', sub: '', next: '', detik: 5 };
    el._next = t.next;
    let n = t.detik || 5;
    el.innerHTML = '<div class="pub"><div class="pub-inner"><div class="thanks"><div class="thanks-ring">' + ic('check', 'ic-xl') + '</div><h1>' + esc(t.title) + '</h1><p class="muted" style="max-width:320px;line-height:1.6">' + esc(t.sub) + '</p>' +
      (t.lanjut ? '<button class="btn btn-primary btn-lg" data-act="lanjut">' + ic('trophy') + ' ' + esc(t.lanjutLabel || 'Lanjut') + '</button>' : '') +
      '<button class="btn btn-lg" data-act="selesai">Selesai</button><div class="countdown" id="cd">Keluar otomatis dalam ' + n + ' detik…</div></div></div></div>';
    clearInterval(el._t);
    el._t = setInterval(() => { n--; const c = $('#cd', el); if (c) c.textContent = 'Keluar otomatis dalam ' + n + ' detik…'; if (n <= 0) { clearInterval(el._t); if (!el.hidden) { endVoter(); go(t.next || ''); } } }, 1000);
  },
  leave() { const el = $('.page[data-page="terima-kasih"]'); if (el) clearInterval(el._t); }
});

/* ============================================================
   LOGIN VOTING LOMBA — pilih kelas → nama → konfirmasi
   ============================================================ */
registerPage('lomba', {
  init(el) {
    el._st = { kelas: '', siswa: null, q: '' };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act, st = el._st;
      if (a === 'back') go('');
      if (a === 'kelas') { st.kelas = b.dataset.v; st.siswa = null; st.q = ''; lombaPaint(el); const n = $('#nama-card', el); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (a === 'nama') { st.siswa = { id: b.dataset.id, nama: b.dataset.nama }; lombaPaint(el); lombaKonfirmasi(el); }
    });
    el.addEventListener('input', (e) => { if (e.target.id === 'cari-nama') { el._st.q = e.target.value; lombaPaintNames(el); } });
  },
  show(el) {
    if (!AppState.kiosk) { toast('Gunakan link dari panitia', 'Voting lomba dibuka lewat link atau kode QR yang dibagikan panitia.', 'info'); return go(''); }
    endVoter(); warmUpServer(); el._st = { kelas: '', siswa: null, q: '' }; lombaPaint(el); if (!AppState.pub) loadPublicBoot();
  },
  onPub() { const el = $('.page[data-page="lomba"]'); if (el && !el.hidden) lombaPaint(el); }
});
function lombaPaint(el) {
  if (el._kiosk) return kioskLombaPaint(el);
  el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Voting Lomba', sub: lombaJudul(el) }) + lombaBodyHtml(el) + '</div></div>';
  if (el._st.kelas) lombaPaintNames(el);
}
function lombaCabangTerbuka(el) { const p = AppState.pub; return p ? p.lomba.filter(l => !el._ev || l.EventID === el._ev) : []; }
function lombaJudul(el) { return uniq(lombaCabangTerbuka(el).map(l => l.EventJudul)).join(' · '); }
function lombaBodyHtml(el) {
  const p = AppState.pub, st = el._st, cabs = lombaCabangTerbuka(el);
  const step = st.siswa ? 3 : st.kelas ? 2 : 1;
  const S = (i, t) => '<div class="st ' + (step > i ? 'done' : step === i ? 'on' : '') + '"><span class="c">' + (step > i ? ic('check', 'ic-sm') : i) + '</span>' + t + '</div>';
  let body;
  if (!p) body = skeletonCards(2, 160);
  else if (!cabs.length) body = '<div class="card"><div class="empty"><div class="empty-art">' + ic('trophy', 'ic-xl') + '</div><div class="empty-title">Voting lomba belum dibuka</div><div>Tunggu panitia membuka voting.</div></div></div>';
  else body = '<div class="card card-pad"><div class="row between"><div class="row"><span class="qnum">1</span><b>Pilih Kelas</b></div>' + (st.kelas ? '<span class="badge badge-green">' + ic('check', 'ic-sm') + ' Terpilih ' + esc(st.kelas) + '</span>' : '') + '</div>' +
    '<div class="class-grid mt-12">' + p.kelas.map(k => '<button class="chip' + (st.kelas === k ? ' on' : '') + '" data-act="kelas" data-v="' + esc(k) + '">' + (st.kelas === k ? ic('check', 'ic-sm') : '') + esc(k) + '</button>').join('') + '</div></div>' +
    (st.kelas ? '<div class="card card-pad mt-16" id="nama-card"><div class="row"><span class="qnum">2</span><b>Pilih Nama — Kelas ' + esc(st.kelas) + '</b></div>' +
      '<div class="input-group mt-12">' + ic('search') + '<input class="input" id="cari-nama" placeholder="Cari nama..." value="' + esc(st.q) + '" autocomplete="off"></div><div class="name-list" id="name-list"></div></div>' : '');
  return (cabs.length ? '<div class="stepper">' + S(1, 'Kelas') + '<div class="ln ' + (step > 1 ? 'done' : '') + '"></div>' + S(2, 'Nama') + '<div class="ln ' + (step > 2 ? 'done' : '') + '"></div>' + S(3, 'Konfirmasi') + '</div>' : '') +
    '<div class="pub-body" style="padding-top:' + (cabs.length ? 0 : 16) + 'px">' + body + '</div>';
}
function lombaPaintNames(el) {
  const st = el._st, list = ((AppState.pub && AppState.pub.siswa[st.kelas]) || []).filter(s => !st.q || s.nama.toLowerCase().indexOf(st.q.toLowerCase()) > -1);
  const box = $('#name-list', el); if (!box) return;
  box.innerHTML = list.map(s => '<button class="name-row' + (st.siswa && st.siswa.id === s.id ? ' on' : '') + '" data-act="nama" data-id="' + esc(s.id) + '" data-nama="' + esc(s.nama) + '">' + avatarHtml(s.nama, '', 'avatar-sm') + '<span style="font-weight:600">' + esc(s.nama) + '</span><span class="radio-dot"></span></button>').join('') ||
    '<div class="muted center" style="padding:20px">Nama tidak ditemukan.</div>';
}
function lombaKonfirmasi(el) {
  const st = el._st;
  const m = modal({ kind: 'sheet', onClose: () => { if (!el._ok) { st.siswa = null; lombaPaint(el); } el._ok = false; },
    body: '<div class="center"><span class="avatar avatar-xl" style="margin:0 auto;border:4px solid var(--primary-tint-2)">' + esc(initials(st.siswa.nama)) + '</span>' +
      '<div style="font-size:20px;font-weight:700;margin-top:14px">Apakah benar ini Anda?</div><div style="font-size:24px;font-weight:800;margin-top:4px">' + esc(st.siswa.nama) + '</div>' +
      '<div class="row mt-8" style="justify-content:center"><span class="badge" style="background:var(--primary);color:#fff;height:28px">' + ic('graduation-cap', 'ic-sm') + ' Kelas ' + esc(st.kelas) + '</span></div></div>' +
      '<div class="alert alert-amber mt-16 small">' + ic('triangle-alert', 'ic-sm') + '<span>Pastikan nama dan kelas sudah benar. Satu siswa hanya bisa memilih satu kali.</span></div>' +
      '<button class="btn btn-primary btn-block btn-lg mt-16" id="ya">Ya, Benar — Masuk ' + ic('arrow-right') + '</button><button class="btn btn-block btn-lg mt-8" data-close>' + ic('rotate-ccw', 'ic-sm') + ' Bukan, Pilih Ulang</button>' });
  m.q('#ya').onclick = async (e) => {
    const res = await busy(e.currentTarget, () => api('loginSiswaLomba', { siswaId: st.siswa.id, eventId: el._ev || '' }));
    if (!res.success) { toast('Tidak bisa masuk', res.message, 'error'); return; }
    el._ok = true; m.close();
    const d = res.data;
    AppState.token = d.token; AppState.role = 'lomba'; AppState.user = d.user;
    AppState.vote = { type: 'lomba', cabang: d.cabang, user: d.user, aktif: (d.cabang.find(c => !c.sudahPilih) || d.cabang[0]).CabangID, pilih: {} };
    go('vote-lomba');
  };
}

/* ============================================================
   GALERI VOTING LOMBA
   ============================================================ */
registerPage('vote-lomba', {
  auth: 'lomba',
  init(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const v = AppState.vote, a = b.dataset.act;
      if (a === 'back') { endVoter(); go(kioskHome() || 'lomba'); }
      if (a === 'tab') { v.aktif = b.dataset.id; votePaint(el); }
      if (a === 'pilih') { const c = v.cabang.find(x => x.CabangID === v.aktif); if (c.sudahPilih) return; v.pilih[v.aktif] = b.dataset.id; votePaint(el); }
      if (a === 'kirim') voteKirim(el, b);
    });
  },
  show(el) { if (!AppState.vote || AppState.vote.type !== 'lomba') return go(kioskHome() || 'lomba'); votePaint(el); }
});
function votePaint(el) {
  const v = AppState.vote, c = v.cabang.find(x => x.CabangID === v.aktif) || v.cabang[0], sel = v.pilih[c.CabangID];
  const p = c.peserta.find(x => x.PesertaID === sel);
  el.innerHTML = '<div class="pub"><div class="pub-inner" style="display:flex;flex-direction:column">' +
    appbar({ title: 'Lomba ' + c.NamaCabang.replace(/^lomba\s+/i, ''), sub: 'Pilih penampilan favoritmu', right: '<span class="who-chip"><span class="dot"></span><span class="ellipsis">' + esc(v.user.nama.split(' ')[0]) + ' · ' + esc(v.user.kelas) + '</span></span>' }) +
    (v.cabang.length > 1 ? '<div style="padding:12px 16px 0"><div class="seg seg-light seg-block">' + v.cabang.map(x => '<button data-act="tab" data-id="' + esc(x.CabangID) + '" class="' + (x.CabangID === c.CabangID ? 'on' : '') + '">' + esc(x.NamaCabang) + (x.sudahPilih ? ' ✓' : '') + '</button>').join('') + '</div></div>' : '') +
    '<div class="pub-body grow">' +
    (c.sudahPilih ? '<div class="alert alert-green mb-16">' + ic('circle-check') + '<span>Kamu sudah memilih di cabang ini. Terima kasih!</span></div>'
      : '<div class="alert alert-amber mb-16">' + ic('star', '') + '<div class="small"><b>1 Siswa = 1 Pilihan Favorit</b><br>Ketuk kartu peserta di bawah ini, lalu tekan <b>Kirim Pilihan</b>.</div></div>') +
    '<div class="row between mb-8"><span class="small muted" style="font-weight:700;letter-spacing:.05em">DAFTAR PENAMPIL</span><span class="badge badge-gray">' + c.peserta.length + ' Peserta</span></div>' +
    '<div class="gal">' + c.peserta.map(x => '<button class="pcard' + (sel === x.PesertaID ? ' on' : '') + '" data-act="pilih" data-id="' + esc(x.PesertaID) + '"' + (c.sudahPilih ? ' disabled' : '') + '>' +
      '<div class="ph">' + photoHtml(x.FotoFileId, x.NamaTampil, 400) + '<span class="no"><span class="badge ' + (sel === x.PesertaID ? '' : 'badge-dark') + '" style="' + (sel === x.PesertaID ? 'background:var(--primary);color:#fff' : '') + '">No. ' + noUrut(x.NoUrut) + '</span></span><span class="sel">' + (sel === x.PesertaID ? ic('check', 'ic-sm') : '') + '</span>' +
      (x.Keterangan ? '<span class="ket"><span>' + esc(x.Keterangan) + '</span></span>' : '') + '</div><div class="info"><div class="nm ellipsis">' + esc(x.NamaTampil) + '</div><div class="muted small">Kelas ' + esc(x.Kelas) + '</div></div></button>').join('') + '</div>' +
    '<p class="center muted small mt-16">' + ic('circle-check', 'ic-sm') + ' Setelah dikirim, pilihan tidak bisa diubah.</p></div>' +
    (c.sudahPilih ? '' : '<div class="bottom-bar">' + (p ? '<span class="photo-thumb">' + photoHtml(p.FotoFileId, p.NamaTampil, 120) + '</span><div class="grow"><div class="small muted" style="font-weight:700;letter-spacing:.05em">PILIHANMU</div><div class="ellipsis" style="font-weight:700">No. ' + noUrut(p.NoUrut) + ' — ' + esc(p.NamaTampil) + '</div></div>' : '<div class="grow muted">Belum ada pilihan</div>') +
      '<button class="btn btn-primary btn-lg" data-act="kirim"' + (p ? '' : ' disabled') + '>' + ic('send', 'ic-sm') + ' Kirim Pilihan</button></div>') +
    '</div></div>';
}
async function voteKirim(el, btn) {
  const v = AppState.vote, cab = v.aktif, pid = v.pilih[cab];
  if (!pid) return;
  const res = await busy(btn, () => api('kirimSuaraLomba', { cabangId: cab, pesertaId: pid }));
  if (!res.success) { toast('Pilihan tidak terkirim', res.message, 'error'); if (res.data && res.data.code === 'E-409') { v.cabang.find(c => c.CabangID === cab).sudahPilih = true; votePaint(el); } return; }
  (res.data.cabang || []).forEach(x => { const c = v.cabang.find(y => y.CabangID === x.CabangID); if (c) c.sudahPilih = x.sudahPilih; });
  const sisa = v.cabang.filter(c => !c.sudahPilih);
  if (sisa.length) {
    AppState.thanks = { title: 'Pilihan terkirim!', sub: 'Masih ada ' + sisa.length + ' cabang lomba lain yang bisa kamu pilih.', next: kioskHome() || 'lomba', detik: 8,
      lanjut: () => { v.aktif = sisa[0].CabangID; go('vote-lomba'); }, lanjutLabel: 'Pilih ' + sisa[0].NamaCabang };
  } else {
    AppState.thanks = { title: 'Terima kasih!', sub: 'Pilihanmu sudah tercatat. Kamu akan otomatis keluar.', next: kioskHome() || 'lomba', detik: 5 };
  }
  go('terima-kasih');
}

/* ============================================================
   LOGIN PTK / JURI TAMU
   ============================================================ */
registerPage('masuk-ptk', {
  init(el) {
    el._st = { tab: 'ptk', sel: '', q: '' };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const st = el._st, a = b.dataset.act;
      if (a === 'back') go('');
      if (a === 'ptab') { st.tab = b.dataset.v; st.sel = ''; st.q = ''; ptkPaint(el); }
    });
    bindPtkForm(el, () => el._st, () => ptkSubmit(el, el._st));
  },
  show(el) { if (AppState.role === 'ptk' || AppState.role === 'tamu') return go('ptk'); return go('masuk-admin/panitia'); },
  onPub() { const el = $('.page[data-page="masuk-ptk"]'); if (el && !el.hidden) ptkPaintList(el, el._st); }
});
/** Pasang aksi bersama form PTK/juri (pilih nama, lihat sandi, cari). */
function bindPtkForm(el, getSt, onSubmit) {
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const st = getSt(); if (!st) return;
    if (b.dataset.act === 'sel') { st.sel = b.dataset.id; ptkPaintList(el, st); setTimeout(() => { const pw = $('#pw', el); if (pw) { pw.focus(); pw.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }, 30); }
    if (b.dataset.act === 'eye') { const pw = $('#pw', el); if (pw) pw.type = pw.type === 'password' ? 'text' : 'password'; }
  });
  el.addEventListener('input', (e) => { const st = getSt(); if (e.target.id === 'q' && st) { st.q = e.target.value; ptkPaintList(el, st); } });
  el.addEventListener('submit', (e) => { if (!e.target.closest('form[data-ptk]')) return; e.preventDefault(); onSubmit(); });
}
/** Isi form login PTK / juri. o.daftar: 'panitia' (PTK bertugas), 'juri' (juri event o.eventId: PTK & tamu), 'osis' (semua PTK, ada kolom cari). */
function ptkFormHtml(st, o) {
  o = o || {};
  const daftar = o.daftar || 'panitia', cari = daftar === 'osis';
  return '<form class="' + (o.cls || 'float-card card card-pad') + '" data-ptk autocomplete="off" data-daftar="' + daftar + '" data-ev="' + esc(o.eventId || '') + '">' +
    '<div class="row between"><span class="label">' + (daftar === 'juri' ? 'Pilih Nama Juri' : 'Pilih Nama') + '</span><span class="small" style="color:var(--primary);font-weight:600" id="jml"></span></div>' +
    (cari ? '<div class="input-group mt-8">' + ic('search') + '<input class="input" id="q" placeholder="Cari nama..." value="' + esc(st.q) + '"></div>' : '') +
    '<div class="name-list" id="list" style="max-height:' + (cari ? 300 : 420) + 'px"></div>' +
    '<div class="field mt-16"><div class="row between"><label for="pw">Kata Sandi</label></div><div class="input-group">' + ic('lock') + '<input class="input" id="pw" type="password" autocomplete="current-password" placeholder="••••••"><button type="button" class="btn btn-ghost btn-icon btn-sm suffix" data-act="eye" aria-label="Tampilkan sandi">' + ic('eye', 'ic-sm') + '</button></div></div>' +
    '<div id="err"></div><div class="row muted small mt-8">' + ic('info', 'ic-sm') + '<span>Kata sandi diberikan oleh Admin. Lupa? Hubungi Admin sekolah.</span></div>' +
    '<button class="btn btn-primary btn-block btn-lg mt-16" type="submit" id="btn-masuk">' + (o.tombol || 'Masuk') + ' ' + ic('log-in') + '</button>' + demoHintCard(daftar === 'juri' ? 'juri' : 'ptk') + '</form>';
}
function ptkPaint(el) {
  const st = el._st;
  el.innerHTML = '<div class="pub"><div class="pub-inner">' +
    '<div class="hero hero-sm"><div class="row between" style="position:relative;z-index:2"><button class="btn btn-sm" data-act="back" style="background:rgba(255,255,255,.16);border-color:transparent;color:#fff">' + ic('arrow-left', 'ic-sm') + ' Kembali</button><span class="badge" style="background:rgba(255,255,255,.18);color:#fff"><span class="dot" style="background:#4ADE80"></span>SISTEM AKTIF</span></div>' +
    heroLogo('mt-12') + '<div style="font-size:24px;font-weight:800">' + esc(sekolah().NamaSekolah || 'MEvent') + '</div><div class="hero-sub">MEvent · Manajemen Event Sekolah</div></div>' +
    ptkFormHtml(st) +
    '<div class="pub-body"><div class="card card-pad"><div class="row">' + ic('lightbulb') + '<b>Setelah masuk, Anda dapat:</b></div>' +
    [['vote', '', 'Memberikan suara Pemilihan OSIS', '1 akun = 1 hak suara'], ['clipboard-check', 'amber', 'Menilai peserta sebagai Juri', 'Isi nilai lomba langsung dari HP'], ['users', 'green', 'Mengelola event sebagai Panitia', 'Formulir, hasil, kehadiran, dan cetak']]
      .map(r => '<div class="row mt-12" style="background:var(--bg);padding:10px 12px;border-radius:12px"><span class="icon-tile ' + r[1] + '" style="width:36px;height:36px">' + ic(r[0], 'ic-sm') + '</span><div><div style="font-weight:600">' + r[2] + '</div><div class="muted small">' + r[3] + '</div></div></div>').join('') + '</div></div>' +
    '</div></div>';
  ptkPaintList(el, st);
}
/** Daftar nama siap ketuk — tanpa mengetik untuk panitia & juri. */
function ptkSumber(form) {
  const p = AppState.pub, daftar = form ? form.dataset.daftar : 'panitia';
  if (daftar === 'juri') {
    const ev = (p.lombaEvent || []).find(e => e.EventID === form.dataset.ev) || { juri: [] };
    return (ev.juri || []).map(j => ({ id: j.id, nama: j.nama, sub: (j.tipe === 'Tamu' ? 'Juri tamu' : 'Juri') + (j.cabang && j.cabang.length ? ' · ' + j.cabang.join(', ') : ''), tamu: j.tipe === 'Tamu' }));
  }
  const semua = p.ptk.map(x => ({ id: x.id, nama: x.nama, sub: x.jabatan, tugas: x.tugas }));
  if (daftar === 'osis') return semua;
  const t = semua.filter(x => x.tugas);
  return t.length ? t : semua;
}
function ptkPaintList(el, st) {
  const p = AppState.pub, box = $('#list', el); if (!box || !st) return;
  if (!p) { box.innerHTML = '<div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk sk-line"></div>'; return; }
  const form = box.closest('form'), daftar = form ? form.dataset.daftar : 'panitia';
  const src = ptkSumber(form);
  const list = daftar === 'osis' ? src.filter(x => !st.q || x.nama.toLowerCase().indexOf(st.q.toLowerCase()) > -1) : src;
  $('#jml', el).textContent = src.length + (daftar === 'juri' ? ' juri' : daftar === 'panitia' ? ' nama' : ' PTK terdaftar');
  box.innerHTML = list.map(x => '<button type="button" class="name-row' + (st.sel === x.id ? ' on' : '') + '" data-act="sel" data-id="' + esc(x.id) + '">' + avatarHtml(x.nama, '', 'avatar-sm') + '<span class="grow" style="min-width:0"><span style="font-weight:600;display:block" class="ellipsis">' + esc(x.nama) + '</span><span class="muted small ellipsis" style="display:block">' + esc(x.sub || '') + '</span></span>' + (x.tamu ? '<span class="badge badge-amber">Tamu</span>' : '') + (st.sel === x.id ? ic('circle-check', '') : '') + '</button>').join('') ||
    '<div class="muted center" style="padding:20px">' + (src.length ? 'Nama tidak ditemukan.' : daftar === 'juri' ? 'Belum ada juri untuk event ini. Hubungi panitia.' : 'Belum ada data PTK.') + '</div>';
  if (st.sel) box.querySelector('.on') && box.querySelector('.on').style.setProperty('color', 'var(--primary)');
}
async function ptkSubmit(el, st) {
  const pw = $('#pw', el).value, err = $('#err', el);
  if (!st.sel) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>Pilih nama Anda terlebih dahulu.</span></div>'; return; }
  if (!pw) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>Masukkan kata sandi.</span></div>'; return; }
  const res = await busy($('#btn-masuk', el), () => /^T:/.test(st.sel) ? api('loginTamu', { nama: st.sel.slice(2), password: pw }) : api('loginPtk', { ptkId: st.sel.replace(/^P:/, ''), password: pw }));
  if (!res.success) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>' + esc(res.message) + '</span></div>'; return; }
  setSession(res.data);
  AppState.ptk = res.data.boot;
  swrPut('ptk', res.data.boot);
  toast('Selamat datang', res.data.user.nama);
  go('ptk');
}

/* ============================================================
   LOGIN ADMIN
   ============================================================ */
registerPage('masuk-admin', {
  init(el) {
    el._tab = 'admin'; el._pt = { tab: 'ptk', sel: '', q: '' };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'eye') { const pw = $('#apw', el); if (pw) pw.type = pw.type === 'password' ? 'text' : 'password'; }
      if (b.dataset.act === 'demo') enterDemo();
      if (b.dataset.act === 'demo-link') go(b.dataset.v);
      if (b.dataset.act === 'mtab' && b.dataset.v !== el._tab) { el._tab = b.dataset.v; el._pt = { tab: 'ptk', sel: '', q: '' }; adminLoginPaint(el); }
    });
    bindPtkForm(el, () => el._tab === 'panitia' ? el._pt : null, () => ptkSubmit(el, el._pt));
    el.addEventListener('submit', async (e) => {
      if (e.target.closest('form[data-ptk]')) return;
      e.preventDefault();
      const u = $('#aun', el).value.trim(), p = $('#apw', el).value, err = $('#aerr', el);
      if (!u || !p) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>Isi username dan kata sandi.</span></div>'; return; }
      ensureAdminBundle().catch(() => {});
      const res = await busy($('#abtn', el), () => api('loginAdmin', { username: u, password: p }));
      if (!res.success) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>' + esc(res.message) + '</span></div>'; return; }
      setSession(res.data);
      AppState.boot = res.data.boot;
      swrPut('boot', res.data.boot);
      if (res.data.boot.settings) setPrimary(res.data.boot.settings.WarnaUtama);
      go('dasbor');
    });
  },
  show(el, tab) {
    if (AppState.role === 'admin') return go('dasbor');
    if (AppState.role === 'ptk' || AppState.role === 'tamu') return go('ptk');
    endVoter(); AppState.kiosk = null;
    ensureAdminBundle().catch(() => {}); warmUpServer();
    el._tab = tab === 'panitia' ? 'panitia' : 'admin'; el._pt = { tab: 'ptk', sel: '', q: '' };
    adminLoginPaint(el);
    loadPublicBoot();
  },
  onPub() {
    const el = $('.page[data-page="masuk-admin"]'); if (!el || el.hidden) return;
    if (el._tab === 'panitia') ptkPaintList(el, el._pt);
    const x = $('#login-extra', el); if (x) x.innerHTML = loginExtraHtml();
    const n = $('#login-school', el); if (n) n.textContent = sekolah().NamaSekolah || 'MEvent';
    const lg = $('.hero-logo', el); if (lg) lg.outerHTML = heroLogo('mt-12');
  }
});
/** Bagian bawah halaman login: info link voting, Mode Demo, dan link demo. */
function loginExtraHtml() {
  const p = AppState.pub, osis = p && p.osis.find(o => o.VotingDibuka === 'Ya'), lomba = p && (p.lombaEvent || [])[0];
  return '<div class="card card-pad row" style="align-items:flex-start;background:var(--primary-tint);border-color:var(--primary-tint-2)"><span class="icon-tile" style="background:var(--surface)">' + ic('qr-code', 'ic-lg') + '</span><div class="grow"><div style="font-weight:700">Voting siswa, PTK & juri</div><div class="small muted mt-8" style="line-height:1.5">Gunakan <b>link atau kode QR</b> yang dibagikan admin. Halaman voting dan penilaian juri hanya bisa dibuka dari link tersebut.</div></div></div>' +
    (AppState.mode === 'live' && p && p.demo && p.demo.aktif ? '<div class="card menu-card card-tap mt-12" data-act="demo" tabindex="0" role="button" style="border-style:dashed"><span class="icon-tile amber">' + ic('flask-conical', 'ic-lg') + '</span><div class="grow"><div class="t">Coba Mode Demo</div><div class="s">Jelajahi semua fitur dengan data contoh</div></div><span class="chev">' + ic('chevron-right') + '</span></div>' : '') +
    (AppState.mode === 'demo' && (osis || lomba) ? '<div class="card card-pad mt-12" style="border-style:dashed"><div class="small muted" style="font-weight:700;letter-spacing:.05em">COBA LINK DEMO</div><div class="stack mt-8" style="gap:8px">' +
      (osis ? '<button class="btn btn-soft btn-block" data-act="demo-link" data-v="voting-osis/' + esc(osis.EventID) + '">' + ic('vote', 'ic-sm') + ' Link Voting OSIS (Siswa & PTK)</button>' : '') +
      (lomba ? '<button class="btn btn-soft btn-block" data-act="demo-link" data-v="voting-lomba/' + esc(lomba.EventID) + '">' + ic('trophy', 'ic-sm') + ' Link Voting & Penilaian Lomba</button>' : '') + '</div></div>' : '') +
    '<p class="center muted small" style="margin-top:22px">© ' + new Date().getFullYear() + ' MEvent · ' + esc(sekolah().NamaSekolah || '') + '</p>';
}
function adminLoginPaint(el) {
  const adm = el._tab === 'admin';
  el.innerHTML = '<div class="pub"><div class="pub-inner">' +
    '<div class="hero hero-sm" style="padding-top:30px">' + temaBtn('theme-hero') +
    heroLogo('mt-12') + '<div style="font-size:24px;font-weight:800">Masuk ' + (adm ? 'Admin' : 'Panitia') + '</div><div class="hero-sub" id="login-school">' + esc(sekolah().NamaSekolah || 'MEvent') + '</div></div>' +
    '<div class="float-card card card-pad"><div class="seg seg-light seg-block kiosk-tabs">' +
    [['admin', 'shield-check', 'Admin'], ['panitia', 'user-check', 'Panitia (PTK)']].map(t => '<button type="button" data-act="mtab" data-v="' + t[0] + '" class="' + (el._tab === t[0] ? 'on' : '') + '">' + ic(t[1], 'ic-sm') + ' ' + t[2] + '</button>').join('') + '</div>' +
    (adm ? '<form class="mt-16" autocomplete="on"><div class="field"><label for="aun">Username</label><div class="input-group">' + ic('user-round') + '<input class="input" id="aun" autocomplete="username" placeholder="admin" autofocus></div></div>' +
      '<div class="field mt-16"><label for="apw">Kata Sandi</label><div class="input-group">' + ic('lock') + '<input class="input" id="apw" type="password" autocomplete="current-password" placeholder="••••••"><button type="button" class="btn btn-ghost btn-icon btn-sm suffix" data-act="eye" aria-label="Tampilkan sandi">' + ic('eye', 'ic-sm') + '</button></div></div>' +
      '<div id="aerr"></div><button class="btn btn-primary btn-block btn-lg mt-16" id="abtn" type="submit">Masuk ' + ic('log-in') + '</button>' + demoHintCard('admin') + '</form>'
      : ptkFormHtml(el._pt, { daftar: 'panitia', cls: 'mt-16', tombol: 'Masuk' }) +
        '<div class="row muted small mt-12" style="align-items:flex-start">' + ic('info', 'ic-sm') + '<span>Untuk PTK yang ditunjuk sebagai panitia (atau juri). Voting PTK dan penilaian juri juga bisa lewat link dari admin.</span></div>') +
    '</div><div class="pub-body" id="login-extra">' + loginExtraHtml() + '</div></div></div>';
  if (!adm) ptkPaintList(el, el._pt);
}

/* ============================================================
   LINK VOTING (dibagikan admin) — perangkat bersama
   #/voting-osis/{EventID}  → tab Siswa (NISN) & PTK
   #/voting-lomba/{EventID} → tab Siswa (kelas → nama) & Juri
   Setelah memilih, kembali ke login siswa link ini.
   ============================================================ */
function kioskHero(judul, status, sub) {
  const s = sekolah();
  return '<div class="hero kiosk-hero">' + temaBtn('theme-hero') + heroLogo() + '<div class="hero-school">' + esc(s.NamaSekolah || 'MEvent') + '</div>' +
    '<div class="kiosk-title">' + esc(judul) + '</div>' + (sub ? '<div class="hero-sub">' + esc(sub) + '</div>' : '') +
    '<span class="badge kiosk-badge ' + (status.on ? 'on' : '') + '"><span class="dot"></span>' + esc(status.t) + '</span></div>';
}
function kioskTabs(el, tabs) {
  return '<div class="seg seg-light seg-block kiosk-tabs">' + tabs.map(t => '<button type="button" data-act="ktab" data-v="' + t[0] + '" class="' + (el._tab === t[0] ? 'on' : '') + '">' + ic(t[1], 'ic-sm') + ' ' + t[2] + '</button>').join('') + '</div>';
}
function kioskTutup(judul, teks) {
  return '<div class="card"><div class="empty"><div class="empty-art">' + ic('lock', 'ic-xl') + '</div><div class="empty-title">' + esc(judul) + '</div><div>' + esc(teks) + '</div>' +
    '<button class="btn btn-primary mt-8" data-act="muat">' + ic('refresh-cw', 'ic-sm') + ' Muat ulang</button></div></div>';
}

registerPage('voting-osis', {
  init(el) {
    el._v = ''; el._tab = 'siswa'; el._pt = { tab: 'ptk', sel: '', q: '' };
    el.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]');
      if (k) { nisnKey(el, k.dataset.k); return; }
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'ktab') { el._tab = b.dataset.v; el._v = ''; el._pt = { tab: 'ptk', sel: '', q: '' }; kioskOsisPaint(el); }
      if (a === 'clear') { el._v = ''; nisnPaint(el); }
      if (a === 'masuk') nisnSubmit(el, b);
      if (a === 'muat') loadPublicBoot(true);
    });
    bindPtkForm(el, () => el._tab === 'ptk' ? el._pt : null, () => kioskPtkOsis(el));
  },
  show(el, eventId) {
    endVoter();
    AppState.kiosk = { kind: 'osis', eventId };
    el._ev = eventId; el._v = ''; el._tab = 'siswa'; el._pt = { tab: 'ptk', sel: '', q: '' };
    kioskOsisPaint(el);
    loadPublicBoot(); warmUpServer();
    pasangKeyboardNisn(el, () => el._tab === 'siswa');
  },
  onPub() {
    const el = $('.page[data-page="voting-osis"]'); if (!el || el.hidden) return;
    const sig = kioskOsisSig(el);
    if (sig !== el._sig) kioskOsisPaint(el); else if (el._tab === 'ptk') ptkPaintList(el, el._pt);
  }
});
function kioskOsisEv(el) { const p = AppState.pub; return p ? p.osis.find(o => o.EventID === el._ev) || null : undefined; }
function kioskOsisSig(el) { const e = kioskOsisEv(el); return e === undefined ? 'load' : !e ? 'none' : e.VotingDibuka + '|' + e.Judul + '|' + (sekolah().NamaSekolah || ''); }
function kioskOsisPaint(el) {
  const ev = kioskOsisEv(el);
  el._sig = kioskOsisSig(el);
  let body;
  if (ev === undefined) body = '<div class="pub-body">' + skeletonCards(2, 160) + '</div>';
  else if (!ev) body = '<div class="pub-body">' + kioskTutup('Event tidak ditemukan', 'Event belum berjalan atau link sudah tidak berlaku. Hubungi panitia.') + '</div>';
  else if (ev.VotingDibuka !== 'Ya') body = '<div class="pub-body">' + kioskTutup('Voting belum dibuka', 'Tunggu panitia membuka voting, lalu tekan Muat ulang.') + '</div>';
  else if (el._tab === 'siswa') body = '<div class="pub-body">' + kioskTabs(el, [['siswa', 'graduation-cap', 'Siswa'], ['ptk', 'user-check', 'PTK']]) + '<div class="mt-16">' + nisnCardHtml() + '</div></div>' + keypadHtml();
  else body = '<div class="pub-body">' + kioskTabs(el, [['siswa', 'graduation-cap', 'Siswa'], ['ptk', 'user-check', 'PTK']]) + ptkFormHtml(el._pt, { daftar: 'osis', cls: 'card card-pad mt-16', tombol: 'Masuk & Memilih' }) + '</div>';
  el.innerHTML = '<div class="pub"><div class="pub-inner">' + kioskHero(ev ? ev.Judul : 'Pemilihan OSIS', ev && ev.VotingDibuka === 'Ya' ? { on: true, t: 'Voting Dibuka' } : { on: false, t: ev === undefined ? 'Memuat…' : 'Voting belum dibuka' }, ev && ev.SistemCalon === 'Tunggal' ? 'Suara terbanyak = Ketua · terbanyak ke-2 = Wakil' : 'Login Siswa & PTK') + body + '</div></div>';
  if ($('#nisn-digits', el)) nisnPaint(el);
  if (el._tab === 'ptk') ptkPaintList(el, el._pt);
}
async function kioskPtkOsis(el) {
  const st = el._pt, pw = $('#pw', el).value, err = $('#err', el);
  if (!st.sel) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>Pilih nama Anda terlebih dahulu.</span></div>'; return; }
  if (!pw) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>Masukkan kata sandi.</span></div>'; return; }
  const res = await busy($('#btn-masuk', el), () => api('loginPtkOsis', { ptkId: st.sel, password: pw, eventId: el._ev }));
  if (!res.success) { err.innerHTML = '<div class="alert alert-red mt-12 small">' + ic('circle-alert', 'ic-sm') + '<span>' + esc(res.message) + '</span></div>'; return; }
  const d = res.data;
  AppState.token = d.token; AppState.role = 'ptkv'; AppState.user = d.user;
  AppState.vote = { type: 'osis-ptkv', event: d.event, kandidat: d.kandidat, user: d.user };
  go('osis');
}

registerPage('voting-lomba', {
  init(el) {
    el._kiosk = true; el._tab = 'siswa'; el._st = { kelas: '', siswa: null, q: '' }; el._pt = { tab: 'ptk', sel: '', q: '' };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act, st = el._st;
      if (a === 'ktab') { el._tab = b.dataset.v; el._st = { kelas: '', siswa: null, q: '' }; el._pt = { tab: 'ptk', sel: '', q: '' }; kioskLombaPaint(el); }
      if (a === 'ptab') { el._pt.tab = b.dataset.v; el._pt.sel = ''; el._pt.q = ''; kioskLombaPaint(el); }
      if (a === 'muat') loadPublicBoot(true);
      if (a === 'lanjut-juri') go('ptk');
      if (el._tab !== 'siswa') return;
      if (a === 'kelas') { st.kelas = b.dataset.v; st.siswa = null; st.q = ''; kioskLombaPaint(el); const n = $('#nama-card', el); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      if (a === 'nama') { st.siswa = { id: b.dataset.id, nama: b.dataset.nama }; lombaPaintNames(el); lombaKonfirmasi(el); }
    });
    el.addEventListener('input', (e) => { if (e.target.id === 'cari-nama') { el._st.q = e.target.value; lombaPaintNames(el); } });
    bindPtkForm(el, () => el._tab === 'juri' ? el._pt : null, () => ptkSubmit(el, el._pt));
  },
  show(el, eventId) {
    endVoter();
    AppState.kiosk = { kind: 'lomba', eventId };
    el._ev = eventId; el._tab = 'siswa'; el._st = { kelas: '', siswa: null, q: '' }; el._pt = { tab: 'ptk', sel: '', q: '' };
    kioskLombaPaint(el);
    loadPublicBoot(); warmUpServer();
  },
  onPub() {
    const el = $('.page[data-page="voting-lomba"]'); if (!el || el.hidden) return;
    const sig = kioskLombaSig(el);
    if (sig !== el._sig) kioskLombaPaint(el); else if (el._tab === 'juri') ptkPaintList(el, el._pt);
  }
});
function kioskLombaEv(el) { const p = AppState.pub; if (!p) return undefined; return (p.lombaEvent || []).find(e => e.EventID === el._ev) || null; }
function kioskLombaSig(el) { const e = kioskLombaEv(el); return e === undefined ? 'load' : !e ? 'none' : e.Judul + '|' + lombaCabangTerbuka(el).map(c => c.CabangID).join(',') + '|' + (AppState.pub.kelas || []).length; }
function kioskLombaPaint(el) {
  const ev = kioskLombaEv(el), cabs = lombaCabangTerbuka(el);
  el._sig = kioskLombaSig(el);
  const tabs = kioskTabs(el, [['siswa', 'graduation-cap', 'Siswa'], ['juri', 'gavel', 'Juri']]);
  const sess = (AppState.role === 'ptk' || AppState.role === 'tamu') && AppState.user;
  let body;
  if (ev === undefined) body = '<div class="pub-body">' + skeletonCards(2, 160) + '</div>';
  else if (!ev) body = '<div class="pub-body">' + kioskTutup('Event tidak ditemukan', 'Event lomba belum berjalan atau link sudah tidak berlaku. Hubungi panitia.') + '</div>';
  else if (el._tab === 'siswa') body = '<div class="pub-body" style="padding-bottom:0">' + tabs + '</div>' + (cabs.length ? lombaBodyHtml(el) : '<div class="pub-body">' + kioskTutup('Voting lomba belum dibuka', 'Tunggu panitia membuka voting, lalu tekan Muat ulang.') + '</div>');
  else body = '<div class="pub-body">' + tabs + (sess ? '<div class="card menu-card card-tap mt-16" data-act="lanjut-juri" tabindex="0" role="button" style="border-color:var(--primary-tint-2);background:var(--primary-tint)">' + avatarHtml(AppState.user.nama) + '<div class="grow"><div class="t">Lanjutkan sebagai ' + esc(AppState.user.nama) + '</div><div class="s">Buka lembar penilaian juri</div></div><span class="chev">' + ic('chevron-right') + '</span></div>' : '') +
    ptkFormHtml(el._pt, { daftar: 'juri', eventId: el._ev, cls: 'card card-pad mt-16', tombol: 'Masuk Penilaian' }) + '</div>';
  el.innerHTML = '<div class="pub"><div class="pub-inner">' + kioskHero(ev ? ev.Judul : 'Perlombaan', cabs.length ? { on: true, t: 'Voting Dibuka · ' + cabs.map(c => c.NamaCabang).join(', ') } : { on: false, t: ev === undefined ? 'Memuat…' : 'Voting siswa belum dibuka' }, 'Login Siswa & Juri') + body + '</div></div>';
  if (el._tab === 'siswa' && el._st.kelas) lombaPaintNames(el);
  if (el._tab === 'juri') ptkPaintList(el, el._pt);
}

/* ============================================================
   FORMULIR — daftar & isi
   ============================================================ */
registerPage('formulir', {
  init(el) { el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'back') go(''); if (b.dataset.act === 'buka') { AppState.fromFormList = true; go('f/' + b.dataset.t); } }); },
  async show(el) {
    const paint = (list) => {
      el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Formulir Pendaftaran', sub: sekolah().NamaSekolah }) + '<div class="pub-body">' +
        (list === null ? skeletonCards(3, 92) : list.length ? list.map(f => '<div class="card menu-card card-tap" tabindex="0" role="button" data-act="buka" data-t="' + esc(f.TokenLink) + '"><span class="icon-tile">' + ic('file-text', 'ic-lg') + '</span><div class="grow"><div class="t">' + esc(f.Judul) + '</div><div class="s">' + esc(f.EventJudul) + (f.BatasWaktu ? ' · s.d. ' + esc(tglPendek(f.BatasWaktu)) : '') + '</div>' + (f.Akses === 'LoginSiswa' ? '<span class="badge mt-8">Khusus siswa (NISN)</span>' : '') + '</div><span class="chev">' + ic('chevron-right') + '</span></div>').join('')
          : '<div class="card"><div class="empty"><div class="empty-art">' + ic('file-text', 'ic-xl') + '</div><div class="empty-title">Belum ada formulir yang dibuka</div><div>Formulir pendaftaran akan muncul di sini.</div></div></div>') + '</div></div></div>';
    };
    paint(null);
    const res = await swr('formTerbuka', 'formTerbuka', {}, paint, { fresh: 15000, globalKey: true, onError: (r) => { el.innerHTML = errorBox(r.message); } });
    if (!res.success && !res.cached && Store.get('c:' + AppState.mode + ':g:formTerbuka', null)) toast('Gagal memperbarui', res.message, 'warning');
  }
});

registerPage('f', {
  init(el) {
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (!b) return; if (b.dataset.act === 'back') go('formulir'); if (b.dataset.act === 'cek-nisn') formCekNisn(el, b); if (b.dataset.act === 'lagi') { window.scrollTo(0, 0); route(); } });
    el.addEventListener('submit', (e) => { e.preventDefault(); formKirim(el); });
    el.addEventListener('change', (e) => { if (e.target.type === 'file') formFileInfo(e.target); });
  },
  async show(el, token) {
    const back = !!AppState.fromFormList;   // dibuka dari daftar formulir → ada tombol kembali; dari link yang dibagikan → tidak
    const appbar = (o) => window.appbar(Object.assign({ back, logo: !back }, o));
    el.innerHTML = '<div class="pub pub-wide"><div class="pub-inner">' + appbar({ title: 'Formulir', sub: '' }) + '<div class="pub-body">' + skeletonCards(4, 90) + '</div></div></div>';
    const res = await api('getForm', { token });
    if (!res.success) { el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Formulir' }) + errorBox(res.message) + '</div></div>'; return; }
    el._f = res.data; el._siswa = null;
    const d = res.data, f = d.form;
    if (d.sekolah && d.sekolah.WarnaUtama) setPrimary(d.sekolah.WarnaUtama);
    if (!f.terbuka) { el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: f.Judul }) + '<div class="card" style="margin:16px"><div class="empty"><div class="empty-art">' + ic('lock', 'ic-xl') + '</div><div class="empty-title">Formulir sudah ditutup</div><div>Pendaftaran tidak lagi menerima jawaban.</div></div></div></div></div>'; return; }
    el.innerHTML = '<div class="pub pub-wide"><div class="pub-inner">' + appbar({ title: f.Judul, sub: f.EventJudul }) + '<form class="pub-body" novalidate>' +
      '<div class="card card-pad" style="border-top:6px solid var(--primary)"><h2>' + esc(f.Judul) + '</h2>' + (f.Deskripsi ? '<p class="muted mt-8" style="line-height:1.6">' + esc(f.Deskripsi) + '</p>' : '') +
      '<div class="row row-wrap mt-12">' + (f.EventJudul ? '<span class="badge">' + ic('calendar', 'ic-sm') + esc(f.EventJudul) + '</span>' : '') + (f.BatasWaktu ? '<span class="badge badge-amber">' + ic('clock', 'ic-sm') + 'Batas: ' + esc(tglPendek(f.BatasWaktu)) + '</span>' : '') + '</div></div>' +
      (f.Akses === 'LoginSiswa' ? '<div class="card card-pad mt-16"><div class="field"><label>NISN <span class="req">*</span></label><div class="row"><input class="input grow" id="f-nisn" inputmode="numeric" maxlength="10" placeholder="10 digit NISN"><button type="button" class="btn btn-soft" data-act="cek-nisn">Periksa</button></div><div class="hint">Formulir ini khusus siswa. Nama & kelas terisi otomatis.</div><div id="nisn-out"></div></div></div>' : '') +
      d.pertanyaan.map((q, i) => formField(q, i)).join('') +
      '<div id="f-err"></div><button class="btn btn-primary btn-block btn-lg mt-16" type="submit" id="f-kirim">' + ic('send') + ' Kirim Pendaftaran</button><p class="center muted small mt-12">Tanda <span class="req">*</span> wajib diisi.</p></form></div></div>';
  }
});
function formField(q, i) {
  const id = 'q_' + q.PertanyaanID, req = q.Wajib ? '<span class="req">*</span>' : '';
  let inp = '';
  if (q.Tipe === 'singkat') inp = '<input class="input" id="' + id + '" name="' + q.PertanyaanID + '" placeholder="Jawaban singkat">';
  if (q.Tipe === 'panjang') inp = '<textarea class="textarea" id="' + id + '" name="' + q.PertanyaanID + '" placeholder="Jawaban panjang"></textarea>';
  if (q.Tipe === 'angka') {
    const a = q.AturanAngka; const max = a && a.operator === '=' ? a.jumlahDigit : a && a.operator === '<' ? a.jumlahDigit - 1 : '';
    inp = '<input class="input mono" id="' + id + '" name="' + q.PertanyaanID + '" inputmode="numeric" ' + (max ? 'maxlength="' + max + '"' : '') + ' placeholder="Hanya angka">' +
      (a ? '<div class="hint">' + (a.operator === '=' ? 'Harus tepat ' : a.operator === '<' ? 'Kurang dari ' : 'Lebih dari ') + a.jumlahDigit + ' digit</div>' : '');
  }
  if (q.Tipe === 'pilihan_ganda') inp = '<div class="stack gap-4">' + q.Opsi.map(o => '<label class="radio-card"><input type="radio" name="' + q.PertanyaanID + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>').join('') + '</div>';
  if (q.Tipe === 'checkbox') inp = '<div class="stack gap-4">' + q.Opsi.map(o => '<label class="radio-card"><input type="checkbox" name="' + q.PertanyaanID + '" value="' + esc(o) + '"><span>' + esc(o) + '</span></label>').join('') + '</div>';
  if (q.Tipe === 'unggah_berkas') {
    const a = q.AturanBerkas || { jenis: ['jpg', 'png', 'pdf'], maksMB: 2 };
    inp = '<label class="card-tap" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:20px;border:2px dashed var(--border-2);border-radius:14px;background:var(--bg);cursor:pointer;text-align:center">' + ic('cloud-upload', 'ic-lg') +
      '<b>Pilih berkas</b><span class="hint">' + esc(a.jenis.join(', ').toUpperCase()) + ' · maks. ' + a.maksMB + ' MB</span><input type="file" id="' + id + '" name="' + q.PertanyaanID + '" accept="' + a.jenis.map(x => '.' + x + (x === 'jpg' ? ',.jpeg' : '')).join(',') + '" hidden data-maks="' + a.maksMB + '" data-jenis="' + esc(a.jenis.join(',')) + '"><span class="small" data-info></span></label>';
  }
  return '<div class="card card-pad mt-16" data-q="' + esc(q.PertanyaanID) + '"><div class="field"><label for="' + id + '">' + (i + 1) + '. ' + esc(q.Label) + ' ' + req + '</label>' + (q.Petunjuk ? '<div class="hint" style="margin-top:-2px">' + esc(q.Petunjuk) + '</div>' : '') + inp + '<div data-err></div></div></div>';
}
function formFileInfo(inp) {
  const f = inp.files[0], info = inp.parentElement.querySelector('[data-info]');
  if (!f) { info.textContent = ''; return; }
  info.innerHTML = '<span class="badge badge-green">' + esc(f.name) + ' · ' + (f.size / 1024 / 1024).toFixed(2) + ' MB</span>';
}
async function formCekNisn(el, btn) {
  const n = $('#f-nisn', el).value.replace(/\D/g, ''), out = $('#nisn-out', el);
  if (n.length !== 10) { out.innerHTML = '<div class="err-text">NISN harus 10 digit.</div>'; return; }
  const res = await busy(btn, () => api('cekNisnForm', { nisn: n }));
  if (!res.success) { el._siswa = null; out.innerHTML = '<div class="err-text">' + esc(res.message) + '</div>'; return; }
  el._siswa = Object.assign({ nisn: n }, res.data);
  out.innerHTML = '<div class="alert alert-green mt-8 small">' + ic('circle-check', 'ic-sm') + '<span><b>' + esc(res.data.nama) + '</b> · Kelas ' + esc(res.data.kelas) + '</span></div>';
  el._f.pertanyaan.forEach(q => {
    const inp = $('#q_' + q.PertanyaanID, el);
    if (/nama/i.test(q.Label) && inp && !inp.value) inp.value = res.data.nama;
    if (/nisn/i.test(q.Label) && inp && !inp.value) inp.value = n;
    if (/kelas/i.test(q.Label)) { const r = $$('input[name="' + q.PertanyaanID + '"]', el).find(x => x.value === res.data.kelas); if (r) r.checked = true; else if (inp && !inp.value) inp.value = res.data.kelas; }
  });
}
async function formKirim(el) {
  const d = el._f, f = d.form, jawaban = {}, berkas = {};
  let firstErr = null;
  $$('[data-err]', el).forEach(x => x.innerHTML = '');
  $$('.is-error', el).forEach(x => x.classList.remove('is-error'));
  const err = (q, msg) => { const c = $('[data-q="' + q.PertanyaanID + '"]', el); c.querySelector('[data-err]').innerHTML = '<div class="err-text">' + ic('circle-alert', 'ic-sm') + esc(msg) + '</div>'; const i = c.querySelector('.input,.textarea'); if (i) i.classList.add('is-error'); if (!firstErr) firstErr = c; };
  if (f.Akses === 'LoginSiswa' && !el._siswa) { toast('Periksa NISN dulu', 'Tekan tombol Periksa pada kolom NISN.', 'warning'); $('#f-nisn', el).focus(); return; }
  for (const q of d.pertanyaan) {
    const name = q.PertanyaanID;
    if (q.Tipe === 'unggah_berkas') {
      const inp = $('#q_' + name, el), file = inp.files[0];
      if (!file) { if (q.Wajib) err(q, 'Berkas wajib diunggah.'); continue; }
      const a = q.AturanBerkas || { jenis: ['jpg', 'png', 'pdf'], maksMB: 2 };
      const ext = file.name.split('.').pop().toLowerCase();
      if (a.jenis.indexOf(ext) < 0 && !(ext === 'jpeg' && a.jenis.indexOf('jpg') > -1)) { err(q, 'Jenis berkas harus ' + a.jenis.join(', ').toUpperCase() + '.'); continue; }
      if (file.size > Math.min(a.maksMB, 2) * 1024 * 1024) { err(q, 'Ukuran berkas maksimal ' + Math.min(a.maksMB, 2) + ' MB.'); continue; }
      berkas[name] = { file };
      continue;
    }
    let v;
    if (q.Tipe === 'pilihan_ganda') { const r = $('input[name="' + name + '"]:checked', el); v = r ? r.value : ''; }
    else if (q.Tipe === 'checkbox') v = $$('input[name="' + name + '"]:checked', el).map(x => x.value);
    else v = ($('#q_' + name, el).value || '').trim();
    const kosong = Array.isArray(v) ? !v.length : !v;
    if (q.Wajib && kosong) { err(q, 'Wajib diisi.'); continue; }
    if (!kosong && q.Tipe === 'angka') {
      if (!/^\d+$/.test(v)) { err(q, 'Hanya boleh angka.'); continue; }
      const a = q.AturanAngka;
      if (a && ((a.operator === '=' && v.length !== a.jumlahDigit) || (a.operator === '<' && !(v.length < a.jumlahDigit)) || (a.operator === '>' && !(v.length > a.jumlahDigit)))) { err(q, (a.operator === '=' ? 'Harus tepat ' : a.operator === '<' ? 'Harus kurang dari ' : 'Harus lebih dari ') + a.jumlahDigit + ' digit.'); continue; }
    }
    if (!kosong) jawaban[name] = v;
  }
  if (firstErr) { firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Periksa kembali isian', 'Ada isian yang belum sesuai.', 'warning'); return; }
  const btn = $('#f-kirim', el);
  await busy(btn, async () => {
    for (const k of Object.keys(berkas)) { const fl = berkas[k].file; berkas[k] = { name: fl.name, mime: fl.type || 'application/octet-stream', b64: await fileToB64(fl) }; }
    const res = await api('kirimJawaban', { token: location.hash.split('/')[2], nisn: el._siswa ? el._siswa.nisn : '', jawaban, berkas });
    if (!res.success) { $('#f-err', el).innerHTML = '<div class="alert alert-red mt-16">' + ic('circle-alert') + '<span>' + esc(res.message) + '</span></div>'; return; }
    el.innerHTML = '<div class="pub"><div class="pub-inner"><div class="thanks"><div class="thanks-ring">' + ic('check', 'ic-xl') + '</div><h1>Pendaftaran terkirim!</h1><p class="muted" style="max-width:340px;line-height:1.6">Terima kasih, jawabanmu untuk <b>' + esc(f.Judul) + '</b> sudah kami terima.</p>' +
      '<button class="btn btn-lg" data-act="lagi">' + ic('rotate-ccw', 'ic-sm') + ' Isi lagi</button>' + (AppState.fromFormList ? '<a class="btn btn-primary btn-lg" href="#/formulir">Formulir lain</a>' : '') + '</div></div></div>';
  });
}

/* ============================================================
   BERANDA PTK / JURI
   ============================================================ */
registerPage('ptk', {
  auth: 'ptk',
  init(el) {
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'logout') { const ok = await confirmBox({ title: 'Keluar?', text: 'Anda akan keluar dari akun ini.', ok: 'Keluar' }); if (ok) logout(); }
      if (a === 'home') go('');
      if (a === 'nilai') go('nilai/' + b.dataset.id);
      if (a === 'panel') { const ok = await busy(b, () => ensureStaffBoot(true)); if (ok) go('dasbor'); }
      if (a === 'osis') {
        const res = await busy(b, () => api('osisPtk', { eventId: b.dataset.id }));
        if (!res.success) { toast('Tidak dapat membuka surat suara', res.message, 'error'); return; }
        AppState.vote = { type: 'osis-ptk', event: res.data.event, kandidat: res.data.kandidat, user: AppState.user };
        go('osis');
      }
    });
  },
  async show(el) {
    const paint = (d) => {
      AppState.ptk = d;
      const u = AppState.user || {};
      const sec = (t, body) => '<div class="pub-section-title">' + t + '</div>' + body;
      el.innerHTML = '<div class="pub"><div class="pub-inner">' +
        '<div class="hero hero-sm" style="text-align:left;padding-bottom:26px"><div class="row" style="position:relative;z-index:2"><span class="avatar avatar-lg" style="background:#fff;color:var(--primary)">' + esc(initials(u.nama)) + '</span><div class="grow"><div class="hero-sub">Selamat datang,</div><div style="font-size:20px;font-weight:800;line-height:1.2">' + esc(u.nama) + '</div><div class="hero-sub">' + esc(u.jabatan || (AppState.role === 'tamu' ? 'Juri Tamu' : 'PTK')) + '</div></div>' +
        temaBtn('theme-hero-in') + '<button class="btn btn-sm" data-act="logout" style="background:rgba(255,255,255,.16);border-color:transparent;color:#fff">' + ic('log-out', 'ic-sm') + ' Keluar</button></div></div>' +
        '<div class="pub-body">' +
        (!d ? skeletonCards(3, 96) :
          (d.osis.length ? sec('Pemilihan OSIS', d.osis.map(o => '<div class="card menu-card"><span class="icon-tile">' + ic('vote', 'ic-lg') + '</span><div class="grow"><div class="t">' + esc(o.Judul) + '</div><div class="s">' + (o.sudahMemilih ? 'Anda sudah memberikan suara' : o.VotingDibuka === 'Ya' ? 'Voting sedang dibuka' : 'Voting belum dibuka') + '</div></div>' +
            (o.sudahMemilih ? '<span class="badge badge-green">' + ic('check', 'ic-sm') + ' Sudah</span>' : o.VotingDibuka === 'Ya' ? '<button class="btn btn-primary btn-sm" data-act="osis" data-id="' + esc(o.EventID) + '">Beri Suara</button>' : '<span class="badge badge-gray">Ditutup</span>') + '</div>').join('')) : '') +
          sec('Tugas Juri', d.juri.length ? d.juri.map(j => '<div class="card menu-card card-tap" tabindex="0" role="button" data-act="nilai" data-id="' + esc(j.CabangID) + '"><span class="icon-tile amber">' + ic('clipboard-check', 'ic-lg') + '</span><div class="grow"><div class="t">' + esc(j.NamaCabang) + '</div><div class="s">' + esc(j.EventJudul) + ' · ' + esc(jadwalCabang(j, true)) + (j.ModePenilaian === 'Babak' && j.BabakAktif ? ' · <b>' + esc(j.BabakAktif) + '</b>' : j.ModePenilaian === 'Peringkat' ? ' · <b>Rank 1 — tetapkan juara</b>' : j.ModePenilaian === 'Poin' ? ' · <b>Papan poin</b>' : '') + '</div>' +
            '<div class="row mt-8"><div class="prog grow ' + (j.dinilai >= j.jumlahPeserta && j.jumlahPeserta ? 'green' : '') + '"><i style="width:' + pct(j.dinilai, j.jumlahPeserta) + '%"></i></div><span class="small muted tnum">' + j.dinilai + '/' + j.jumlahPeserta + '</span></div></div>' + (j.Terkunci ? '<span class="badge badge-gray">' + ic('lock', 'ic-sm') + '</span>' : '<span class="chev">' + ic('chevron-right') + '</span>') + '</div>').join('')
            : '<div class="card"><div class="empty" style="padding:24px"><div class="empty-art">' + ic('clipboard-check', 'ic-xl') + '</div><div>Belum ada tugas juri untuk Anda.</div></div></div>') +
          (d.panitia.length ? sec('Event Kepanitiaan', d.panitia.map(p => '<div class="card menu-card"><span class="icon-tile green">' + ic('users', 'ic-lg') + '</span><div class="grow"><div class="t">' + esc(p.Judul) + '</div><div class="s">' + esc(p.JabatanPanitia) + ' · ' + esc(p.JenisEvent) + '</div></div><span class="badge ' + (p.Status === 'Berjalan' ? 'badge-green' : p.Status === 'Selesai' ? 'badge-blue' : 'badge-gray') + '">' + esc(p.Status) + '</span></div>').join('') +
            '<button class="btn btn-primary btn-block btn-lg" data-act="panel">' + ic('layout-dashboard') + ' Buka Panel Panitia</button>') : '')) +
        '<button class="btn btn-ghost btn-block mt-24" data-act="home">' + ic('house', 'ic-sm') + ' Halaman awal</button></div></div></div>';
    };
    paint(AppState.ptk);
    await swr('ptk', 'ptkBoot', {}, paint, { fresh: 10000 });
  }
});

/* ============================================================
   LEMBAR PENILAIAN JURI
   ============================================================ */
registerPage('nilai', {
  auth: 'juri',
  init(el) {
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const S = el._s, a = b.dataset.act;
      if (a === 'back') { if (S && S.bk && Object.keys(S.pend).length) bkKirim(el); if (S && S.rk && S.dirty) rkKirim(el); if (S && S.pn) { clearInterval(S.poll); pnKirim(el); } return go('ptk'); }
      if (!S) return;
      if (S.pn) {
        if (a === 'pn-tap' && !S.d.terkunci) pnTap(el, b.dataset.id, +b.dataset.v);
        if (a === 'pn-lain' && !S.d.terkunci) pnLain(el, b.dataset.id);
        if (a === 'pn-undo' && !S.d.terkunci) pnUndo(el, b.dataset.id);
        if (a === 'pn-riwayat') pnRiwayat(el);
        if (a === 'pn-urut') { S.urut = S.urut === 'poin' ? 'no' : 'poin'; pnPaint(el); }
        return;
      }
      if (S.rk) {
        if (a === 'rk-pilih' && !S.d.terkunci) rkPilih(el, +b.dataset.i);
        if (a === 'rk-clear' && !S.d.terkunci) { S.urutan[+b.dataset.i] = ''; rkUbah(el); }
        if (a === 'rk-simpan') rkKirim(el, true);
        return;
      }
      if (S.bk) {
        if (a === 'bk-babak') { S.babak = b.dataset.id; bkPaint(el); }
        if ((a === 'bk-min' || a === 'bk-plus') && !S.d.terkunci) { const cur = bkVal(S, S.babak, b.dataset.p); bkSet(el, b.dataset.p, cur === '' ? (a === 'bk-plus' ? 1 : 0) : cur + (a === 'bk-plus' ? 1 : -1)); }
        if (a === 'bk-flush') bkKirim(el, true);
        if (a === 'bk-top' && !S.d.terkunci) bkTop(el);
        return;
      }
      if (a === 'pes') { juriAmbil(el); S.idx = +b.dataset.i; juriPaint(el); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (a === 'daftar') juriDaftar(el);
      if (a === 'min' || a === 'plus') { if (S.d.terkunci) return; const k = S.d.kriteria.find(x => x.KriteriaID === b.dataset.k); const cur = juriVals(S)[k.KriteriaID]; const base = cur === undefined || cur === '' ? (a === 'plus' ? k.NilaiMin : k.NilaiMaks) : Number(cur); juriSet(el, k, base + (a === 'plus' ? 1 : -1)); }
      if (a === 'prev') { juriAmbil(el); if (S.idx > 0) { S.idx--; juriPaint(el); } }
      if (a === 'next') juriSimpan(el);
    });
    el.addEventListener('input', (e) => {
      const S = el._s; if (!S) return;
      if (S.bk) { if (e.target.dataset.bk && !S.d.terkunci) bkSet(el, e.target.dataset.bk, e.target.value.trim(), true); if (e.target.dataset.bkl && !S.d.terkunci) bkLolos(el, e.target.dataset.bkl, e.target.checked); return; }
      if (e.target.dataset.rng) { const k = S.d.kriteria.find(x => x.KriteriaID === e.target.dataset.rng); juriSet(el, k, e.target.value, 'rng'); }
      if (e.target.dataset.val) { const k = S.d.kriteria.find(x => x.KriteriaID === e.target.dataset.val); juriSet(el, k, e.target.value, 'val'); }
      if (e.target.id === 'catatan') juriVals(S)._catatan = e.target.value;
    });
  },
  async show(el, cabangId) {
    el._s = null;
    el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Penilaian Juri', sub: 'Memuat…' }) + '<div class="pub-body">' + skeletonCards(4, 140) + '</div></div></div>';
    const res = await swr('juri:' + cabangId, 'juriData', { cabangId }, (d) => {
      const prev = el._s;
      if (d.mode === 'Poin') {
        const old = prev && prev.pn ? prev : null;
        if (old) clearInterval(old.poll);
        el._s = { pn: true, d, cabangId, antre: old ? old.antre : [], batal: old ? old.batal : [], urut: old ? old.urut : 'no', t: old && old.t };
        pnGabung(el._s, d.log); pnPaint(el); pnPantau(el); return;
      }
      if (d.mode === 'Peringkat') {
        const keep = prev && prev.rk && prev.dirty;
        el._s = { rk: true, d, cabangId, urutan: keep ? prev.urutan : d.urutan.slice(), dirty: !!keep, t: prev && prev.t };
        rkPaint(el); return;
      }
      if (d.mode === 'Babak') {
        const pend = prev && prev.bk ? prev.pend : {};
        d.skor = d.skor || {};
        Object.keys(pend).forEach(k => { const x = pend[k]; const m = (d.skor[x.babakId] = d.skor[x.babakId] || {}); m[x.pesertaId] = Object.assign({ lolos: '' }, m[x.pesertaId], { benar: x.benar === '' ? null : x.benar }, x.lolos !== undefined ? { lolos: x.lolos } : {}); });
        el._s = { bk: true, d, cabangId, pend, gagal: prev && prev.bk ? prev.gagal : {}, babak: prev && prev.bk && d.babak.some(b => b.id === prev.babak) ? prev.babak : d.babakAktif, t: prev && prev.t };
        bkPaint(el); return;
      }
      const vals = {};
      d.peserta.forEach(p => { const m = d.nilai[p.PesertaID]; vals[p.PesertaID] = m ? Object.assign({ _catatan: m.catatan || '' }, m.nilai) : {}; });
      if (prev) Object.keys(prev.dirty).forEach(pid => { vals[pid] = prev.vals[pid]; });
      el._s = { d, vals, idx: prev ? prev.idx : Math.max(0, d.peserta.findIndex(p => !d.nilai[p.PesertaID])), dirty: prev ? prev.dirty : {}, gagal: prev ? prev.gagal : {}, cabangId };
      if (el._s.idx < 0 || el._s.idx >= d.peserta.length) el._s.idx = 0;
      juriPaint(el);
    }, { fresh: 0, onError: (r) => { el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Penilaian Juri' }) + errorBox(r.message) + '</div></div>'; } });
    if (!res.success && el._s) toast('Mode luring', 'Data diambil dari perangkat. ' + res.message, 'warning');
  }
});
/* ---- Juri: sistem tambah/kurang poin (cerdas cermat beregu) ---- */
/** Log server + ketukan yang belum terkirim − pembatalan yang belum terkirim. */
function pnGabung(S, logServer) {
  const ada = {}; (logServer || []).forEach(r => { ada[r.id] = 1; });
  S.log = (logServer || []).filter(r => S.batal.indexOf(r.id) < 0).concat(S.antre.filter(r => !ada[r.id]));
  S.antre = S.antre.filter(r => !ada[r.id]);
}
function pnTotal(S) { const t = {}; S.d.peserta.forEach(p => { t[p.PesertaID] = S.d.cfg.awal; }); S.log.forEach(r => { if (t[r.p] !== undefined) t[r.p] += r.v; }); return t; }
function pnPaint(el) {
  const S = el._s, d = S.d, lock = d.terkunci, T = pnTotal(S);
  const top = appbar({ title: 'Papan Poin', sub: d.cabang.NamaCabang + ' · ' + d.namaJuri });
  if (!d.peserta.length) { el.innerHTML = '<div class="pub"><div class="pub-inner">' + top + '<div class="card" style="margin:16px"><div class="empty"><div class="empty-art">' + ic('users', 'ic-xl') + '</div><div class="empty-title">Belum ada regu</div><div>Hubungi panitia untuk menambahkan regu/peserta.</div></div></div></div></div>'; return; }
  const rank = pnRank(S, T);
  const list = S.urut === 'poin' ? d.peserta.slice().sort((a, b) => T[b.PesertaID] - T[a.PesertaID] || a.NoUrut - b.NoUrut) : d.peserta;
  el.innerHTML = '<div class="pub"><div class="pub-inner" style="display:flex;flex-direction:column;min-height:calc(100vh - var(--ribbon))">' + top +
    '<div class="pub-body grow">' + (lock ? '<div class="alert alert-amber small mb-12">' + ic('lock', 'ic-sm') + '<span>Penilaian sudah dikunci panitia. Poin hanya bisa dilihat.</span></div>' : '') +
    '<div class="row between mb-12"><span class="small muted">Ketuk <b style="color:var(--green-text)">+</b> saat benar, <b style="color:var(--red-text)">−</b> saat salah. Tersimpan otomatis.</span><button type="button" class="btn btn-soft btn-sm" data-act="pn-urut">' + ic('list-ordered', 'ic-sm') + ' ' + (S.urut === 'poin' ? 'Urut nomor' : 'Urut poin') + '</button></div>' +
    list.map(p => '<div class="pj-card" data-pid="' + esc(p.PesertaID) + '"><div class="pj-top"><span class="rank' + (rank[p.PesertaID] <= 3 ? ' r' + rank[p.PesertaID] : '') + '" title="Peringkat sementara">' + rank[p.PesertaID] + '</span><div class="grow"><div class="pj-name ellipsis">' + esc(p.NamaTampil) + '</div><div class="pj-mem ellipsis">' + esc((p.Anggota || []).length ? p.Anggota.join(', ') : 'No. ' + noUrut(p.NoUrut) + ' · Kelas ' + p.Kelas) + '</div></div><b class="pj-total" data-pn-tot="' + esc(p.PesertaID) + '">' + T[p.PesertaID] + '</b></div>' +
      (lock ? '' : '<div class="pj-btns">' + d.cfg.tombol.map(v => '<button type="button" class="poin-btn ' + (v > 0 ? 'plus' : 'minus') + '" data-act="pn-tap" data-id="' + esc(p.PesertaID) + '" data-v="' + v + '" aria-label="' + (v > 0 ? 'Tambah ' : 'Kurangi ') + Math.abs(v) + ' poin untuk ' + esc(p.NamaTampil) + '">' + fmtPoin(v) + '</button>').join('') + '<button type="button" class="poin-btn" style="background:var(--surface-2);color:var(--text-2)" data-act="pn-lain" data-id="' + esc(p.PesertaID) + '" aria-label="Poin lain">±</button></div>') +
      '<div class="pj-last" data-pn-last="' + esc(p.PesertaID) + '">' + pnLastHtml(S, p.PesertaID, lock) + '</div></div>').join('') +
    '</div><div class="bottom-bar"><span class="small muted grow" id="pn-st" aria-live="polite">' + (lock ? 'Terkunci' : S.antre.length || S.batal.length ? 'Menyimpan…' : 'Semua poin tersimpan') + '</span><button class="btn btn-soft btn-lg" data-act="pn-riwayat">' + ic('history') + ' Riwayat</button></div></div></div>';
}
function pnLastHtml(S, pid, lock) {
  const r = S.log.filter(x => x.p === pid).slice(-1)[0];
  if (!r) return '<span>Belum ada poin</span>';
  return '<span class="poin-chip ' + (r.v > 0 ? 'plus' : 'minus') + '">' + fmtPoin(r.v) + '</span><span class="grow">terakhir' + (r.w ? ' · ' + esc(jam(r.w)) : '') + '</span>' + (lock ? '' : '<button type="button" class="link-btn" data-act="pn-undo" data-id="' + esc(r.id) + '">' + ic('rotate-ccw', 'ic-sm') + ' Batalkan</button>');
}
function pnRank(S, T) { const r = {}; S.d.peserta.slice().sort((a, b) => T[b.PesertaID] - T[a.PesertaID]).forEach((p, i, arr) => { r[p.PesertaID] = i && T[p.PesertaID] === T[arr[i - 1].PesertaID] ? r[arr[i - 1].PesertaID] : i + 1; }); return r; }
function pnSegarkan(el, pid) {
  const S = el._s, T = pnTotal(S), R = pnRank(S, T);
  $$('.pj-card[data-pid]', el).forEach(c => { const b = $('.rank', c), k = R[c.dataset.pid]; if (b && +b.textContent !== k) { b.textContent = k; b.className = 'rank' + (k <= 3 ? ' r' + k : ''); } });
  const t = $('[data-pn-tot="' + pid + '"]', el); if (t) { t.textContent = T[pid]; t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); }
  const l = $('[data-pn-last="' + pid + '"]', el); if (l) l.innerHTML = pnLastHtml(S, pid, S.d.terkunci);
  const st = $('#pn-st', el); if (st) st.textContent = 'Menyimpan…';
}
function pnTap(el, pid, v) {
  const n = new Date(), z = (x) => String(x).padStart(2, '0');
  const S = el._s, r = { id: idPoinBaru(), p: pid, v, o: S.d.namaJuri, w: n.getFullYear() + '-' + z(n.getMonth() + 1) + '-' + z(n.getDate()) + 'T' + z(n.getHours()) + ':' + z(n.getMinutes()) + ':' + z(n.getSeconds()) };
  S.log.push(r); S.antre.push(r);
  if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
  pnSegarkan(el, pid); pnJadwal(el);
}
function pnUndo(el, id) {
  const S = el._s, r = S.log.find(x => x.id === id); if (!r) return;
  S.log = S.log.filter(x => x.id !== id);
  if (S.antre.some(x => x.id === id)) S.antre = S.antre.filter(x => x.id !== id); else S.batal.push(id);
  pnSegarkan(el, r.p); pnJadwal(el);
  toast('Poin dibatalkan', fmtPoin(r.v) + ' · ' + ((S.d.peserta.find(p => p.PesertaID === r.p) || {}).NamaTampil || ''));
}
function pnLain(el, pid) {
  const S = el._s, p = S.d.peserta.find(x => x.PesertaID === pid);
  const m = modal({ title: 'Poin lain', sub: esc(p.NamaTampil), size: 'sm', body: '<div class="field"><label>Jumlah poin</label><input class="input" id="pn-v" type="number" inputmode="numeric" placeholder="mis. 25 atau -25" autofocus></div><div class="hint mt-8">Angka negatif untuk mengurangi.</div>',
    foot: '<button class="btn" data-close>Batal</button><button class="btn btn-danger" id="pn-k">' + ic('minus', 'ic-sm') + ' Kurangi</button><button class="btn btn-success" id="pn-t">' + ic('plus', 'ic-sm') + ' Tambah</button>' });
  const go2 = (tanda) => { const v = Math.abs(Math.round(+m.q('#pn-v').value || 0)); if (!v) return m.q('#pn-v').focus(); m.close(); pnTap(el, pid, tanda * v); };
  m.q('#pn-t').onclick = () => go2(1); m.q('#pn-k').onclick = () => go2(-1);
  m.q('#pn-v').addEventListener('keydown', (e) => { if (e.key === 'Enter') go2(+m.q('#pn-v').value < 0 ? -1 : 1); });
}
function pnRiwayat(el) {
  const S = el._s, nm = {}; S.d.peserta.forEach(p => { nm[p.PesertaID] = p.NamaTampil; });
  const L = S.log.slice(-40).reverse();
  const m = modal({ title: 'Riwayat Poin', sub: esc(S.d.cabang.NamaCabang) + ' · ' + S.log.length + ' ketukan',
    body: L.length ? '<div>' + L.map(r => '<div class="row" style="padding:8px 0;border-bottom:1px solid var(--line-soft)"><span class="poin-chip ' + (r.v > 0 ? 'plus' : 'minus') + '">' + fmtPoin(r.v) + '</span><span class="grow ellipsis"><b>' + esc(nm[r.p] || '') + '</b><span class="small muted"> · ' + esc(r.o || '') + (r.w ? ' · ' + esc(jam(r.w)) : '') + '</span></span>' + (S.d.terkunci ? '' : '<button class="btn btn-ghost btn-icon btn-sm" data-undo="' + esc(r.id) + '" title="Batalkan">' + ic('rotate-ccw', 'ic-sm') + '</button>') + '</div>').join('') + '</div>' : '<div class="empty" style="padding:20px">Belum ada poin.</div>' });
  m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-undo]'); if (!b) return; pnUndo(el, b.dataset.undo); m.close(); pnRiwayat(el); });
}
function pnJadwal(el) { const S = el._s; clearTimeout(S.t); S.t = setTimeout(() => pnKirim(el), 450); }
function pnKirim(el) {
  const S = el._s; if (!S || !S.pn || S.kirim) return;
  clearTimeout(S.t);
  if (!S.antre.length && !S.batal.length) return;
  const tambah = S.antre.slice(), batal = S.batal.slice(); S.kirim = true;
  api('juriPoin', { cabangId: S.cabangId, tambah: tambah.map(r => ({ id: r.id, pesertaId: r.p, nilai: r.v })), batal }, { reqId: idPoinBaru() }).then(res => {
    S.kirim = false;
    const live = el._s === S && !el.hidden;
    if (res.success) {
      const ids = tambah.map(r => r.id);
      S.antre = S.antre.filter(r => ids.indexOf(r.id) < 0); S.batal = S.batal.filter(id => batal.indexOf(id) < 0);
      S.d.log = S.log.filter(r => S.antre.indexOf(r) < 0);
      swrPut('juri:' + S.cabangId, S.d); AppState.ptk = null; swrDrop('ptk');
      const st = live && $('#pn-st', el); if (st) st.textContent = S.antre.length || S.batal.length ? 'Menyimpan…' : 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (S.antre.length || S.batal.length) pnJadwal(el);
    } else {
      if (res.data && res.data.code === 'LOCKED') { S.d.terkunci = true; S.antre = []; S.batal = []; pnGabung(S, S.d.log); if (live) pnPaint(el); toast('Penilaian dikunci panitia', res.message, 'warning'); return; }
      const st = live && $('#pn-st', el); if (st) st.textContent = 'Belum tersimpan — mencoba lagi…';
      setTimeout(() => pnKirim(el), 3000);
    }
  });
}
/** Ambil poin terbaru dari server (mis. juri lain ikut mengisi) setiap 6 detik saat tidak ada antrean. */
function pnPantau(el) {
  const S = el._s;
  S.poll = setInterval(async () => {
    if (el._s !== S || el.hidden) { clearInterval(S.poll); return; }
    if (S.kirim || S.antre.length || S.batal.length || document.visibilityState !== 'visible') return;
    const res = await api('juriData', { cabangId: S.cabangId });
    if (!res.success || el._s !== S || S.antre.length || S.batal.length) return;
    const lama = S.log.map(r => r.id).join(','), baru = (res.data.log || []).map(r => r.id).join(',');
    S.d.terkunci = res.data.terkunci;
    if (lama !== baru) { S.d.log = res.data.log; pnGabung(S, res.data.log); pnPaint(el); }
  }, 6000);
}
/* ---- Juri: sistem Rank 1 (gugur bila salah) — juri menetapkan Juara 1, 2, 3 (+ harapan) ---- */
function rkLabel(d, i) { return i < d.jumlahJuara ? 'Juara ' + (i + 1) : 'Juara Harapan ' + (i - d.jumlahJuara + 1); }
function rkPaint(el) {
  const S = el._s, d = S.d, lock = d.terkunci;
  const top = appbar({ title: 'Penetapan Juara', sub: d.cabang.NamaCabang + ' · ' + d.namaJuri });
  if (!d.peserta.length) { el.innerHTML = '<div class="pub"><div class="pub-inner">' + top + '<div class="card" style="margin:16px"><div class="empty"><div class="empty-art">' + ic('clipboard-list', 'ic-xl') + '</div><div class="empty-title">Belum ada peserta</div><div>Hubungi panitia untuk melengkapi data cabang ini.</div></div></div></div></div>'; return; }
  const pm = {}; d.peserta.forEach(p => { pm[p.PesertaID] = p; });
  const terisi = S.urutan.filter(Boolean).length;
  el.innerHTML = '<div class="pub"><div class="pub-inner" style="display:flex;flex-direction:column;min-height:calc(100vh - var(--ribbon))">' + top +
    '<div class="pub-body grow">' + (lock ? '<div class="alert alert-amber small mb-12">' + ic('lock', 'ic-sm') + '<span>Penilaian sudah dikunci panitia. Penetapan hanya bisa dilihat.</span></div>' : '') +
    '<div class="alert alert-blue small mb-16">' + ic('info', 'ic-sm') + '<span><b>Sistem Rank 1</b> — semua peserta menjawab pertanyaan yang sama; yang salah menjawab gugur. Peserta yang bertahan paling akhir adalah <b>Juara 1</b>.</span></div>' +
    '<div class="row between small mb-8"><b>Penetapan Juara</b><span style="color:var(--primary);font-weight:700">' + terisi + '/' + S.urutan.length + ' ditetapkan</span></div>' +
    S.urutan.map((pid, i) => { const p = pm[pid], har = i >= d.jumlahJuara;
      return '<div class="rk-slot' + (p ? ' on' : '') + (har ? ' har' : '') + '"><span class="rank' + (!har && i < 3 ? ' r' + (i + 1) : '') + '">' + (har ? 'H' + (i - d.jumlahJuara + 1) : i + 1) + '</span><div class="grow" style="min-width:0"><div class="small muted" style="font-weight:700;letter-spacing:.04em">' + esc(rkLabel(d, i).toUpperCase()) + '</div>' +
        (p ? '<b class="ellipsis" style="display:block;font-size:16px">' + esc(p.NamaTampil) + '</b><span class="small muted">No. ' + noUrut(p.NoUrut) + ' · Kelas ' + esc(p.Kelas) + '</span>' : '<span class="muted">Belum ditetapkan</span>') + '</div>' +
        (lock ? '' : (p ? '<button type="button" class="btn btn-ghost btn-icon btn-sm" data-act="rk-clear" data-i="' + i + '" aria-label="Kosongkan ' + esc(rkLabel(d, i)) + '">' + ic('x', 'ic-sm') + '</button>' : '') + '<button type="button" class="btn btn-soft btn-sm" data-act="rk-pilih" data-i="' + i + '">' + (p ? 'Ganti' : 'Pilih') + '</button>') + '</div>'; }).join('') +
    '<div class="row muted small mt-12" style="align-items:flex-start">' + ic('circle-check', 'ic-sm') + '<span>Ketuk <b>Pilih</b> lalu ketuk nama peserta. Penetapan tersimpan otomatis dan langsung tampil di hasil.</span></div></div>' +
    '<div class="bottom-bar"><span class="small muted grow" id="rk-st" aria-live="polite">' + (lock ? 'Terkunci' : S.dirty ? 'Menyimpan…' : 'Semua penetapan tersimpan') + '</span><button class="btn btn-primary btn-lg" data-act="rk-simpan"' + (lock ? ' disabled' : '') + '>' + ic('save') + ' Simpan</button></div></div></div>';
}
function rkPilih(el, i) {
  const S = el._s, d = S.d;
  const m = modal({ title: 'Pilih ' + rkLabel(d, i), sub: esc(d.cabang.NamaCabang),
    body: '<div class="name-list" style="max-height:60vh">' + d.peserta.map(p => { const j = S.urutan.indexOf(p.PesertaID);
      return '<button type="button" class="name-row' + (j === i ? ' on' : '') + '" data-pid="' + esc(p.PesertaID) + '">' + avatarHtml(p.NamaTampil, '', 'avatar-sm') + '<span class="grow" style="min-width:0"><span style="font-weight:600;display:block" class="ellipsis">' + noUrut(p.NoUrut) + ' · ' + esc(p.NamaTampil) + '</span><span class="muted small">Kelas ' + esc(p.Kelas) + '</span></span>' + (j > -1 ? '<span class="badge' + (j === i ? '' : ' badge-gray') + '">' + esc(rkLabel(d, j)) + '</span>' : '') + '</button>'; }).join('') + '</div>' });
  m.el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pid]'); if (!b) return;
    const pid = b.dataset.pid, j = S.urutan.indexOf(pid);
    if (j > -1 && j !== i) S.urutan[j] = S.urutan[i] || '';   // tukar posisi
    S.urutan[i] = pid;
    m.close(); rkUbah(el);
  });
}
function rkUbah(el) { const S = el._s; S.dirty = true; rkPaint(el); clearTimeout(S.t); S.t = setTimeout(() => rkKirim(el), 700); }
function rkKirim(el, manual) {
  const S = el._s; if (!S || !S.rk) return;
  clearTimeout(S.t);
  if (!S.dirty) { if (manual) toast('Penetapan sudah tersimpan'); return; }
  const snap = S.urutan.slice(), reqId = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random());
  api('juriPeringkat', { cabangId: S.cabangId, urutan: snap }, { reqId }).then(res => {
    const live = el._s === S;
    if (res.success) {
      S.d.urutan = snap; if (S.urutan.join('|') === snap.join('|')) S.dirty = false;
      swrPut('juri:' + S.cabangId, S.d); AppState.ptk = null; swrDrop('ptk');
      const st = live && $('#rk-st', el); if (st) st.textContent = S.dirty ? 'Menyimpan…' : 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      if (manual) toast('Penetapan juara tersimpan');
    } else {
      toast('Penetapan belum tersimpan', res.message, 'error');
      if (res.data && res.data.code === 'LOCKED') { S.d.terkunci = true; S.urutan = S.d.urutan.slice(); S.dirty = false; }
      if (live && !el.hidden) rkPaint(el);
    }
  });
}
/* ---- Juri: sistem babak (skor = jumlah jawaban benar), simpan otomatis ---- */
function bkBabak(S) { return S.d.babak.find(x => x.id === S.babak) || S.d.babak[0]; }
function bkVal(S, bid, pid) { const m = (S.d.skor[bid] || {})[pid]; return m && m.benar !== null && m.benar !== undefined && m.benar !== '' ? Number(m.benar) : ''; }
function bkPaint(el) {
  const S = el._s, d = S.d, lock = d.terkunci;
  const top = appbar({ title: 'Penilaian Juri', sub: d.cabang.NamaCabang + ' · ' + d.namaJuri });
  if (!d.peserta.length || !d.babak.length) { el.innerHTML = '<div class="pub"><div class="pub-inner">' + top + '<div class="card" style="margin:16px"><div class="empty"><div class="empty-art">' + ic('clipboard-list', 'ic-xl') + '</div><div class="empty-title">Belum ada peserta</div><div>Hubungi panitia untuk melengkapi data cabang ini.</div></div></div></div></div>'; return; }
  bkAlur(S);
  const B = bkBabak(S); S.babak = B.id;
  const bi = d.babak.indexOf(B), nxt = d.babak[bi + 1];
  const pes = d.peserta.filter(p => B.ikut.indexOf(p.PesertaID) > -1);
  el.innerHTML = '<div class="pub"><div class="pub-inner" style="display:flex;flex-direction:column;min-height:calc(100vh - var(--ribbon))">' + top +
    '<div style="padding:12px 16px 4px">' + (lock ? '<div class="alert alert-amber small mb-8">' + ic('lock', 'ic-sm') + '<span>Penilaian sudah dikunci panitia. Skor hanya bisa dilihat.</span></div>' : '') +
    '<div class="row row-wrap" style="gap:8px">' + d.babak.map((b, i) => '<button class="chip' + (b.id === B.id ? ' on' : '') + '" data-act="bk-babak" data-id="' + esc(b.id) + '"' + (b.ikut.length ? '' : ' disabled title="Belum dibuka panitia"') + '>' + (b.final ? ic('trophy', 'ic-sm') + ' ' : '') + esc(b.nama) + (b.id === d.babakAktif ? ' <span class="dot" style="background:var(--green)"></span>' : '') + '</button>').join('') + '</div>' +
    '<div class="row between small mt-12"><b>' + esc(B.nama) + (B.final && !/final/i.test(B.nama) ? ' (Final)' : '') + (B.maks ? ' · ' + B.maks + ' soal' : '') + '</b><span style="color:var(--primary);font-weight:700" id="bk-done"></span></div><div class="prog mt-8"><i id="bk-prog"></i></div></div>' +
    '<div class="pub-body grow" style="padding-top:8px"><div class="card" style="padding:4px 16px">' +
    (pes.length ? pes.map(p => { const v = bkVal(S, B.id, p.PesertaID), m = (d.skor[B.id] || {})[p.PesertaID], lol = m && m.lolos === 'Ya';
      return '<div class="bk-row' + (v !== '' ? ' done' : '') + '" data-pid="' + esc(p.PesertaID) + '"><span class="bk-no">' + noUrut(p.NoUrut) + '</span><div class="grow"><b>' + esc(p.NamaTampil) + '</b><div class="small muted">Kelas ' + esc(p.Kelas) + (S.gagal[p.PesertaID] ? ' · <span class="err-text">belum tersimpan</span>' : '') + '</div></div>' +
        '<div class="bk-step"><button type="button" data-act="bk-min" data-p="' + esc(p.PesertaID) + '" aria-label="Kurangi"' + (lock ? ' disabled' : '') + '>' + ic('minus') + '</button><input class="input" inputmode="numeric" data-bk="' + esc(p.PesertaID) + '" value="' + v + '" placeholder="–" aria-label="Jumlah benar ' + esc(p.NamaTampil) + '"' + (lock ? ' readonly' : '') + '><button type="button" data-act="bk-plus" data-p="' + esc(p.PesertaID) + '" aria-label="Tambah"' + (lock ? ' disabled' : '') + '>' + ic('plus') + '</button><span class="bk-max">' + (B.maks ? '/' + B.maks : 'benar') + '</span></div>' +
        (nxt ? '<label class="switch bk-lolos' + (lol ? ' on' : '') + '"><input type="checkbox" data-bkl="' + esc(p.PesertaID) + '"' + (lol ? ' checked' : '') + (lock ? ' disabled' : '') + '><span class="track"></span><span>Lolos ke ' + esc(nxt.nama) + '</span></label>' : '') + '</div>'; }).join('')
      : '<div class="empty" style="padding:24px">Belum ada peserta di babak ini.</div>') + '</div>' +
    '<div class="row muted small mt-12" style="align-items:flex-start">' + ic('info', 'ic-sm') + '<span>Isi <b>jumlah jawaban benar</b> tiap peserta — tersimpan otomatis. ' + (B.final ? 'Juara ditentukan dari hasil akhir.' : 'Geser <b>Lolos</b> untuk peserta yang maju ke ' + esc(nxt ? nxt.nama : 'babak berikutnya') + ' — mereka langsung muncul di babak itu.') + '</span></div>' +
    (nxt && pes.length && !lock ? '<div class="card card-pad mt-12 row row-wrap" style="gap:8px"><span class="small" style="font-weight:600">Loloskan</span><input class="input input-sm" type="number" min="1" id="bk-topn" value="' + Math.max(1, Math.min(pes.length, B.lolos || Math.ceil(pes.length / 2))) + '" style="width:72px" aria-label="Jumlah peserta lolos"><span class="small">teratas</span><button type="button" class="btn btn-soft btn-sm" data-act="bk-top">' + ic('list-ordered', 'ic-sm') + ' Terapkan</button><span class="small muted" style="flex-basis:100%">Nilai sama di batas kelulusan ikut lolos.</span></div>' : '') + '</div>' +
    '<div class="bottom-bar"><span class="small muted grow" id="bk-st" aria-live="polite">' + (lock ? 'Terkunci' : Object.keys(S.pend).length ? 'Menyimpan…' : 'Semua skor tersimpan') + '</span><button class="btn btn-primary btn-lg" data-act="bk-flush"' + (lock ? ' disabled' : '') + '>' + ic('save') + ' Simpan</button></div></div></div>';
  bkCount(el);
}
function bkCount(el) {
  const S = el._s, B = bkBabak(S), n = B.ikut.length, done = B.ikut.filter(pid => bkVal(S, B.id, pid) !== '').length;
  const t = $('#bk-done', el), g = $('#bk-prog', el);
  if (t) t.textContent = done + '/' + n + ' dinilai'; if (g) g.style.width = pct(done, n) + '%';
}
function bkSet(el, pid, val, dariKetik) {
  const S = el._s, B = bkBabak(S);
  let n = val === '' ? '' : Math.round(Number(val));
  if (n !== '' && isNaN(n)) return;
  if (n !== '') { n = Math.max(0, n); if (B.maks) n = Math.min(B.maks, n); }
  const m = (S.d.skor[B.id] = S.d.skor[B.id] || {});
  m[pid] = Object.assign({ lolos: '' }, m[pid], { benar: n === '' ? null : n });
  const row = $('.bk-row[data-pid="' + pid + '"]', el);
  if (row) { const inp = row.querySelector('input[data-bk]'); if (!dariKetik || String(n) !== inp.value) inp.value = n; row.classList.toggle('done', n !== ''); }
  bkAntre(el, B.id, pid);
}
/** Antrekan perubahan (skor + lolos) satu peserta untuk dikirim. */
function bkAntre(el, bid, pid) {
  const S = el._s, m = (S.d.skor[bid] || {})[pid] || {};
  S.pend[bid + '|' + pid] = { babakId: bid, pesertaId: pid, benar: m.benar === null || m.benar === undefined ? '' : m.benar, lolos: m.lolos || '' };
  delete S.gagal[pid];
  bkCount(el);
  const st = $('#bk-st', el); if (st) st.textContent = 'Menyimpan…';
  clearTimeout(S.t); S.t = setTimeout(() => bkKirim(el), 900);
}
/** Siapa ikut tiap babak dihitung ulang di perangkat (sama dengan server) agar tanda lolos langsung terlihat. */
function bkAlur(S) {
  const d = S.d; let ikut = d.peserta.map(p => p.PesertaID), aktif = d.babak.length ? d.babak[0].id : '';
  d.babak.forEach(b => {
    const m = d.skor[b.id] || {};
    b.ikut = ikut.slice();
    b.dinilai = ikut.filter(id => m[id] && m[id].benar !== null && m[id].benar !== undefined && m[id].benar !== '').length;
    b.lolos = ikut.filter(id => m[id] && m[id].lolos === 'Ya').length;
    if (b.ikut.length) aktif = b.id;
    ikut = ikut.filter(id => m[id] && m[id].lolos === 'Ya');
  });
  d.babakAktif = aktif;
}
function bkSetLolos(S, bid, pid, ya) {
  const m = (S.d.skor[bid] = S.d.skor[bid] || {}), cur = m[pid] || { benar: null };
  m[pid] = Object.assign({}, cur, { lolos: ya ? 'Ya' : (cur.benar === null || cur.benar === undefined || cur.benar === '' ? '' : 'Tidak') });
}
function bkLolos(el, pid, ya) {
  const S = el._s, B = bkBabak(S);
  bkSetLolos(S, B.id, pid, ya); bkAntre(el, B.id, pid); bkPaint(el);
}
function bkTop(el) {
  const S = el._s, B = bkBabak(S), n = Math.max(1, +($('#bk-topn', el) || {}).value || 1);
  const v = B.ikut.map(pid => ({ pid, v: bkVal(S, B.id, pid) === '' ? -1 : bkVal(S, B.id, pid) })).sort((a, b) => b.v - a.v);
  if (!v.length) return;
  const batas = v[Math.min(n, v.length) - 1].v;
  v.forEach(x => { bkSetLolos(S, B.id, x.pid, x.v >= 0 && x.v >= batas); bkAntre(el, B.id, x.pid); });
  bkPaint(el);
  toast(v.filter(x => x.v >= 0 && x.v >= batas).length + ' peserta lolos', 'Tersimpan otomatis.');
}
/** Kirim semua perubahan tertunda (dikelompokkan per babak), aman diulang dengan reqId. */
function bkKirim(el, manual) {
  const S = el._s; if (!S || !S.bk) return;
  clearTimeout(S.t);
  const keys = Object.keys(S.pend);
  if (!keys.length) { if (manual) toast('Semua skor sudah tersimpan'); return; }
  const grp = {};
  keys.forEach(k => { const x = S.pend[k]; (grp[x.babakId] = grp[x.babakId] || []).push([k, x]); });
  Object.keys(grp).forEach(bid => {
    const items = grp[bid], reqId = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random());
    api('juriSkorBabak', { cabangId: S.cabangId, babakId: bid, rows: items.map(it => ({ pesertaId: it[1].pesertaId, benar: it[1].benar, lolos: it[1].lolos })) }, { reqId }).then(res => {
      const live = el._s === S;
      if (res.success) {
        items.forEach(it => { if (S.pend[it[0]] === it[1]) delete S.pend[it[0]]; });
        swrPut('juri:' + S.cabangId, S.d); AppState.ptk = null; swrDrop('ptk');
        const st = live && $('#bk-st', el); if (st) st.textContent = Object.keys(S.pend).length ? 'Menyimpan…' : 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        if (manual) toast('Skor tersimpan', items.length + ' peserta');
      } else {
        items.forEach(it => { S.gagal[it[1].pesertaId] = 1; });
        toast('Skor belum tersimpan', res.message, 'error');
        if (res.data && res.data.code === 'LOCKED') { S.d.terkunci = true; S.pend = {}; }
        if (live && !el.hidden) bkPaint(el);
      }
    });
  });
}
/** Nama singkat untuk tombol peserta: buang gelar sapaan, ambil 2 kata pertama. */
function namaPendek(n) { const w = String(n || '').replace(/^(ibu|bpk\.?|bapak|sdr\.?)\s+/i, '').split(/\s+/).filter(Boolean); const two = w.slice(0, 2).join(' '); return two.length > 16 ? w[0] : two; }
function juriDaftar(el) {
  const S = el._s, d = S.d;
  juriAmbil(el);
  const m = modal({ title: 'Daftar Peserta', sub: esc(d.cabang.NamaCabang),
    body: '<div class="name-list" style="max-height:62vh">' + d.peserta.map((x, i) => { const ok = juriLengkap(S, x.PesertaID), t = juriTotal(S, S.vals[x.PesertaID] || {});
      return '<button type="button" class="name-row' + (i === S.idx ? ' on' : '') + '" data-i="' + i + '"><span class="bk-no' + (ok ? ' ok' : '') + '">' + noUrut(x.NoUrut) + '</span><span class="grow" style="min-width:0"><span style="font-weight:700;display:block" class="ellipsis">' + esc(x.NamaTampil) + '</span><span class="muted small ellipsis" style="display:block">Kelas ' + esc(x.Kelas) + ((x.Anggota || []).length ? ' · ' + esc(x.Anggota.join(', ')) : '') + '</span></span>' +
        (S.gagal[x.PesertaID] ? '<span class="badge badge-red">Gagal simpan</span>' : ok ? '<span class="badge badge-green">' + ic('check', 'ic-sm') + ' ' + (t === null ? '' : fmtNum(t, 1)) + '</span>' : t !== null ? '<span class="badge badge-amber">Sebagian</span>' : '<span class="badge badge-gray">Belum</span>') + '</button>'; }).join('') + '</div>' });
  m.el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; S.idx = +b.dataset.i; m.close(); juriPaint(el); window.scrollTo({ top: 0 }); });
}
function juriVals(S) { const p = S.d.peserta[S.idx]; return S.vals[p.PesertaID] = S.vals[p.PesertaID] || {}; }
function juriTotal(S, v) {
  let t = 0, any = false;
  S.d.kriteria.forEach(k => { const x = v[k.KriteriaID]; if (x === undefined || x === '' || isNaN(Number(x))) return; any = true; t += (Number(x) - k.NilaiMin) / ((k.NilaiMaks - k.NilaiMin) || 1) * 100 * k.Bobot / 100; });
  return any ? Math.round(t * 100) / 100 : null;
}
function juriLengkap(S, pid) { const v = S.vals[pid] || {}; return S.d.kriteria.length > 0 && S.d.kriteria.every(k => v[k.KriteriaID] !== undefined && v[k.KriteriaID] !== ''); }
function juriSet(el, k, val, src) {
  const S = el._s, v = juriVals(S);
  let n = val === '' ? '' : Number(val);
  if (n !== '' && !isNaN(n)) n = Math.max(k.NilaiMin, Math.min(k.NilaiMaks, n));
  v[k.KriteriaID] = n;
  S.dirty[S.d.peserta[S.idx].PesertaID] = 1;
  const card = $('[data-crit="' + k.KriteriaID + '"]', el);
  if (src !== 'val') { const i = card.querySelector('[data-val]'); i.value = n; }
  if (src !== 'rng') { const r = card.querySelector('[data-rng]'); r.value = n === '' ? k.NilaiMin : n; }
  const raw = card.querySelector('[data-val]').value;
  card.querySelector('[data-err]').innerHTML = raw !== '' && (Number(raw) < k.NilaiMin || Number(raw) > k.NilaiMaks) ? '<div class="err-text mt-8">Nilai harus ' + k.NilaiMin + '–' + k.NilaiMaks + '</div>' : '';
  const t = juriTotal(S, v); $('#total', el).textContent = t === null ? '–' : fmtNum(t, 2);
}
function juriAmbil(el) { const c = $('#catatan', el); if (c && el._s) juriVals(el._s)._catatan = c.value; }
function juriPaint(el) {
  const S = el._s, d = S.d;
  if (!d.peserta.length || !d.kriteria.length) {
    el.innerHTML = '<div class="pub"><div class="pub-inner">' + appbar({ title: 'Penilaian Juri', sub: d.cabang.NamaCabang }) + '<div class="card" style="margin:16px"><div class="empty"><div class="empty-art">' + ic('clipboard-list', 'ic-xl') + '</div><div class="empty-title">' + (!d.peserta.length ? 'Belum ada peserta' : 'Kriteria belum diatur') + '</div><div>Hubungi panitia untuk melengkapi data cabang ini.</div></div></div></div></div>';
    return;
  }
  const p = d.peserta[S.idx], v = juriVals(S), lock = d.terkunci;
  const done = d.peserta.filter(x => juriLengkap(S, x.PesertaID)).length;
  const t = juriTotal(S, v);
  el.innerHTML = '<div class="pub"><div class="pub-inner" style="display:flex;flex-direction:column;min-height:calc(100vh - var(--ribbon))">' +
    appbar({ title: 'Penilaian Juri', sub: d.cabang.NamaCabang + ' · ' + d.namaJuri }) +
    '<div style="padding:12px 16px 4px">' + (lock ? '<div class="alert alert-amber small mb-8">' + ic('lock', 'ic-sm') + '<span>Penilaian sudah dikunci panitia. Nilai hanya bisa dilihat.</span></div>' : '<div id="saved-note"></div>') +
    '<div class="row between small"><b>Sudah dinilai ' + done + ' dari ' + d.peserta.length + ' peserta</b><button type="button" class="btn btn-soft btn-sm" data-act="daftar">' + ic('list', 'ic-sm') + ' Daftar Peserta</button></div><div class="prog mt-8"><i style="width:' + pct(done, d.peserta.length) + '%"></i></div></div>' +
    '<div class="pchips">' + d.peserta.map((x, i) => { const ok = juriLengkap(S, x.PesertaID); return '<button class="pchip' + (i === S.idx ? ' on' : ok ? ' done' : '') + (S.gagal[x.PesertaID] ? ' err' : '') + '" data-act="pes" data-i="' + i + '" title="' + esc(x.NamaTampil) + '"><span class="no">' + noUrut(x.NoUrut) + '</span><span class="nm">' + esc(namaPendek(x.NamaTampil)) + '</span>' + (S.gagal[x.PesertaID] ? ic('circle-alert', 'ic-sm') : ok && i !== S.idx ? ic('check', 'ic-sm') : '') + '</button>'; }).join('') + '</div>' +
    '<div class="pub-body grow" style="padding-top:8px"><div class="card card-pad row" style="gap:14px"><span class="photo-thumb" style="width:64px;height:64px;border-radius:14px">' + photoHtml(p.FotoFileId, p.NamaTampil, 200) + '</span><div class="grow"><div class="row"><span class="badge">No. ' + noUrut(p.NoUrut) + '</span><span class="muted small">Kelas ' + esc(p.Kelas) + '</span></div><div style="font-size:19px;font-weight:700;margin-top:4px">' + esc(p.NamaTampil) + '</div>' + ((p.Anggota || []).length ? '<div class="muted small">' + ic('users', 'ic-sm') + ' ' + esc(p.Anggota.join(', ')) + '</div>' : '') + (p.Keterangan ? '<div class="muted small ellipsis">' + ic('book-open', 'ic-sm') + ' ' + esc(p.Keterangan) + '</div>' : '') + '</div></div>' +
    '<div class="row between" style="margin:20px 4px 10px"><div class="row" style="font-weight:700;font-size:16px">' + ic('list-checks') + ' Kriteria Penilaian</div></div>' +
    d.kriteria.map(k => { const val = v[k.KriteriaID]; return '<div class="card crit" data-crit="' + esc(k.KriteriaID) + '"><div class="crit-top"><div><div style="font-weight:700;font-size:16px">' + esc(k.NamaKriteria) + '</div>' + (k.Keterangan ? '<div class="muted small">' + esc(k.Keterangan) + '</div>' : '<div class="muted small">Skala ' + k.NilaiMin + '–' + k.NilaiMaks + '</div>') + '</div><span class="badge">Bobot ' + k.Bobot + '%</span></div>' +
      '<div class="stepper-val"><button class="round-btn" data-act="min" data-k="' + esc(k.KriteriaID) + '" aria-label="Kurangi"' + (lock ? ' disabled' : '') + '>' + ic('minus') + '</button><div class="val-wrap"><input class="val-input" inputmode="numeric" data-val="' + esc(k.KriteriaID) + '" value="' + (val === undefined ? '' : val) + '" placeholder="–"' + (lock ? ' readonly' : '') + ' aria-label="Nilai ' + esc(k.NamaKriteria) + '"><span class="max">/' + k.NilaiMaks + '</span></div><button class="round-btn plus" data-act="plus" data-k="' + esc(k.KriteriaID) + '" aria-label="Tambah"' + (lock ? ' disabled' : '') + '>' + ic('plus') + '</button></div>' +
      '<input type="range" class="rng" min="' + k.NilaiMin + '" max="' + k.NilaiMaks + '" step="1" value="' + (val === undefined || val === '' ? k.NilaiMin : val) + '" data-rng="' + esc(k.KriteriaID) + '"' + (lock ? ' disabled' : '') + '><div class="rng-scale"><span>' + k.NilaiMin + '</span><span>' + Math.round((k.NilaiMin + k.NilaiMaks) / 2) + '</span><span>' + k.NilaiMaks + '</span></div><div data-err></div></div>'; }).join('') +
    '<div class="total-card mt-16"><div class="row between"><div class="row" style="font-weight:700;color:var(--primary-hover)">' + ic('calculator') + ' Nilai Tertimbang</div><span class="badge" style="background:var(--primary);color:#fff">' + ic('refresh-cw', 'ic-sm') + ' Dihitung Otomatis</span></div><div class="small" style="color:var(--primary)">(' + d.kriteria.map(k => k.Bobot + '%').join(' + ') + ')</div>' +
    '<div class="row between mt-8"><span style="color:var(--primary)">Total Akhir</span><span><span class="total-num" id="total">' + (t === null ? '–' : fmtNum(t, 2)) + '</span> <span class="muted">/100</span></span></div></div>' +
    (S.idx < d.peserta.length - 1 ? '<div class="next-hint mt-16">' + ic('arrow-right', 'ic-sm') + '<span>Berikutnya: <b>' + noUrut(d.peserta[S.idx + 1].NoUrut) + ' · ' + esc(d.peserta[S.idx + 1].NamaTampil) + '</b></span></div>' : '') +
    '<div class="field mt-16"><label for="catatan">Catatan (opsional)</label><textarea class="textarea" id="catatan" placeholder="Umpan balik untuk peserta"' + (lock ? ' readonly' : '') + '>' + esc(v._catatan || '') + '</textarea></div>' +
    '<div class="row muted small mt-12">' + ic('lock', 'ic-sm') + '<span>Nilai dapat diubah sampai panitia mengunci penilaian.</span></div></div>' +
    '<div class="bottom-bar"><button class="btn btn-lg btn-soft" data-act="prev"' + (S.idx === 0 ? ' disabled' : '') + '>' + ic('chevron-left') + ' Sebelumnya</button><button class="btn btn-primary btn-lg grow" data-act="next">' + (lock ? 'Berikutnya' : S.idx === d.peserta.length - 1 ? 'Simpan' : 'Simpan & Lanjut') + ' ' + ic('arrow-right') + '</button></div></div></div>';
  juriChipTengah(el);
}
/** Optimistic: pindah ke peserta berikutnya seketika, simpan di latar (reqId → aman diulang). */
function juriChipTengah(el) { const c = $('.pchips .pchip.on', el), w = $('.pchips', el); if (c && w) w.scrollLeft = c.offsetLeft - (w.clientWidth - c.offsetWidth) / 2; }
function juriSimpan(el) {
  const S = el._s, d = S.d, p = d.peserta[S.idx];
  juriAmbil(el);
  if (d.terkunci) { if (S.idx < d.peserta.length - 1) { S.idx++; juriPaint(el); } return; }
  const v = S.vals[p.PesertaID] || {};
  const bad = d.kriteria.find(k => v[k.KriteriaID] !== undefined && v[k.KriteriaID] !== '' && (Number(v[k.KriteriaID]) < k.NilaiMin || Number(v[k.KriteriaID]) > k.NilaiMaks));
  if (bad) return toast('Nilai tidak valid', '"' + bad.NamaKriteria + '" harus ' + bad.NilaiMin + '–' + bad.NilaiMaks + '.', 'error');
  const kosong = d.kriteria.filter(k => v[k.KriteriaID] === undefined || v[k.KriteriaID] === '');
  if (kosong.length === d.kriteria.length && !v._catatan) { if (S.idx < d.peserta.length - 1) { S.idx++; juriPaint(el); } return; }
  const nilai = {}; d.kriteria.forEach(k => { if (v[k.KriteriaID] !== undefined && v[k.KriteriaID] !== '') nilai[k.KriteriaID] = Number(v[k.KriteriaID]); });
  const pid = p.PesertaID, reqId = (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random());
  delete S.gagal[pid];
  d.nilai[pid] = { nilai, catatan: v._catatan || '' };
  swrPut('juri:' + S.cabangId, d);
  if (S.idx < d.peserta.length - 1) S.idx++;
  juriPaint(el);
  api('simpanNilai', { cabangId: S.cabangId, pesertaId: pid, nilai, catatan: v._catatan || '' }, { reqId }).then(res => {
    if (res.success) {
      delete S.dirty[pid];
      const n = $('#saved-note', el); if (n) n.innerHTML = '<div class="alert alert-green small mb-8" style="padding:10px 14px">' + ic('circle-check', 'ic-sm') + '<span>Nilai ' + esc(p.NamaTampil) + ' tersimpan</span></div>';
      AppState.ptk = null; swrDrop('ptk');
    } else {
      S.gagal[pid] = 1;
      toast('Nilai ' + p.NamaTampil + ' belum tersimpan', res.message, 'error');
      if (res.data && res.data.code === 'LOCKED') { d.terkunci = true; }
      if (!el.hidden && el._s === S) juriPaint(el);
    }
  });
}
