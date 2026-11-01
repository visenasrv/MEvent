/* ============================================================
   MEvent — core.js
   Penyimpanan lokal, api() tahan jaringan, SWR, router SPA,
   dan komponen UI bersama (toast, modal, ikon, format).
   ============================================================ */
'use strict';

const APP_VER = '1.3.0';
const LS_PREFIX = 'mevent:v1:';

/* ---------------- Penyimpanan perangkat ---------------- */
const Store = {
  get(k, d) { try { const v = localStorage.getItem(LS_PREFIX + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) {
    const s = JSON.stringify(v);
    try { localStorage.setItem(LS_PREFIX + k, s); }
    catch (e) {
      try { Object.keys(localStorage).filter(x => x.indexOf(LS_PREFIX + 'c:') === 0).forEach(x => localStorage.removeItem(x)); localStorage.setItem(LS_PREFIX + k, s); } catch (e2) { /* tanpa cache */ }
    }
  },
  del(k) { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) {} },
  delPrefix(p) { try { Object.keys(localStorage).filter(x => x.indexOf(LS_PREFIX + p) === 0).forEach(x => localStorage.removeItem(x)); } catch (e) {} }
};

/* ---------------- State aplikasi ---------------- */
const AppState = {
  mode: Store.get('mode', 'live') === 'demo' ? 'demo' : 'live',
  token: '', role: '', user: null,
  pub: null,          // publicBoot
  boot: null,         // staffBoot (admin/panitia)
  ptk: null,          // ptkBoot (PTK/juri)
  vote: null,         // sesi pemilih (memori saja)
  kiosk: null,        // link voting yang sedang dipakai: {kind:'osis'|'lomba', eventId}
  siswa: null,        // daftar siswa (lazy)
  ev: {},             // cache detail event di memori
  lastActive: Date.now()
};
const userKey = (k) => 'c:' + AppState.mode + ':' + (AppState.user ? AppState.user.id : 'anon') + ':' + k;

/* ---------------- Pengukur performa ---------------- */
const Perf = {
  rows: [],
  add(action, total, server) { this.rows.push({ action, total, server: server ?? null, net: server != null ? total - server : null, at: new Date().toLocaleTimeString() }); if (this.rows.length > 200) this.rows.shift(); },
  table() { console.table(this.rows.slice(-30)); }
};
window.Perf = Perf;

/* ---------------- API ke Apps Script ---------------- */
const READ_ACTIONS = /^(publicBoot|staffBoot|ptkBoot|batch|listSiswa|eventDetail|hasilLive|hasilLayar|listJawaban|juriData|formTerbuka|getForm|cekNisnForm|statusDemo|lihatBerkas|osisPtk|login\w+)$/;

function gasReady() { return typeof GAS_URL === 'string' && /^https:\/\/script\.google(usercontent)?\.com\//.test(GAS_URL) || (typeof GAS_URL === 'string' && /^http:\/\/(localhost|127\.0\.0\.1)/.test(GAS_URL)); }

async function apiOnce(action, data, timeout, reqId, token) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), timeout), t0 = performance.now();
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST', redirect: 'follow', cache: 'no-store', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: token != null ? token : (AppState.token || ''), mode: AppState.mode, reqId, data: data || {} })
    });
    const text = await res.text();
    _lastNet = Date.now();
    try { const j = JSON.parse(text); Perf.add(action, Math.round(performance.now() - t0), j.ms); return j; }
    catch (e) { return { success: false, network: true, retryable: res.status >= 500 || res.status === 429, message: 'Server membalas HTTP ' + res.status + ' (bukan JSON). Periksa URL Web App & izin akses "Anyone".' }; }
  } catch (err) {
    return { success: false, network: true, retryable: true, message: err.name === 'AbortError' ? 'Server terlalu lama merespons.' : 'Koneksi terputus. Periksa internet Anda.' };
  } finally { clearTimeout(timer); }
}

