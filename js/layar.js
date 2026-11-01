/* ============================================================
   MEvent — layar.js  (dimuat saat membuka Layar Hasil)
   • #/tayang/{EventID}/{CabangID?}      → admin/panitia (login)
   • #/layar-tv/{EventID}/{token}        → link layar untuk IFP/proyektor (tanpa login)
   Alur tayang: tampil "Suara Masuk" dulu → klik "Tampilkan Hasil"
   → hitung mundur + drumroll → grafik tumbuh + fanfare, tepuk tangan, konfeti.
   Semua cabang lomba dimuat sekali → pindah cabang instan.
   ============================================================ */
'use strict';

/* ---------------- Efek suara (Web Audio, tanpa berkas) ---------------- */
const Sfx = {
  on: Store.get('sfx:on', true) !== false,
  ctx: null, out: null, _noise: null,
  ensure() {
    if (!this.on) return null;
    try {
      if (!this.ctx) {
        const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
        this.ctx = new C();
        const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
        this.out = this.ctx.createGain(); this.out.gain.value = .85;
        this.out.connect(comp); comp.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  toggle() { this.on = !this.on; Store.set('sfx:on', this.on); if (this.on) { this.ensure(); this.ding(); } return this.on; },
  noise() {
    if (this._noise) return this._noise;
    const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return (this._noise = b);
  },
  burst(t, o) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise(); f.type = o.type || 'bandpass'; f.frequency.value = o.freq || 1800; f.Q.value = o.q || 1;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || .4, t + (o.atk || .004)); g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || .08));
    src.connect(f); f.connect(g); g.connect(this.out);
    src.start(t, Math.random() * .5); src.stop(t + (o.dur || .08) + .05);
  },
  tone(t, freq, dur, o) {
    o = o || {};
    const c = this.ctx, g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(o.cut0 || 600, t); f.frequency.exponentialRampToValueAtTime(o.cut1 || 3200, t + Math.min(.25, dur)); f.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.gain || .12, t + (o.atk || .025));
    g.gain.setValueAtTime(o.gain || .12, t + Math.max(.03, dur - (o.rel || .12))); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (o.rel || .12));
    (o.detunes || [-7, 7]).forEach(dt => {
      const osc = c.createOscillator(); osc.type = o.type || 'sawtooth'; osc.frequency.value = freq; osc.detune.value = dt;
      if (o.vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = 5.5; lg.gain.value = 6; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + dur + .3); }
      osc.connect(f); osc.start(t); osc.stop(t + dur + (o.rel || .12) + .05);
    });
    f.connect(g); g.connect(this.out);
  },
  timpani(t, freq, gain) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.6, t); o.frequency.exponentialRampToValueAtTime(freq, t + .08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain || .6, t + .01); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 1.2);
  },
  crash(t) { this.burst(t, { type: 'highpass', freq: 5200, q: .3, gain: .32, dur: 2.2, atk: .002 }); this.burst(t, { type: 'bandpass', freq: 9000, q: .5, gain: .18, dur: 1.4 }); },
  tick() { const c = this.ensure(); if (!c) return; const t = c.currentTime; this.tone(t, 1320, .05, { type: 'square', gain: .05, detunes: [0], cut0: 4000, cut1: 4000, rel: .04 }); },
  ding() { const c = this.ensure(); if (!c) return; const t = c.currentTime; [[1046.5, .1], [1568, .06]].forEach(x => this.tone(t, x[0], .5, { type: 'sine', gain: x[1], detunes: [0], cut0: 6000, cut1: 6000, rel: .5 })); },
  /** Drumroll menegangkan: pukulan snare makin rapat & keras. */
  drumroll(sec) {
    const c = this.ensure(); if (!c) return;
    let t = c.currentTime + .02; const end = t + sec;
    while (t < end) {
      const p = 1 - (end - t) / sec;
      this.burst(t, { freq: 2300 + Math.random() * 400, q: .8, gain: .12 + p * .4, dur: .07 });
      this.burst(t, { type: 'lowpass', freq: 260, q: .6, gain: .05 + p * .2, dur: .09 });
      t += .085 - p * .055 + Math.random() * .01;
    }
  },
  /** Fanfare kemenangan: tiga nada cepat → nada tinggi → akor mayor panjang + timpani & simbal. */
  fanfare() {
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime + .03, n = (m) => 440 * Math.pow(2, (m - 69) / 12);
    this.crash(t); this.timpani(t, 65, .7);
    [72, 72, 72].forEach((m, i) => this.tone(t + i * .13, n(m), .1, { gain: .1 }));
    this.tone(t + .39, n(79), .3, { gain: .12 });
    this.tone(t + .72, n(76), .14, { gain: .1 });
    this.tone(t + .88, n(79), .14, { gain: .1 });
    const ch = t + 1.05;
    [60, 64, 67, 72, 76].forEach(m => this.tone(ch, n(m), 1.9, { gain: .075, vib: true, rel: .7 }));
    this.tone(ch, n(84), 1.9, { gain: .06, vib: true, rel: .7, type: 'square' });
    this.timpani(ch, 65, .8); this.timpani(ch + .25, 98, .5); this.crash(ch);
  },
  /** Tepuk tangan & sorakan meriah. */
  cheer(sec) {
    const c = this.ensure(); if (!c) return;
    const t0 = c.currentTime + .05;
    const claps = Math.floor(sec * 55);
    for (let i = 0; i < claps; i++) {
      const tt = t0 + Math.random() * sec, p = (tt - t0) / sec, env = p < .2 ? p / .2 : 1 - (p - .2) * .9;
      this.burst(tt, { freq: 1100 + Math.random() * 1600, q: 1.2, gain: (.05 + Math.random() * .12) * Math.max(.15, env), dur: .03 + Math.random() * .03, atk: .002 });
    }
    // gemuruh sorakan (noise vokal)
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noise(); src.loop = true; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(650, t0); f.frequency.linearRampToValueAtTime(1050, t0 + sec * .5); f.frequency.linearRampToValueAtTime(800, t0 + sec);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(.09, t0 + .5); g.gain.setValueAtTime(.09, t0 + sec * .6); g.gain.exponentialRampToValueAtTime(0.0001, t0 + sec);
    src.connect(f); f.connect(g); g.connect(this.out); src.start(t0); src.stop(t0 + sec + .1);
  }
};