async function api(action, data, opt = {}) {
  if (!gasReady()) return { success: false, message: 'URL Web App belum diisi di js/config.js.' };
  const isRead = READ_ACTIONS.test(action);
  const reqId = isRead ? '' : (opt.reqId || (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random()));
  const tries = isRead ? 3 : 2;
  let res;
  for (let i = 0; i < tries; i++) {
    if (i) { await sleep(1200 * i); if (navigator.onLine === false) await waitOnline(15000); }
    res = await apiOnce(action, data, opt.timeout || (isRead ? (i ? 40000 : 25000) : 90000), reqId, opt.token);
    if (res.success || !res.retryable) break;
  }
  if (!res.success && res.data && res.data.code === 'AUTH' && AppState.token && !opt.noAuthRedirect && opt.token == null) onSessionExpired();
  if (!res.success && res.data && res.data.code === 'DEMO_ENDED') onDemoEnded();
  return res;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function waitOnline(ms) { return new Promise(r => { if (navigator.onLine !== false) return r(); const t = setTimeout(done, ms); function done() { clearTimeout(t); removeEventListener('online', done); r(); } addEventListener('online', done); }); }
let _lastNet = 0;
/** Ping pemanas (cold start Apps Script) — paling sering sekali per 2 menit, dilewati bila server baru saja dipakai. */
function warmUpServer() {
  if (!gasReady() || Date.now() - _lastNet < 120e3) return;
  _lastNet = Date.now();
  fetch(GAS_URL + '?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
}

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

/** Stale-while-revalidate: render dari cache seketika, segarkan di latar, render ulang hanya bila berubah. */
async function swr(key, action, payload, render, opt = {}) {
  const fresh = opt.fresh ?? 60000, k = opt.globalKey ? 'c:' + AppState.mode + ':g:' + key : userKey(key);
  const c = Store.get(k, null);
  if (c && render) render(c.data, true);
  if (c && !opt.force && Date.now() - c.t < fresh) return { success: true, data: c.data, cached: true };
  const res = await api(action, payload);
  if (res.success) {
    const h = hashStr(JSON.stringify(res.data));
    Store.set(k, { t: Date.now(), h, data: res.data });
    if ((!c || c.h !== h) && render) render(res.data, false);
  } else if (!c && opt.onError) opt.onError(res);
  return res;
}
function swrPut(key, data, globalKey) { const k = globalKey ? 'c:' + AppState.mode + ':g:' + key : userKey(key); Store.set(k, { t: Date.now(), h: hashStr(JSON.stringify(data)), data }); }
function swrDrop(key) { Store.del(userKey(key)); }

/* ---------------- Sesi ---------------- */
function sessKey() { return 'sess:' + AppState.mode; }
function setSession(r) {
  AppState.token = r.token; AppState.role = r.role; AppState.user = r.user;
  if (r.role === 'admin' || r.role === 'ptk' || r.role === 'tamu') {
    Store.set(sessKey(), { token: r.token, role: r.role, user: r.user, t: Date.now() });
  }
}
function restoreSession() {
  const s = Store.get(sessKey(), null);
  if (s && s.token && Date.now() - s.t < 11.5 * 3600e3) { AppState.token = s.token; AppState.role = s.role; AppState.user = s.user; return true; }
  return false;
}
function clearSession() {
  Store.del(sessKey());
  AppState.token = ''; AppState.role = ''; AppState.user = null; AppState.boot = null; AppState.ptk = null; AppState.vote = null; AppState.ev = {}; AppState.siswa = null;
}
function logout(msg) {
  clearSession();
  if (msg) toast(msg, '', 'info');
  go('');
}
let _expiredShown = false;
function onSessionExpired() {
  if (_expiredShown) return; _expiredShown = true; setTimeout(() => _expiredShown = false, 4000);
  const voter = AppState.role === 'siswa' || AppState.role === 'lomba';
  clearSession();
  toast(voter ? 'Waktu sesi habis' : 'Sesi berakhir', voter ? 'Silakan masuk lagi.' : 'Silakan masuk kembali.', 'warning');
  go('');
}
function onDemoEnded() {
  if (AppState.mode !== 'demo') return;
  toast('Demo telah diakhiri', 'Kembali ke aplikasi utama.', 'info');
  exitDemo(true);
}
function enterDemo() {
  clearSession();
  AppState.mode = 'demo'; Store.set('mode', 'demo');
  AppState.pub = null;
  restoreSession();
  updateRibbon();
  go('');
  loadPublicBoot(true);
}
function exitDemo(silent) {
  clearSession();
  Store.delPrefix('c:demo:');
  AppState.mode = 'live'; Store.set('mode', 'live');
  AppState.pub = null;
  restoreSession();
  updateRibbon();
  if (!silent) toast('Keluar dari Mode Demo', '', 'info');
  go('');
  loadPublicBoot(true);
}
function updateRibbon() {
  const r = document.getElementById('demo-ribbon');
  const on = AppState.mode === 'demo' && !document.body.classList.contains('screen-mode');
  r.hidden = !on;
  document.body.classList.toggle('has-ribbon', on);
  if (on) {
    r.innerHTML = ic('flask-conical', 'ic-sm') + '<span><b>MODE DEMO</b><span class="rb-long"> — data contoh, akan dihapus saat demo diakhiri</span></span><button type="button" id="btn-exit-demo">Keluar Demo</button>';
    r.querySelector('#btn-exit-demo').onclick = () => exitDemo();
  }
}

/* ---------------- Utilitas umum ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
function ic(name, cls) {
  const b = (window.ICONS || {})[name];
  if (!b) { console.warn('Ikon hilang:', name); return ''; }
  return '<svg class="ic ' + (cls || '') + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + b + '</svg>';
}
function debounce(fn, ms) { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(this, a), ms); }; }
function initials(n) { const p = String(n || '').replace(/^(ibu|bpk\.?|bapak|drs?\.?)\s+/i, '').split(/[\s,]+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
function avClass(n) { let h = 0; for (const c of String(n || '')) h = (h * 7 + c.charCodeAt(0)) % 6; return 'av-' + (h + 1); }
function imgUrl(id, w) { return id ? 'https://lh3.googleusercontent.com/d/' + id + '=w' + (w || 600) : ''; }
function photoHtml(id, name, w) { return id ? '<img loading="lazy" decoding="async" alt="" src="' + imgUrl(id, w || 400) + '">' : '<span class="ini">' + esc(initials(name)) + '</span>'; }
function avatarHtml(name, id, cls) { return '<span class="avatar ' + (cls || '') + ' ' + avClass(name) + '">' + (id ? '<img alt="" loading="lazy" src="' + imgUrl(id, 160) + '">' : esc(initials(name))) + '</span>'; }
function inisialSvg(txt, warna) {
  const c = warna || 'var(--primary)';
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="30" fill="#fff" stroke="' + c + '" stroke-width="3"/><circle cx="32" cy="32" r="24" fill="' + c + '" opacity=".12"/>' +
    '<text x="32" y="38" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="' + (txt.length > 2 ? 16 : 20) + '" fill="' + c + '">' + esc(txt) + '</text></svg>';
}
/** Logo dari pengaturan: URL Drive, atau "inisial:XYZ" (data demo). */
function logoHtml(url, alt) {
  if (!url) return '';
  if (String(url).indexOf('inisial:') === 0) return inisialSvg(String(url).slice(8), '#1E3A5F');
  return '<img alt="' + esc(alt || 'logo') + '" src="' + esc(url) + (/googleusercontent/.test(url) && !/=w\d+/.test(url) ? '=w256' : '') + '">';
}
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function parseTgl(s) { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
function tgl(s) { const d = parseTgl(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear() : (s || '-'); }
function tglPendek(s) { const d = parseTgl(s); return d ? d.getDate() + ' ' + BULAN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear() : (s || '-'); }
function hariTgl(s) { const d = parseTgl(s); return d ? HARI[d.getDay()] + ', ' + tgl(s) : (s || '-'); }
function rentangTgl(a, b) {
  if (!a) return '-'; if (!b || a === b) return tgl(a);
  const x = parseTgl(a), y = parseTgl(b);
  if (x && y && x.getMonth() === y.getMonth() && x.getFullYear() === y.getFullYear()) return x.getDate() + '–' + y.getDate() + ' ' + BULAN[y.getMonth()] + ' ' + y.getFullYear();
  return tglPendek(a) + ' – ' + tglPendek(b);
}
function jam(iso) { const m = String(iso || '').match(/T(\d{2}:\d{2})/); return m ? m[1] : ''; }
function relWaktu(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' mnt lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  if (s < 7 * 86400) return Math.floor(s / 86400) + ' hari lalu'; return tglPendek(iso);
}
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function tahunAjaran() { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 6 ? y + '/' + (y + 1) : (y - 1) + '/' + y; }
function fmtNum(n, dec) { const v = Number(n || 0); return v.toLocaleString('id-ID', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec ?? 2 }); }
function pct(a, b) { return b ? Math.round(a / b * 1000) / 10 : 0; }
function noUrut(n) { return String(n || 0).padStart(2, '0'); }
function kelasSort(a, b) { return String(a).localeCompare(String(b), 'id', { numeric: true }); }
function uniq(arr) { return Array.from(new Set(arr)); }

/* ---------------- Warna utama ---------------- */
function hexToRgb(h) { const m = String(h).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [37, 99, 235]; }
function mix(rgb, w, t) { return rgb.map(c => Math.round(c + (w - c) * t)); }
function rgbHex(r) { return '#' + r.map(x => x.toString(16).padStart(2, '0')).join(''); }
function setPrimary(hex) {
  const rgb = hexToRgb(hex || '#2563EB'), s = document.documentElement.style;
  s.setProperty('--primary', rgbHex(rgb));
  s.setProperty('--primary-hover', rgbHex(mix(rgb, 0, .16)));
  s.setProperty('--primary-tint', rgbHex(mix(rgb, 255, .93)));
  s.setProperty('--primary-tint-2', rgbHex(mix(rgb, 255, .84)));
  s.setProperty('--primary-ring', 'rgba(' + rgb.join(',') + ',.16)');
  const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', rgbHex(rgb));
  Store.set('warna:' + AppState.mode, rgbHex(rgb));
}

/* ---------------- Toast ---------------- */
function toast(title, sub, type) {
  const root = document.getElementById('toasts'), el = document.createElement('div');
  const icn = { error: 'circle-alert', warning: 'triangle-alert', info: 'info' }[type] || 'circle-check';
  el.className = 'toast ' + (type || 'success');
  el.innerHTML = ic(icn) + '<div class="grow"><div class="t-title">' + esc(title) + '</div>' + (sub ? '<div class="t-sub">' + esc(sub) + '</div>' : '') + '</div>';
  root.appendChild(el);
  const t = setTimeout(close, type === 'error' ? 5200 : 3200);
  el.onclick = close;
  function close() { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 220); }
}
function toastRes(res, okTitle, okSub) { if (res && res.success) toast(okTitle, okSub || ''); else toast('Gagal', (res && res.message) || 'Terjadi kesalahan.', 'error'); return res && res.success; }

/* ---------------- Modal / drawer / sheet ---------------- */
function modal(o) {
  const root = document.getElementById('overlay-root'), wrap = document.createElement('div');
  const kind = o.kind || 'modal';
  wrap.className = 'backdrop' + (kind === 'drawer' ? ' drawer-wrap' : kind === 'sheet' ? ' sheet-wrap' : '');
  const box = kind === 'drawer' ? 'drawer' : kind === 'sheet' ? 'sheet' : 'modal ' + (o.size || '');
  if (kind === 'sheet') wrap.innerHTML = '<div class="' + box + '" role="dialog" aria-modal="true">' + o.body + '</div>';
  else wrap.innerHTML = '<div class="' + box + '" role="dialog" aria-modal="true">' +
    '<div class="modal-head"><div><div class="modal-title">' + esc(o.title || '') + '</div>' + (o.sub ? '<div class="card-sub">' + o.sub + '</div>' : '') + '</div>' +
    '<button class="btn btn-ghost btn-icon btn-sm" data-close aria-label="Tutup">' + ic('x') + '</button></div>' +
    '<div class="modal-body">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div>';
  root.appendChild(wrap);
  const prevFocus = document.activeElement;
  const api_ = {
    el: wrap, q: (s) => wrap.querySelector(s), qa: (s) => Array.from(wrap.querySelectorAll(s)),
    close() { wrap.remove(); document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); try { prevFocus && prevFocus.focus(); } catch (e) {} }
  };
  const onKey = (e) => { if (e.key === 'Escape' && !o.static) api_.close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && !o.static) api_.close(); });
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) api_.close(); });
  setTimeout(() => { const f = wrap.querySelector('[autofocus], .input, .btn-primary'); if (f && !o.noFocus) f.focus(); }, 30);
  return api_;
}
function confirmBox(o) {
  return new Promise((resolve) => {
    let done = false;
    const m = modal({
      title: o.title || 'Konfirmasi', size: 'sm',
      body: '<p class="muted" style="line-height:1.6">' + (o.html || esc(o.text || '')) + '</p>' + (o.typed ? '<div class="field mt-16"><label>Ketik <b>' + esc(o.typed) + '</b> untuk melanjutkan</label><input class="input" id="cf-typed" autocomplete="off"></div>' : ''),
      foot: '<button class="btn" data-close>' + esc(o.cancel || 'Batal') + '</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" id="cf-ok"' + (o.typed ? ' disabled' : '') + '>' + esc(o.ok || 'Ya, lanjutkan') + '</button>',
      onClose: () => { if (!done) resolve(false); }
    });
    if (o.typed) m.q('#cf-typed').oninput = (e) => { m.q('#cf-ok').disabled = e.target.value.trim() !== o.typed; };
    m.q('#cf-ok').onclick = () => { done = true; m.close(); resolve(o.typed ? m.q('#cf-typed') && true : true); };
  });
}
async function busy(btn, fn) {
  if (!btn) return fn();
  btn.classList.add('is-busy'); btn.disabled = true;
  try { return await fn(); } finally { btn.classList.remove('is-busy'); btn.disabled = false; }
}

/* ---------------- Berkas & gambar ---------------- */
function fileToB64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
}
function resizeImage(file, max, mime, q) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const sc = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const g = c.getContext('2d');
      if ((mime || 'image/jpeg') === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res({ b64: c.toDataURL(mime || 'image/jpeg', q || .86).split(',')[1], mime: mime || 'image/jpeg', w: c.width, h: c.height });
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas gambar tidak dapat dibaca.')); };
    img.src = url;
  });
}
function pickFile(accept) {
  return new Promise((res) => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept || 'image/*';
    i.onchange = () => res(i.files && i.files[0] ? i.files[0] : null);
    i.click();
  });
}
/** Unggah gambar (diperkecil di perangkat). kind: logo|logoInstansi|foto|peserta|template */
async function uploadImage(kind, opt = {}) {
  const f = await pickFile('image/png,image/jpeg,image/webp');
  if (!f) return null;
  if (f.size > (opt.maxMB || 10) * 1024 * 1024) { toast('Berkas terlalu besar', 'Ukuran berkas maksimal ' + (opt.maxMB || 10) + ' MB.', 'error'); return null; }
  let img;
  try { img = await resizeImage(f, opt.max || 600, opt.png ? 'image/png' : 'image/jpeg', opt.q); }
  catch (e) { toast('Gagal', e.message, 'error'); return null; }
  let tampil = '';
  if (opt.tampil) { try { tampil = await logoDataUrl(f, opt.tampil); } catch (e) { /* tetap unggah tanpa versi tampilan */ } }
  if (opt.onStart) opt.onStart();
  const res = await api('unggahBerkas', { kind, b64: img.b64, mime: img.mime, tampil, name: f.name.replace(/\.[^.]+$/, '') + (opt.png ? '.png' : '.jpg') });
  if (!res.success) { toast('Unggah gagal', res.message, 'error'); return null; }
  return res.data;
}
/**
 * Versi tampilan logo yang TETAP transparan (PNG/WebP sebagai data URL, ≤ ±130 KB).
 * Gambar dari Drive (lh3) kehilangan transparansi sehingga latarnya menjadi hitam.
 */