/* ---------------- Konfeti kanvas ---------------- */
const Confetti = {
  burst(host, ms) {
    if (!host) return;
    const cv = document.createElement('canvas'); cv.className = 'scr-confetti'; host.appendChild(cv);
    const W = cv.width = host.clientWidth, H = cv.height = host.clientHeight, g = cv.getContext('2d');
    const few = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const col = ['#FBBF24', '#F59E0B', '#60A5FA', '#34D399', '#F472B6', '#A78BFA', '#ffffff', '#F87171'];
    const P = [];
    const spawn = (x, y, n, spread) => { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * spread, v = 9 + Math.random() * 13; P.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, w: 7 + Math.random() * 8, h: 10 + Math.random() * 10, r: Math.random() * 6, vr: (Math.random() - .5) * .35, c: col[i % col.length], o: 1 }); } };
    const n = few ? 40 : 140;
    spawn(W * .12, H, n, 1.1); spawn(W * .88, H, n, 1.1); spawn(W * .5, H * .95, few ? 20 : 80, 1.6);
    const t0 = performance.now(), dur = ms || 4800;
    const step = (now) => {
      const el = now - t0; g.clearRect(0, 0, W, H);
      P.forEach(p => { p.vy += .32; p.vx *= .992; p.vy *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (el > dur - 1200) p.o = Math.max(0, p.o - .02);
        g.save(); g.globalAlpha = p.o; g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2))); g.restore(); });
      if (el < dur) requestAnimationFrame(step); else cv.remove();
    };
    requestAnimationFrame(step);
  }
};