function logoDataUrl(file, max) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let best = '';
      for (const m of [max, Math.round(max * .8), Math.round(max * .62)]) {
        const sc = Math.min(1, m / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * sc)); c.height = Math.max(1, Math.round(img.height * sc));
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height);   // tanpa isi latar → alfa tetap
        const png = c.toDataURL('image/png'), webp = c.toDataURL('image/webp', .92);
        best = /^data:image\/webp/.test(webp) && webp.length < png.length ? webp : png;
        if (best.length <= 130000) break;
      }
      best.length <= 175000 ? res(best) : rej(new Error('Logo terlalu besar'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Berkas gambar tidak dapat dibaca.')); };
    img.src = url;
  });
}
const _scripts = {};
function loadScript(src) {
  if (_scripts[src]) return _scripts[src];
  return (_scripts[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => { delete _scripts[src]; rej(new Error('Gagal memuat ' + src)); }; document.head.appendChild(s); }));
}
async function loadXLSX() { if (window.XLSX) return window.XLSX; await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'); return window.XLSX; }
function downloadBlob(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
async function exportXlsx(name, sheets) {
  const X = await loadXLSX(), wb = X.utils.book_new();
  sheets.forEach(s => { const ws = X.utils.aoa_to_sheet(s.rows); ws['!cols'] = (s.rows[0] || []).map((h, i) => ({ wch: Math.min(40, Math.max(8, ...s.rows.slice(0, 200).map(r => String(r[i] ?? '').length + 2))) })); X.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); });
  X.writeFile(wb, name);
}
/** Link untuk dibagikan (voting, formulir, layar). Mode demo/asli ikut di URL agar perangkat lain membuka data yang benar. */
function linkApp(path) { return location.origin + location.pathname + (AppState.mode === 'demo' ? '?m=demo' : '') + '#/' + path; }
async function loadQR() { if (window.qrcode) return window.qrcode; await loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'); return window.qrcode; }
/** QR sebagai SVG (tajam di layar & cetak). */
async function qrSvg(text, px) {
  const Q = await loadQR(), q = Q(0, 'M'); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 2, sz = n + m * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + sz + ' ' + sz + '" width="' + (px || 200) + '" height="' + (px || 200) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#0F172A"/></svg>';
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); const ok = document.execCommand('copy'); a.remove(); return ok; } }
const _fonts = {};
function loadFonts(families) {
  const need = families.filter(f => f && !_fonts[f] && !/^(Arial|Times New Roman|Georgia|Plus Jakarta Sans)$/.test(f));
  if (!need.length) return Promise.resolve();
  need.forEach(f => _fonts[f] = 1);
  const l = document.createElement('link'); l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?' + need.map(f => 'family=' + f.replace(/ /g, '+') + ':wght@400;700').join('&') + '&display=swap';
  document.head.appendChild(l);
  return new Promise(r => { l.onload = () => (document.fonts ? document.fonts.ready.then(r) : r()); l.onerror = r; setTimeout(r, 2500); });
}

/* ---------------- Router SPA ---------------- */
const Pages = {};
const ADMIN_PAGES = ['dasbor', 'event', 'ev', 'formulir-admin', 'form', 'jawaban', 'siswa', 'data-ptk', 'kehadiran', 'cetak', 'layar', 'pengaturan', 'piagam', 'panitia-ku'];
const LAYAR_PAGES = ['tayang', 'layar-tv'];
let _layarLoading = null;
function ensureLayarBundle() {
  if (window.__LAYAR_READY) return Promise.resolve();
  if (!_layarLoading) _layarLoading = loadScript('js/layar.js?v=' + APP_VER).then(() => { window.__LAYAR_READY = true; }).catch(e => { _layarLoading = null; throw e; });
  return _layarLoading;
}
let _adminLoading = null;
function registerPage(name, def) { Pages[name] = Object.assign({ layout: 'pub', auth: 'none' }, def); }
function go(path) { const h = '#/' + (path || ''); if (location.hash === h) route(); else location.hash = h; }
function ensureAdminBundle() {
  if (window.__ADMIN_READY) return Promise.resolve();
  if (!_adminLoading) _adminLoading = Promise.all([loadScript('js/admin.js?v=' + APP_VER), loadScript('js/admin2.js?v=' + APP_VER)]).then(() => { window.__ADMIN_READY = true; })
    .catch(e => { _adminLoading = null; throw e; });
  return _adminLoading;
}
let _curPage = null;
async function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  let name = parts[0] || 'home';
  if (!Pages[name] && ADMIN_PAGES.indexOf(name) > -1) {
    try { await ensureAdminBundle(); } catch (e) { toast('Gagal memuat halaman', 'Periksa koneksi lalu coba lagi.', 'error'); return; }
  }
  if (!Pages[name] && LAYAR_PAGES.indexOf(name) > -1) {
    try { await ensureLayarBundle(); } catch (e) { toast('Gagal memuat halaman', 'Periksa koneksi lalu coba lagi.', 'error'); return; }
  }
  let def = Pages[name];
  if (!def) { name = 'home'; def = Pages.home; }
  // Penjaga akses
  const r = AppState.role;
  const allow = {
    none: true, staff: r === 'admin' || r === 'ptk', admin: r === 'admin', juri: r === 'ptk' || r === 'tamu',
    ptk: r === 'ptk' || r === 'tamu', voter: !!AppState.vote, lomba: !!AppState.vote && AppState.role === 'lomba'
  }[def.auth];
  if (!allow) {
    if ((def.auth === 'staff' || def.auth === 'admin') && (r === 'ptk' || r === 'tamu')) { if (location.hash !== '#/ptk') return go('ptk'); }
    return go(def.auth === 'staff' || def.auth === 'admin' ? 'masuk-admin' : '');
  }
  if (def.auth === 'staff' && r === 'ptk' && !AppState.boot) {
    if (!(await ensureStaffBoot())) return go('ptk');
  }
  if (def.auth === 'admin' || def.auth === 'staff') {
    try { await ensureAdminBundle(); } catch (e) { toast('Gagal memuat halaman', 'Periksa koneksi lalu coba lagi.', 'error'); return; }
  }
  document.body.classList.toggle('screen-mode', def.layout === 'full');
  updateRibbon();
  const host = layoutHost(def.layout);
  let el = host.querySelector(':scope > .page[data-page="' + name + '"]');
  if (!el) { el = document.createElement('section'); el.className = 'page'; el.dataset.page = name; host.appendChild(el); if (def.init) def.init(el); }
  $$('#app .page').forEach(p => { if (p !== el) p.hidden = true; });
  el.hidden = false;
  if (_curPage && _curPage !== def && _curPage.leave) { try { _curPage.leave(); } catch (e) {} }
  _curPage = def;
  if (def.layout === 'shell' && window.Shell) Shell.activate(def.nav || name, def.title || '');
  document.title = (def.title ? def.title + ' · ' : '') + 'MEvent';
  if (def.layout !== 'shell' || !el.dataset.keepScroll) window.scrollTo(0, 0);
  try { await def.show(el, parts[1], parts[2], parts[3]); }
  catch (e) { console.error(e); el.innerHTML = errorBox(e.message || String(e)); }
}
function layoutHost(layout) {
  const app = document.getElementById('app');
  const splash = document.getElementById('boot-splash'); if (splash) splash.remove();
  let pub = document.getElementById('pub-root'), shell = document.getElementById('shell-root'), full = document.getElementById('full-root');
  if (!pub) { pub = document.createElement('div'); pub.id = 'pub-root'; app.appendChild(pub); }
  if (!full) { full = document.createElement('div'); full.id = 'full-root'; app.appendChild(full); }
  if (layout === 'shell') {
    if (!shell) { shell = window.Shell.build(); app.appendChild(shell); }
    pub.hidden = true; full.hidden = true; shell.hidden = false;
    return shell.querySelector('#shell-content');
  }
  if (shell) shell.hidden = true;
  if (layout === 'full' || layout === 'bare') { pub.hidden = true; full.hidden = false; return full; }
  full.hidden = true; pub.hidden = false;
  return pub;
}
function errorBox(msg, retryJs) {
  return '<div class="empty"><div class="empty-art" style="background:var(--red-tint);color:var(--red)">' + ic('wifi-off', 'ic-xl') + '</div><div class="empty-title">Gagal memuat data</div><div>' + esc(msg) + '</div>' +
    '<button class="btn btn-primary mt-8" onclick="' + (retryJs || 'route()') + '">' + ic('refresh-cw', 'ic-sm') + ' Coba lagi</button></div>';
}
function skeletonCards(n, h) { return Array.from({ length: n || 3 }, () => '<div class="sk sk-card" style="height:' + (h || 120) + 'px;margin-bottom:12px"></div>').join(''); }