/* ---------------- Halaman ---------------- */
const layarDef = (mode) => ({
  layout: 'full', auth: mode === 'tv' ? 'none' : 'staff', title: 'Layar Hasil',
  init(el) {
    el._mode = mode; el._reveal = {}; el._shown = {};
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b && TY[b.dataset.act]) TY[b.dataset.act](el, b); });
    document.addEventListener('keydown', (e) => {
      if (el.hidden || e.target.closest('input,textarea,select') || document.querySelector('.announce')) return;
      const k = e.key;
      if (k === 'f' || k === 'F') TY.fs(el);
      else if (k === ' ' || k === 'Enter') { e.preventDefault(); TY[revealed(el) ? 'tutup' : 'ungkap'](el); }
      else if (k === 'p' || k === 'P') TY.jeda(el);
      else if (k === 'ArrowRight' || k === 'ArrowLeft') TY.geser(el, k === 'ArrowRight' ? 1 : -1);
      else if (k === 'Escape' && !document.fullscreenElement && el._mode !== 'tv') TY.keluar(el);
    });
    document.addEventListener('visibilitychange', () => { if (!el.hidden && document.visibilityState === 'visible') { wakeLock(); tyFetch(el); } });
  },
  async show(el, eventId, p2) {
    const sameEv = el._ev === eventId;
    el._ev = eventId; el._paused = false; el._busy = false;
    if (mode === 'tv') { el._token = p2 || ''; el._cab = el._cab && sameEv ? el._cab : ''; }
    else el._cab = p2 || (sameEv ? el._cab : '');
    if (!sameEv) { el._d = null; el._h = ''; el._reveal = {}; el._shown = {}; }
    const cached = Store.get(cacheKey(el), null);
    if (cached && !el._d) el._d = cached.data;
    if (el._d) tyPaint(el);
    else el.innerHTML = '<div class="screen"><div class="scr-title" style="margin:auto"><div class="live-pill"><i></i>MEMUAT…</div><h1>Layar Hasil</h1></div></div>';
    wakeLock();
    await tyFetch(el);
    clearInterval(el._t);
    el._t = setInterval(() => { if (!el.hidden && !el._paused && document.visibilityState === 'visible') tyFetch(el); }, 5000);
  },
  leave() {
    const el = $('.page[data-page="' + (mode === 'tv' ? 'layar-tv' : 'tayang') + '"]');
    if (el) clearInterval(el._t);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    if (window._wl) { window._wl.release().catch(() => {}); window._wl = null; }
  }
});
registerPage('tayang', layarDef('staff'));
registerPage('layar-tv', layarDef('tv'));

function cacheKey(el) { return 'c:' + AppState.mode + ':' + (el._mode === 'tv' ? 'tv' : (AppState.user ? AppState.user.id : 'anon')) + ':live2:' + el._ev; }
async function wakeLock() { try { if (navigator.wakeLock && !window._wl && document.visibilityState === 'visible') { window._wl = await navigator.wakeLock.request('screen'); window._wl.addEventListener('release', () => { window._wl = null; }); } } catch (e) {} }

async function tyFetch(el) {
  if (el._fetching) return; el._fetching = true;
  let res;
  try { res = el._mode === 'tv' ? await api('hasilLayar', { eventId: el._ev }, { token: el._token }) : await api('hasilLive', { eventId: el._ev }); }
  finally { el._fetching = false; }
  if (el.hidden) return;
  if (!res.success) {
    if (res.data && (res.data.code === 'LAYAR' || res.data.code === 'AUTH')) { el.innerHTML = '<div class="screen"><div class="scr-title" style="margin:auto;max-width:720px"><div class="scr-face" style="margin:0 auto 18px">' + ic('lock', 'ic-xl') + '</div><h1 style="font-size:40px">Link layar tidak berlaku</h1><div class="sub">' + esc(res.message) + '</div></div></div>'; el._d = null; return; }
    el._offline = true;
    if (!el._d) el.innerHTML = '<div class="screen">' + errorBox(res.message) + '</div>';
    else { const p = $('.live-pill', el); if (p) { p.classList.add('paused'); p.lastChild.textContent = 'MENYAMBUNG ULANG…'; } }
    return;
  }
  const h = hashStr(JSON.stringify(res.data));
  const wasOffline = el._offline; el._offline = false;
  if (h === el._h && !wasOffline) return;
  const prev = el._d;
  el._h = h; el._d = res.data;
  Store.set(cacheKey(el), { t: Date.now(), data: res.data });
  if (el._busy) { el._dirty = true; return; }
  // suara baru masuk saat mode "suara masuk" → bunyi lembut
  if (prev && !revealed(el) && totalOf(el, prev) < totalOf(el, res.data) && Sfx.ctx) Sfx.ding();
  tyPaint(el);
}