/* ---------------- Boot publik & staff ---------------- */
let _pubLoading = null;
function loadPublicBoot(force) {
  const cachedPub = Store.get('c:' + AppState.mode + ':g:pub', null);
  if (cachedPub && !AppState.pub) applyPub(cachedPub.data);
  if (_pubLoading && !force) return _pubLoading;
  _pubLoading = swr('pub', 'publicBoot', {}, (d) => { applyPub(d); if (_curPage && _curPage.onPub) _curPage.onPub(d); }, { fresh: force ? 0 : 20000, globalKey: true, force: !!force })
    .then(res => { _pubLoading = null; return res; });
  return _pubLoading;
}
function applyPub(d) {
  AppState.pub = d;
  if (d && d.sekolah && d.sekolah.WarnaUtama) setPrimary(d.sekolah.WarnaUtama);
}
async function ensureStaffBoot(force) {
  if (AppState.boot && !force) return true;
  const res = await swr('boot', 'staffBoot', {}, (d) => { AppState.boot = d; if (d.settings) setPrimary(d.settings.WarnaUtama); }, { fresh: force ? 0 : 15000, force: !!force });
  if (!res.success) { if (!AppState.boot) toast('Tidak dapat membuka panel', res.message, 'error'); return !!AppState.boot; }
  return true;
}
/** Segarkan boot staff di latar setelah perubahan data. */
const refreshBoot = debounce(() => { if (Date.now() - (window._batchAt || 0) < 3000) return; if (AppState.role === 'admin' || (AppState.role === 'ptk' && AppState.boot)) ensureStaffBoot(true).then(() => { if (window.Shell) Shell.refreshBadges(); }); }, 400);