/* ---------------- Data bantu ---------------- */
function isOsis(d) { return d && d.event && d.event.JenisEvent === 'OSIS'; }
function curCab(el) {
  const d = el._d; if (!d || isOsis(d)) return null;
  const list = d.cabangList || [];
  if (!list.some(c => c.CabangID === el._cab)) el._cab = list.length ? list[0].CabangID : '';
  return el._cab;
}
function hasilNow(el, d) { d = d || el._d; if (!d) return null; if (isOsis(d)) return d.hasil; const c = d === el._d ? curCab(el) : el._cab; return (d.hasilSemua || {})[c] || null; }
function rkey(el) { return isOsis(el._d) ? 'osis' : (curCab(el) || '-'); }
function revealed(el) { return !!el._reveal[rkey(el)]; }
function totalOf(el, d) {
  const h = hasilNow(el, d); if (!h) return 0;
  if (isOsis(d) || h.ModePenilaian !== 'Juri') return h.totalSuara;
  return (h.juriProgress || []).reduce((s, j) => s + j.dinilai, 0);
}

function tyItems(d, h) {
  if (!h) return [];
  if (isOsis(d)) {
    const tunggal = h.sistem === 'Tunggal';
    return h.kandidat.slice(0, tunggal ? 6 : 5).map(k => ({ id: k.KandidatID, rank: k.peringkat, no: k.NoUrut, badge: (k.Tipe === 'Pasangan' ? 'PASLON ' : 'CALON ') + noUrut(k.NoUrut),
      faces: [[k.FotoFileId, k.Nama1]].concat(k.Tipe === 'Pasangan' ? [[k.FotoFileId2, k.Nama2]] : []),
      nama: k.Nama1.split(' ').slice(0, k.Nama2 ? 1 : 2).join(' ') + (k.Nama2 ? ' & ' + k.Nama2.split(' ')[0] : ''), sub: [k.Kelas1, k.Kelas2].filter(Boolean).length ? 'Kelas ' + [k.Kelas1, k.Kelas2].filter(Boolean).join(' & ') : '',
      val: k.suara, dec: 0, valLbl: 'suara', pc: fmtNum(k.persen, 1) + '%', jab: tunggal ? k.jabatan : '', seri: k.seri, namaFull: k.Nama1 + (k.Nama2 ? ' & ' + k.Nama2 : '') }));
  }
  const vote = h.ModePenilaian === 'Voting';
  return h.peserta.slice(0, 6).map(p => ({ id: p.PesertaID, rank: p.peringkat, no: p.NoUrut, juara: p.juara, badge: 'NO. ' + noUrut(p.NoUrut), faces: [[p.FotoFileId, p.NamaTampil]], nama: p.NamaTampil, sub: 'Kelas ' + p.Kelas,
    val: vote ? p.suara : p.skorAkhir, dec: vote ? 0 : 2, valLbl: vote ? 'suara' : 'poin', pc: vote ? fmtNum(p.persenSuara, 1) + '%' : (h.ModePenilaian === 'Gabungan' ? p.suara + ' suara' : ''), seri: p.seri, jab: p.juara ? 'JUARA ' + p.juara : '', namaFull: p.NamaTampil }));
}
function lineup(d, h) {
  if (!h) return [];
  if (isOsis(d)) return h.kandidat.slice().sort((a, b) => a.NoUrut - b.NoUrut).map(k => ({ badge: (k.Tipe === 'Pasangan' ? 'PASLON ' : 'CALON ') + noUrut(k.NoUrut), faces: [[k.FotoFileId, k.Nama1]].concat(k.Tipe === 'Pasangan' ? [[k.FotoFileId2, k.Nama2]] : []), nama: k.Nama1.split(' ').slice(0, 2).join(' ') + (k.Nama2 ? ' & ' + k.Nama2.split(' ')[0] : '') }));
  return h.peserta.slice().sort((a, b) => a.NoUrut - b.NoUrut).map(p => ({ badge: 'NO. ' + noUrut(p.NoUrut), faces: [[p.FotoFileId, p.NamaTampil]], nama: p.NamaTampil }));
}
function centerOut(arr) { const out = []; arr.forEach((x, i) => { if (i % 2 === 0) out.push(x); else out.unshift(x); }); return arr.length % 2 === 0 ? out.reverse() : out; }
function faceHtml(f) { return '<span class="scr-face">' + (f[0] ? '<img alt="" src="' + imgUrl(f[0], 300) + '">' : esc(initials(f[1]))) + '</span>'; }

/* ---------------- Gambar layar ---------------- */
function tyPaint(el, o) {
  o = o || {};
  const d = el._d; if (!d) return;
  const s = d.sekolah || {}, ev = d.event, osis = isOsis(d), h = hasilNow(el), key = rkey(el), open = !!el._reveal[key];
  const judul = ev.Judul.replace(/^DEMO — /, '');
  const conf = Array.from({ length: 12 }, (_, i) => '<i class="confetti" style="left:' + (i * 8.3 % 100) + '%;background:' + ['#FBBF24', '#60A5FA', '#34D399', '#F472B6'][i % 4] + ';animation-duration:' + (10 + i % 5) + 's;animation-delay:' + (-i * 1.4) + 's"></i>').join('');
  const tabs = !osis && (d.cabangList || []).length > 1 ? '<div class="scr-tabs">' + d.cabangList.map(c => '<button data-act="cab" data-id="' + esc(c.CabangID) + '" class="' + (c.CabangID === el._cab ? 'on' : '') + '">' + esc(c.NamaCabang) + (el._reveal[c.CabangID] ? ' ✓' : '') + '</button>').join('') + '</div>' : '';
  const pill = '<div class="live-pill' + (el._paused || el._offline ? ' paused' : '') + '"><i></i>' + (el._offline ? 'MENYAMBUNG ULANG…' : el._paused ? 'DIJEDA' : open ? 'HASIL DITAMPILKAN · LIVE' : 'LIVE · SUARA MASUK') + '</div>';
  const head = '<div class="scr-head"><div class="scr-logo"><span class="lg">' + (logoHtml(s.LogoInstansiUrl) || ic('shield', 'ic-xl')) + '</span><div><small>' + esc(s.NamaYayasan ? 'Yayasan / Dinas' : '') + '</small><b>' + esc(s.NamaYayasan || '') + '</b></div></div>' +
    '<div class="scr-title">' + pill + '<h1>' + esc((osis && !/^hasil/i.test(judul) ? 'HASIL ' : '') + judul.toUpperCase()) + '</h1><div class="sub">' + esc(s.NamaSekolah || '') + (osis ? (h && h.sistem === 'Tunggal' ? ' · Ketua = suara terbanyak · Wakil = terbanyak ke-2' : ' · Suara Real-Time') : h ? ' · ' + esc(h.NamaCabang) : '') + '</div>' + tabs + '</div>' +
    '<div class="scr-logo r"><div><small>Portal Resmi MEvent</small><b>' + esc(s.NamaSekolah || '') + '</b></div><span class="lg">' + (logoHtml(s.LogoUrl) || ic('graduation-cap', 'ic-xl')) + '</span></div></div>';
  const main = !h ? '<div class="scr-bars" style="align-items:center"><div class="center" style="opacity:.8"><div class="scr-face" style="margin:0 auto 16px">' + ic('vote', 'ic-xl') + '</div><b style="font-size:26px">Belum ada data</b></div></div>'
    : open ? barsHtml(d, h, o.anim) : teaserHtml(el, d, h);
  const foot = footHtml(d, h);
  const ctrl = '<div class="scr-ctrl">' +
    (el._mode !== 'tv' ? '<button class="btn btn-icon" data-act="keluar" title="Keluar (Esc)">' + ic('x', 'ic-sm') + '</button><button class="btn btn-icon" data-act="link" title="Link layar untuk perangkat lain">' + ic('share-2', 'ic-sm') + '</button>' : '') +
    '<button class="btn btn-icon" data-act="suara" title="Efek suara ' + (Sfx.on ? 'aktif' : 'mati') + '">' + ic(Sfx.on ? 'volume-2' : 'volume-x', 'ic-sm') + '</button>' +
    '<button class="btn btn-icon" data-act="fs" title="Layar penuh (F)">' + ic('maximize', 'ic-sm') + '</button>' +
    '<button class="btn btn-icon" data-act="jeda" title="' + (el._paused ? 'Lanjutkan pembaruan' : 'Jeda pembaruan') + ' (P)">' + ic(el._paused ? 'play' : 'pause', 'ic-sm') + '</button>' +
    (h ? (open ? '<button class="btn" data-act="tutup">' + ic('eye-off', 'ic-sm') + ' Sembunyikan</button><button class="btn btn-amber" data-act="umumkan">' + ic('trophy', 'ic-sm') + ' Umumkan ' + (osis ? 'Pemenang' : 'Juara') + '</button>'
      : '<button class="btn btn-amber" data-act="ungkap">' + ic('sparkles', 'ic-sm') + ' Tampilkan Hasil</button>') : '') + '</div>';
  el.innerHTML = '<div class="screen' + (open ? ' is-open' : ' is-teaser') + '">' + conf + (AppState.mode === 'demo' ? '<span class="scr-demo">DEMO</span>' : '') + head + main + '<div class="scr-foot">' + foot + ctrl + '</div></div>';
  el._lastKey = key;
  if (!open && h) animateTeaser(el, key, totalOf(el));
  if (open && o.anim) animateBars(el);
  else if (open) el._shown[key] = totalOf(el);
}