/* ---------------- Aktivitas & idle ---------------- */
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { AppState.lastActive = Date.now(); }, { passive: true }));
setInterval(() => {
  if ((AppState.role === 'admin' || AppState.role === 'ptk' || AppState.role === 'tamu') && Date.now() - AppState.lastActive > 60 * 60e3 && !document.body.classList.contains('screen-mode')) {
    logout('Anda otomatis keluar karena lama tidak aktif.');
  }
}, 60e3);
let _hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _hiddenAt = Date.now();
  else if (_hiddenAt && Date.now() - _hiddenAt > 120e3) warmUpServer();
});

/* ---------------- Mulai ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  const w = Store.get('warna:' + AppState.mode, null); if (w) setPrimary(w);
  if (!gasReady()) {
    document.getElementById('app').innerHTML = '<div class="thanks"><div class="thanks-ring" style="background:var(--amber-tint);color:#D97706">' + ic('settings', 'ic-xl') + '</div><h2>URL server belum diatur</h2>' +
      '<p class="muted" style="max-width:440px;line-height:1.6">Buka berkas <b>js/config.js</b>, isi <code>GAS_URL</code> dengan URL Web App Apps Script yang berakhiran <code>/exec</code>, lalu unggah ulang.</p></div>';
    return;
  }
  // Link yang dibagikan membawa ?m=demo → buka data demo; tanpa itu → data asli.
  try {
    const qm = new URLSearchParams(location.search).get('m');
    const want = qm === 'demo' ? 'demo' : (qm === 'live' ? 'live' : null);
    const linkPage = /^#\/(voting-osis|voting-lomba|layar-tv)\//.test(location.hash);
    const target = want || (linkPage ? 'live' : null);
    if (target && target !== AppState.mode) { AppState.mode = target; Store.set('mode', target); AppState.pub = null; }
  } catch (e) {}
  warmUpServer();
  restoreSession();
  updateRibbon();
  loadPublicBoot();
  if (AppState.role === 'admin') ensureAdminBundle().catch(() => {});
  window.addEventListener('hashchange', route);
  route();
});