function teaserHtml(el, d, h) {
  const osis = isOsis(d), juri = !osis && h.ModePenilaian === 'Juri';
  const total = totalOf(el);
  let sub;
  if (osis) { const tot = h.totalSiswa + h.totalPtk, pem = h.pemilihSiswa + h.pemilihPtk; sub = 'dari <em>' + fmtNum(tot) + '</em> pemilih terdaftar · partisipasi <em>' + fmtNum(pct(pem, tot), 1) + '%</em>'; }
  else if (juri) { const all = (h.juriProgress || []).reduce((s, j) => s + j.total, 0); sub = 'dari <em>' + all + '</em> penilaian (' + (h.juriProgress || []).length + ' juri × ' + h.peserta.length + ' peserta)'; }
  else sub = h.NamaCabang + (h.ModePenilaian === 'Gabungan' ? ' · skor akhir = juri ' + h.BobotJuri + '% + voting ' + h.BobotVoting + '%' : ' · voting siswa');
  const L = lineup(d, h), many = L.length > 8;
  return '<div class="scr-teaser"><div class="tz-label">' + (juri ? 'PENILAIAN JURI MASUK' : 'SUARA MASUK') + '</div>' +
    '<div class="tz-num" data-to="' + total + '">' + fmtNum(el._shown[rkey(el)] != null ? el._shown[rkey(el)] : total) + '</div><div class="tz-sub">' + sub + '</div>' +
    '<div class="tz-lineup' + (many ? ' many' : '') + (el._lastKey !== rkey(el) ? ' anim' : '') + '">' + L.slice(0, many ? 10 : 8).map(x => '<div class="tz-cand"><div class="scr-faces">' + x.faces.map(faceHtml).join('') + '</div><span class="nobadge">' + esc(x.badge) + '</span><b>' + esc(x.nama) + '</b></div>').join('') + (L.length > 10 ? '<div class="tz-cand more"><b>+' + (L.length - 10) + ' lainnya</b></div>' : '') + '</div>' +
    '<button class="tz-btn" data-act="ungkap">' + ic('sparkles') + ' Tampilkan Hasil</button><div class="tz-hint">Tekan tombol atau <b>Spasi</b> untuk menampilkan perolehan</div></div>';
}

function barsHtml(d, h, anim) {
  const items = tyItems(d, h), osis = isOsis(d), tunggal = osis && h.sistem === 'Tunggal';
  if (!items.length) return '<div class="scr-bars" style="align-items:center"><b style="font-size:26px;opacity:.8">Belum ada peserta</b></div>';
  const maxV = Math.max(1, ...items.map(x => x.val));
  const lead = items[0].val > 0 && !items[0].seri ? items[0].id : '';
  const ordered = items.length <= 3 ? centerOut(items) : items;
  return '<div class="scr-bars' + (anim ? ' scr-anim' : '') + '">' + ordered.map(x => {
    const isLead = x.id === lead;
    const crown = isLead ? '<span class="badge scr-crown">' + ic('crown', 'ic-sm') + ' ' + (tunggal ? 'KETUA TERPILIH' : osis ? 'PEROLEHAN TERTINGGI' : 'JUARA 1') + '</span>'
      : x.seri ? '<span class="badge scr-seri">SERI</span>'
      : x.jab ? '<span class="badge scr-jab">' + esc(x.jab.toUpperCase()) + '</span>' : '<span class="scr-crown-gap"></span>';
    const hgt = Math.max(3, x.val / maxV * 100);
    return '<div class="scr-col' + (isLead ? ' lead' : '') + '">' + crown +
      '<span class="nobadge">' + esc(x.badge) + '</span><div class="scr-faces">' + x.faces.map(faceHtml).join('') + '</div>' +
      '<div class="who"><b>' + esc(x.nama) + (isLead ? ' 🏆' : '') + '</b><span>' + esc(x.sub) + '</span></div>' +
      '<div class="scr-num"><b data-to="' + x.val + '" data-dec="' + x.dec + '">' + fmtNum(anim ? 0 : x.val, x.dec) + '</b><small>' + x.valLbl + '</small>' + (x.pc ? '<span class="pc">' + esc(x.pc) + '</span>' : '') + '</div>' +
      '<div class="scr-track"><div class="scr-fill" data-h="' + hgt + '" style="height:' + (anim ? 0 : hgt) + '%"><span data-to="' + x.val + '" data-dec="' + (x.dec ? 1 : 0) + '">' + fmtNum(anim ? 0 : x.val, x.dec ? 1 : 0) + '</span></div></div></div>';
  }).join('') + '</div>';
}

function footHtml(d, h) {
  if (!h) return '<div class="grow"></div>';
  if (isOsis(d)) {
    const tot = h.totalSiswa + h.totalPtk, pem = h.pemilihSiswa + h.pemilihPtk;
    return '<div class="grow" style="min-width:280px"><div class="small" style="opacity:.7;letter-spacing:.1em;font-weight:700">TOTAL PARTISIPASI PEMILIHAN</div><div class="big">Suara masuk: <em>' + h.totalSuara + '</em> dari ' + tot + ' pemilih <em>(' + fmtNum(pct(pem, tot), 1) + '%)</em></div>' +
      '<div class="row mt-8" style="gap:12px;flex-wrap:wrap"><span class="badge scr-chip">' + ic('users', 'ic-sm') + ' Siswa ' + h.pemilihSiswa + '/' + h.totalSiswa + '</span><span class="badge scr-chip">' + ic('graduation-cap', 'ic-sm') + ' PTK ' + h.pemilihPtk + '/' + h.totalPtk + '</span></div><div class="prog"><i style="width:' + pct(pem, tot) + '%"></i></div></div>';
  }
  return '<div class="grow"><div class="small" style="opacity:.7;letter-spacing:.1em;font-weight:700">' + esc(h.NamaCabang.toUpperCase()) + ' · ' + esc(h.ModePenilaian === 'Gabungan' ? 'JURI ' + h.BobotJuri + '% + VOTING ' + h.BobotVoting + '%' : h.ModePenilaian === 'Juri' ? 'PENILAIAN JURI' : 'VOTING SISWA') + '</div><div class="big">' + (h.ModePenilaian !== 'Juri' ? 'Suara masuk: <em>' + h.totalSuara + '</em>' : '<em>' + h.peserta.length + '</em> peserta dinilai') + '</div></div>';
}

/* ---------------- Animasi ---------------- */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function countUp(nodes, ms) {
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms), e = easeOut(p);
    nodes.forEach(n => { const to = Number(n.dataset.to), from = Number(n.dataset.from || 0), dec = +n.dataset.dec || 0; n.textContent = fmtNum(from + (to - from) * e, dec); });
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function animateTeaser(el, key, total) {
  const n = $('.tz-num', el); if (!n) return;
  const from = el._shown[key];
  el._shown[key] = total;
  if (from == null || from === total) { n.textContent = fmtNum(total); return; }
  n.dataset.from = from; countUp([n], 900);
  n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');
}
function animateBars(el) {
  const fills = $$('.scr-fill', el), nums = $$('[data-to]', el).filter(n => !n.classList.contains('tz-num'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fills.forEach(f => { f.style.height = f.dataset.h + '%'; });
    countUp(nums, 1900);
  }));
  setTimeout(() => {
    const lead = $('.scr-col.lead', el); if (lead) lead.classList.add('win');
    Sfx.fanfare(); setTimeout(() => Sfx.cheer(3.6), 900);
    Confetti.burst($('.screen', el), 5200);
  }, 1750);
  setTimeout(() => { el._busy = false; el._shown[rkey(el)] = totalOf(el); if (el._dirty) { el._dirty = false; tyPaint(el); } }, 3400);
}

/* ---------------- Aksi ---------------- */
const TY = {
  keluar: () => { history.length > 1 ? history.back() : go('layar'); },
  fs: () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else document.documentElement.requestFullscreen().catch(() => toast('Layar penuh tidak didukung', '', 'warning')); },
  jeda: (el) => { el._paused = !el._paused; if (el._d) tyPaint(el); if (!el._paused) tyFetch(el); },
  suara: (el) => { const on = Sfx.toggle(); toast(on ? 'Efek suara aktif' : 'Efek suara dimatikan', '', 'info'); tyPaint(el); },
  link: (el) => { if (window.bukaBagikan) window.bukaBagikan(el._ev, 'layar'); },
  cab: (el, b) => { pilihCab(el, b.dataset.id); },
  geser: (el, dir) => { const l = (el._d && el._d.cabangList) || []; if (l.length < 2) return; const i = l.findIndex(c => c.CabangID === el._cab); pilihCab(el, l[(i + dir + l.length) % l.length].CabangID); },
  ungkap: (el) => {
    if (el._busy || !hasilNow(el) || revealed(el)) return;
    el._busy = true;
    Sfx.ensure();
    const scr = $('.screen', el), cd = document.createElement('div');
    cd.className = 'reveal-cd'; scr.appendChild(cd);
    Sfx.drumroll(2.5);
    let n = 3;
    const show = () => {
      if (n === 0) { cd.remove(); el._reveal[rkey(el)] = true; tyPaint(el, { anim: true }); return; }
      cd.innerHTML = '<span class="n">' + n + '</span><small>Bersiap…</small>'; Sfx.tick(); n--; setTimeout(show, 830);
    };
    show();
  },
  tutup: (el) => { if (el._busy) return; delete el._reveal[rkey(el)]; el._shown[rkey(el)] = totalOf(el); tyPaint(el); },
  umumkan: (el) => {
    const d = el._d, h = hasilNow(el); if (!d || !h) return;
    const osis = isOsis(d);
    let list;
    if (osis) {
      const k = h.kandidat;
      if (h.sistem === 'Tunggal') list = k.filter(x => x.jabatan).map(x => ({ rk: x.jabatan.toUpperCase(), nm: x.Nama1, sc: 'Calon ' + noUrut(x.NoUrut) + ' · ' + x.suara + ' suara · ' + fmtNum(x.persen, 1) + '%' })).reverse();
      else list = h.seri ? [] : k.slice(0, 1).filter(x => x.suara > 0).map(x => ({ rk: 'PASANGAN TERPILIH', nm: x.Nama1 + (x.Nama2 ? ' & ' + x.Nama2 : ''), sc: (x.Tipe === 'Pasangan' ? 'Paslon ' : 'Calon ') + noUrut(x.NoUrut) + ' · ' + x.suara + ' suara · ' + fmtNum(x.persen, 1) + '%' }));
    } else list = h.peserta.filter(p => p.juara).map(p => ({ rk: 'JUARA ' + p.juara, nm: p.NamaTampil, sc: 'Kelas ' + p.Kelas + ' · ' + fmtNum(p.skorAkhir, 2) + ' poin' })).reverse();
    if (!list.length) return toast(h.seri ? 'Hasil masih seri' : 'Belum ada pemenang', h.seri ? 'Tetapkan pemenang di menu Hasil terlebih dahulu.' : '', 'warning');
    Sfx.ensure();
    const ov = document.createElement('div'); ov.className = 'announce';
    document.body.appendChild(ov);
    let i = 0, timer;
    const step = () => {
      if (!ov.isConnected) return;
      if (i >= list.length) { timer = setTimeout(() => ov.remove(), 4000); return; }
      const x = list[i++], last = i === list.length;
      ov.innerHTML = '<div class="trophy">' + ic('trophy', 'ic-xl') + '</div><div class="rk">' + esc(x.rk) + '</div><div class="nm">' + esc(x.nm) + '</div><div class="sc">' + esc(x.sc) + '</div><div class="small" style="opacity:.6;margin-top:20px">Ketuk untuk menutup</div>';
      Sfx.fanfare(); if (last) setTimeout(() => Sfx.cheer(3.5), 900);
      Confetti.burst(ov, last ? 5200 : 3200);
      timer = setTimeout(step, last ? 4200 : 3600);
    };
    ov.onclick = () => { clearTimeout(timer); ov.remove(); };
    step();
  }
};
function pilihCab(el, id) {
  if (el._busy || id === el._cab) return;
  el._cab = id;
  if (el._mode !== 'tv') history.replaceState(null, '', '#/tayang/' + el._ev + '/' + id);
  tyPaint(el);   // data semua cabang sudah ada → instan, tanpa menunggu server
}
