'use strict';
/* =====================================================================
   Sistem Persuratan — frontend (SPA murni, tanpa reload antar menu)
   - Hanya memakai GAS_URL dari config.js. Tidak ada rahasia di sini.
   - Semua data dari server ditampilkan lewat esc() (anti-XSS).
   - Token sesi disimpan di sessionStorage, dihapus saat logout.
   ===================================================================== */

// ---------- Util ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const TZ = 'Asia/Jakarta';
const fdate = iso => { if (!iso) return '-'; const d = new Date(String(iso).length === 10 ? iso + 'T00:00:00' : iso); return isNaN(d) ? esc(iso) : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }); };
const fdt = iso => { if (!iso) return '-'; const d = new Date(iso); return isNaN(d) ? esc(iso) : d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }); };
const todayStr = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
const initials = n => String(n || '?').replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
const ico = n => `<i data-lucide="${n}"></i>`;
const refreshIcons = () => { try { window.lucide && lucide.createIcons(); } catch (e) { /* abaikan */ } };
function render(el, html) { el.innerHTML = html; refreshIcons(); }

const STATUS_LABEL = { DIAJUKAN: 'Diajukan', DIPROSES: 'Diproses', MENUNGGU_VERIFIKASI: 'Menunggu Verifikasi', TERBIT: 'Terbit', DITOLAK: 'Ditolak', DIBATALKAN: 'Dibatalkan', AKTIF: 'Aktif', MENUNGGU: 'Menunggu', BLOKIR: 'Diblokir', DITERIMA: 'Diterima', DIDISPOSISIKAN: 'Didisposisikan', SELESAI: 'Selesai', BATAL: 'Batal' };
const badge = st => `<span class="badge b-${esc(st)}">${esc(STATUS_LABEL[st] || st)}</span>`;
const ROLE_LABEL = { ADMIN: 'Admin Persuratan', PIMPINAN: 'Pimpinan / TTE', USER: 'Pemohon' };

const ERR = {
  UNAUTHENTICATED: 'Sesi berakhir atau login gagal. Silakan masuk lagi.', FORBIDDEN: 'Anda tidak memiliki akses untuk tindakan ini.',
  PENDING_APPROVAL: 'Akun Anda menunggu persetujuan admin. Anda akan dapat masuk setelah disetujui.',
  NIP_ATAU_SANDI_SALAH: 'NIP atau kata sandi salah.', AKUN_TERKUNCI: 'Terlalu banyak percobaan gagal. Akun dikunci 15 menit.', KREDENSIAL_KOSONG: 'Isi NIP dan kata sandi.',
  WAJIB_GANTI_SANDI: 'Anda harus mengganti kata sandi sementara terlebih dahulu.', SANDI_LEMAH: 'Kata sandi minimal 8 karakter dan memuat huruf dan angka.', SANDI_LAMA_SALAH: 'Kata sandi lama salah.',
  NIP_BELUM_DIISI: 'NIP pengguna belum diisi. Isi NIP lebih dulu.', GUNAKAN_RESET_DARURAT: 'Akun darurat diganti lewat editor Apps Script (resetAksesDarurat).',
  STATUS_TIDAK_VALID: 'Status surat sudah berubah. Muat ulang daftar.', SURAT_TIDAK_DITEMUKAN: 'Surat tidak ditemukan.', BELUM_TERBIT: 'Surat belum terbit, tidak dapat diunduh.',
  PEJABAT_BELUM_DIATUR: 'Pejabat penandatangan belum dipilih.', PEJABAT_TIDAK_BERWENANG_UNTUK_JENIS_INI: 'Pejabat tidak berwenang untuk jenis surat ini.', PEJABAT_TIDAK_ADA: 'Pejabat tidak ditemukan.',
  JENIS_DI_LUAR_WEWENANG: 'Jenis surat ini di luar wewenang Anda.', SEDANG_DIPROSES: 'Surat sedang diproses, tunggu sebentar.', TTD_PEJABAT_BELUM_DIUNGGAH: 'Tanda tangan pejabat belum diunggah (menu Template → Pejabat).',
  FRONTEND_URL_BELUM_DIISI: 'FRONTEND_URL belum diisi di Script Properties.', QR_GAGAL_DIBUAT: 'QR gagal dibuat. Coba lagi.', ALASAN_WAJIB: 'Alasan/catatan wajib diisi.',
  TIDAK_BOLEH_UBAH_DIRI_SENDIRI: 'Anda tidak dapat mengubah peran atau status akun sendiri.', SUDAH_ADA: 'Data sudah ada.', EMAIL_TIDAK_VALID: 'Email tidak valid.', TIDAK_DITEMUKAN: 'Data tidak ditemukan.',
  JENIS_TIDAK_DITEMUKAN: 'Jenis surat tidak ditemukan.', JENIS_TIDAK_AKTIF: 'Jenis surat tidak aktif.', BERKAS_TERLALU_BESAR: 'Berkas terlalu besar (maks. 5 MB).', JENIS_BERKAS_TIDAK_DIIZINKAN: 'Hanya PDF, PNG, atau JPG.',
  ISIAN_WAJIB: 'Isian wajib belum diisi', TANGGAL_TIDAK_VALID: 'Tanggal tidak valid', PILIHAN_TIDAK_VALID: 'Pilihan tidak valid', PERSONEL_TIDAK_DITEMUKAN: 'Personel tidak ditemukan', INSTANSI_TIDAK_DITEMUKAN: 'Instansi tidak ditemukan',
  TERLALU_BANYAK_PERMINTAAN: 'Terlalu banyak permintaan, coba lagi nanti.', BELUM_SETUP: 'Server belum disiapkan. Jalankan setupAppEnvironment().', DOCS_TIDAK_BISA_DIBUKA: 'Dokumen Google Docs tidak bisa dibuka. Pastikan ID benar dan dimiliki akun pemilik skrip.',
  ID_DOCS_TIDAK_VALID: 'ID/URL Google Docs tidak valid.', 'POLA_NOMOR_HARUS_MEMUAT_{no}': 'Pola nomor harus memuat {no}.', POLA_NOMOR_TIDAK_VALID: 'Pola nomor memuat karakter yang tidak diizinkan.', HANYA_SURAT_TERBIT_YANG_DAPAT_DIBATALKAN: 'Hanya surat berstatus Terbit yang dapat dibatalkan.',
  PDF_BELUM_ADA: 'PDF belum tersedia.', KODE_WAJIB: 'Kode wajib diisi.', NAMA_WAJIB: 'Nama wajib diisi.', GAMBAR_TERLALU_BESAR: 'Gambar maksimal 1 MB.', LAMPIRAN_TIDAK_ADA: 'Tidak ada lampiran.'
};
function pesanErr(m) { const s = String(m || ''), i = s.indexOf(':'), k = i > -1 ? s.slice(0, i) : s, ext = i > -1 ? s.slice(i + 1) : ''; return (ERR[k] || s || 'Terjadi kesalahan.') + (ext && ERR[k] ? ' — ' + ext : ''); }

function toast(msg, tipe) {
  const d = document.createElement('div'); d.className = tipe || ''; d.textContent = msg;
  $('#toast').appendChild(d); setTimeout(() => d.remove(), tipe === 'err' ? 6000 : 3500);
}

// ---------- Jaringan (satu pintu, text/plain agar bebas preflight CORS) ----------
let TOKEN = sessionStorage.getItem('tok') || null;
const MC = new Map();           // cache memori (SWR); dibersihkan saat ada tulis & logout
const inflight = {}; let epoch = 0;
async function apiRun(action, data, isRead) {
  const maks = isRead ? 2 : 0;
  for (let i = 0; i <= maks; i++) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 60000);
    try {
      const res = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, token: TOKEN }, data || {})), signal: ctl.signal });
      const j = await res.json();
      if (!j.success && (j.message === 'UNAUTHENTICATED') && TOKEN) { keluar('Sesi berakhir. Silakan masuk lagi.'); }
      return j;
    } catch (err) {
      if (i === maks) return { success: false, message: err.name === 'AbortError' ? 'Waktu habis, coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    } finally { clearTimeout(timer); }
  }
}
const BACA = /^(get|list|fetch|boot|ping)/i;
async function api(action, data) {
  if (!BACA.test(action)) { epoch++; MC.clear(); return apiRun(action, data, false); }
  const k = epoch + '|' + action + '|' + JSON.stringify(data || {});
  if (inflight[k]) return inflight[k];
  const p = apiRun(action, data, true); inflight[k] = p;
  p.then(() => delete inflight[k], () => delete inflight[k]);
  return p;
}
/** SWR: tampilkan cache seketika, lalu segarkan di latar belakang bila datanya berubah. */
async function swr(action, data, onData) {
  const k = action + JSON.stringify(data || {}), hit = MC.get(k);
  if (hit) onData(hit.d, true);
  if (hit && Date.now() - hit.t < 20000) return hit.d;
  const r = await api(action, data);
  if (r && r.success) { const baru = JSON.stringify(r); if (!hit || JSON.stringify(hit.d) !== baru) onData(r, false); MC.set(k, { t: Date.now(), d: r }); }
  else if (!hit) onData(r, false);
  return r;
}

// ---------- Modal ----------
function modal({ title, sub, body, footer, wide, onClose }) {
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true"><div class="modal-h"><div><h3>${esc(title)}</h3>${sub ? `<div class="sm muted">${sub}</div>` : ''}</div><button class="rbtn" data-x aria-label="Tutup">${ico('x')}</button></div><div class="modal-b">${body || ''}</div><div class="modal-f"></div></div>`;
  $('#modals').appendChild(ov);
  const api_ = { el: ov, body: $('.modal-b', ov), close() { ov.remove(); onClose && onClose(); }, setBody(h) { render($('.modal-b', ov), h); } };
  $('[data-x]', ov).onclick = api_.close;
  ov.addEventListener('mousedown', e => { if (e.target === ov) api_.close(); });
  const f = $('.modal-f', ov);
  (footer || []).forEach(b => {
    const btn = document.createElement('button'); btn.className = 'btn ' + (b.cls || ''); btn.innerHTML = (b.icon ? ico(b.icon) : '') + esc(b.label);
    btn.onclick = async () => {
      if (btn.disabled) return; btn.disabled = true; const old = btn.innerHTML; btn.innerHTML = '<span class="spin"></span>';
      try { const r = await b.onClick(api_); if (r !== false && !b.keep) api_.close(); } finally { if (document.body.contains(btn)) { btn.disabled = false; btn.innerHTML = old; refreshIcons(); } }
    };
    f.appendChild(btn);
  });
  if (!(footer || []).length) f.remove();
  refreshIcons();
  return api_;
}
function promptModal(title, label, aksi, { cls = 'danger solid', tombol = 'Kirim', placeholder = '' } = {}) {
  return modal({ title, body: `<div class="field"><label>${esc(label)} <span class="req">*</span></label><textarea class="in" id="pm-t" placeholder="${esc(placeholder)}" maxlength="500"></textarea></div>`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: tombol, cls, onClick: async () => { const v = $('#pm-t').value.trim(); if (!v) { toast('Wajib diisi.', 'err'); return false; } return aksi(v); } }] });
}
function skel(n = 4) { return '<div class="card">' + Array.from({ length: n }, (_, i) => `<div class="skel ${i === 0 ? 'big' : ''}"></div>`).join('') + '</div>'; }

// ---------- Komponen bersama ----------
function pagerHtml(r) {
  if (!r || !r.total) return '';
  const a = (r.page - 1) * r.perPage + 1, b = Math.min(r.total, r.page * r.perPage);
  let btns = '';
  const mulai = Math.max(1, Math.min(r.page - 2, r.pages - 4)), akhir = Math.min(r.pages, mulai + 4);
  for (let i = mulai; i <= akhir; i++) btns += `<button data-p="${i}" class="${i === r.page ? 'on' : ''}">${i}</button>`;
  return `<div class="pager"><span>Menampilkan <b>${a}–${b}</b> dari <b>${r.total}</b></span><div class="pg"><button data-p="${r.page - 1}" ${r.page <= 1 ? 'disabled' : ''}>‹</button>${btns}<button data-p="${r.page + 1}" ${r.page >= r.pages ? 'disabled' : ''}>›</button></div></div>`;
}
function wirePager(root, fn) { $$('.pager [data-p]', root).forEach(b => b.onclick = () => { if (!b.disabled) fn(+b.dataset.p); }); }
function tabel(cols, rows) {
  if (!rows.length) return '<div class="empty">Belum ada data.</div>';
  return `<div class="tbl-wrap"><table><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td data-l="${esc(cols[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function pageHead(judul, sub, aksi) { return `<div class="page-h"><div><h1>${esc(judul)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="tools">${aksi || ''}</div></div>`; }
function kpiCard({ ico: i, label, num, note, chip, hl, chipCls }) {
  return `<div class="card kpi ${hl ? 'hl' : ''}"><div class="top"><div class="ic">${ico(i || 'file-text')}</div>${chip !== undefined && chip !== '' ? `<span class="chip ${chipCls || ''}">${chip}</span>` : ''}</div><div class="lbl">${esc(label)}</div><div><span class="num">${esc(num)}</span><span class="note">${esc(note || '')}</span></div></div>`;
}
const deltaChip = d => d === undefined ? { chip: '', chipCls: '' } : { chip: (d >= 0 ? '↗ +' : '↘ ') + d + '%', chipCls: d >= 0 ? 'up' : 'down' };
function b64ToBlob(b64, mime) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: mime }); }
function simpanBerkas(res) { const url = URL.createObjectURL(b64ToBlob(res.base64, res.mime)), a = document.createElement('a'); a.href = url; a.download = res.nama || 'dokumen.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); }
async function unduh(action, payload, tombol) {
  if (tombol) tombol.disabled = true;
  const r = await api(action, payload);
  if (tombol) tombol.disabled = false;
  if (!r.success) return toast(pesanErr(r.message), 'err');
  simpanBerkas(r);
}
async function pratinjauPdf(id, judul) {
  const m = modal({ title: judul || 'Pratinjau Dokumen', wide: true, body: '<div class="skel big"></div>', footer: [{ label: 'Tutup', onClick: () => true }] });
  const r = await api('fetchPdf', { id, pratinjau: true });
  if (!r.success) { m.setBody(`<div class="alert err">${esc(pesanErr(r.message))}</div>`); return; }
  const url = URL.createObjectURL(b64ToBlob(r.base64, 'application/pdf'));
  m.setBody(`<iframe class="pdf-frame" src="${url}" title="Pratinjau PDF"></iframe>`);
}
function fileKeBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error('Gagal membaca berkas')); r.readAsDataURL(file); });
}
async function lampiranDari(input) {
  const f = input && input.files && input.files[0]; if (!f) return null;
  if (f.size > 5 * 1024 * 1024) throw new Error('Berkas terlalu besar (maks. 5 MB).');
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(f.type)) throw new Error('Hanya PDF, PNG, atau JPG.');
  return { nama: f.name, mime: f.type, base64: await fileKeBase64(f) };
}
function dropzone(id) {
  return `<div class="drop" id="${id}-drop"><div style="font-weight:600">Tarik berkas PDF/PNG/JPG ke sini</div><div class="sm muted">atau klik untuk memilih (maks. 5 MB)</div><div class="sm" id="${id}-nama" style="margin-top:8px"></div><input type="file" id="${id}" accept="application/pdf,image/png,image/jpeg" class="hidden"></div>`;
}
function wireDrop(id) {
  const d = $('#' + id + '-drop'), inp = $('#' + id), nama = $('#' + id + '-nama'); if (!d) return;
  const tampil = () => { nama.textContent = inp.files[0] ? '📎 ' + inp.files[0].name + ' (' + Math.ceil(inp.files[0].size / 1024) + ' KB)' : ''; };
  d.onclick = () => inp.click(); inp.onchange = tampil;
  d.ondragover = e => { e.preventDefault(); d.classList.add('over'); }; d.ondragleave = () => d.classList.remove('over');
  d.ondrop = e => { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer.files[0]) { inp.files = e.dataTransfer.files; tampil(); } };
}

// ---------- Formulir dinamis dari daftar isian template ----------
const CTX = { personel: null, instansi: null, pejabat: null };
async function muatCtx(perlu) {
  const jobs = [];
  if (perlu.includes('personel') && !CTX.personel) jobs.push(api('listPersonel').then(r => { CTX.personel = r.success ? r.rows : []; }));
  if (perlu.includes('instansi') && !CTX.instansi) jobs.push(api('listInstansi').then(r => { CTX.instansi = r.success ? r.rows : []; }));
  await Promise.all(jobs);
}
const perluCtx = isian => [...new Set(isian.map(f => f.tipe).filter(t => t === 'personel' || t === 'instansi'))];
function fieldsHtml(isian, vals, pfx = 'f') {
  return isian.map(f => {
    const id = `${pfx}_${f.tag}`; let v = vals ? vals[f.tag] : ''; if (v && typeof v === 'object') v = v.email || v.id || '';
    const wajib = f.wajib ? '<span class="req">*</span>' : '';
    let inp;
    if (f.tipe === 'textarea') inp = `<textarea class="in" id="${id}" data-tag="${esc(f.tag)}" maxlength="5000">${esc(v || '')}</textarea>`;
    else if (f.tipe === 'date') inp = `<input type="date" class="in" id="${id}" data-tag="${esc(f.tag)}" value="${esc(v || '')}">`;
    else if (f.tipe === 'number') inp = `<input type="number" class="in" id="${id}" data-tag="${esc(f.tag)}" value="${esc(v || '')}">`;
    else if (f.tipe === 'select') inp = `<select class="in" id="${id}" data-tag="${esc(f.tag)}"><option value="">— pilih —</option>${String(f.opsi || '').split('|').map(o => o.trim()).filter(Boolean).map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.tipe === 'personel') inp = `<select class="in" id="${id}" data-tag="${esc(f.tag)}"><option value="">— pilih personel —</option>${(CTX.personel || []).map(p => `<option value="${esc(p.email)}" ${p.email === v ? 'selected' : ''}>${esc(p.nama)}${p.nip ? ' (NIP: ' + esc(p.nip) + ')' : ''}</option>`).join('')}</select>`;
    else if (f.tipe === 'instansi') inp = `<select class="in" id="${id}" data-tag="${esc(f.tag)}"><option value="">— pilih instansi —</option>${(CTX.instansi || []).map(p => `<option value="${esc(p.id)}" ${p.id === v ? 'selected' : ''}>${esc(p.nama)}</option>`).join('')}</select>`;
    else inp = `<input class="in" id="${id}" data-tag="${esc(f.tag)}" value="${esc(v || '')}" maxlength="300">`;
    return `<div class="field"><label for="${id}">${esc(f.label)} ${wajib}</label>${inp}${f.bantuan ? `<span class="hint">${esc(f.bantuan)}</span>` : ''}</div>`;
  }).join('');
}
function bacaIsian(root, isian) { const d = {}; isian.forEach(f => { const el = $(`[data-tag="${f.tag}"]`, root); d[f.tag] = el ? el.value : ''; }); return d; }
function cekWajib(isian, data) { const k = isian.find(f => f.wajib && !String(data[f.tag] || '').trim()); return k ? `“${k.label}” wajib diisi.` : ''; }
function nilaiTampil(f, v) {
  if (!v) return '';
  if (f.tipe === 'personel') { const p = (CTX.personel || []).find(x => x.email === v); return p ? p.nama : ''; }
  if (f.tipe === 'instansi') { const p = (CTX.instansi || []).find(x => x.id === v); return p ? p.nama : ''; }
  if (f.tipe === 'date') return fdate(v);
  return v;
}
function previewIsianHtml(tpl, data) {
  const rows = tpl.isian.map(f => { const v = nilaiTampil(f, data[f.tag]); return `<dt>${esc(f.label)}</dt><dd>${v ? esc(v) : '<span style="color:#b8bccd">—</span>'}</dd>`; }).join('');
  return `<div class="preview"><h4>${esc(String(tpl.nama).toUpperCase())}</h4><div class="no">Nomor: [diberikan otomatis saat diproses admin]</div><dl>${rows}</dl><p class="muted sm" style="font-family:inherit;margin-top:18px">Ini pratinjau isian. Surat resmi dibuat dari template Google Docs, dengan nomor, tanda tangan, stempel, dan QR dibubuhkan otomatis setelah disetujui pimpinan.</p></div>`;
}

// =====================================================================
// AUTH, SHELL, ROUTER
// =====================================================================
const ST = { profil: null, menu: [], jenis: [], dash: null, via: sessionStorage.getItem('via') || 'google' };
let CH = []; // instance Chart.js aktif
const hancurkanChart = () => { CH.forEach(c => { try { c.destroy(); } catch (e) { /* abaikan */ } }); CH = []; };
function tampil(id) { ['boot', 'login', 'pub', 'app'].forEach(x => $('#' + x).classList.toggle('hidden', x !== id)); }

function keluar(pesan) {
  TOKEN = null; sessionStorage.removeItem('tok'); sessionStorage.removeItem('via'); MC.clear();
  CTX.personel = CTX.instansi = CTX.pejabat = null; hancurkanChart(); $('#modals').innerHTML = '';
  tampilLogin(pesan);
}
function simpanSesi(r, via) {
  TOKEN = r.token; sessionStorage.setItem('tok', TOKEN); sessionStorage.setItem('via', via); ST.via = via;
}

async function tampilLogin(pesan) {
  tampil('login');
  const cfg = await api('getAuthConfig');
  const el = $('#login');
  render(el, `<div class="login"><div class="login-card">
    <div><div class="brand" style="padding:0 0 14px"><div class="logo">${ico('mail-check')}</div><div><b>e-Surat</b><small>Sistem Persuratan Elektronik</small></div></div>
      <h2 style="font-size:22px;line-height:30px;margin-bottom:6px">${esc(cfg.success ? cfg.namaOrg : 'Sistem Persuratan')}</h2>
      <p class="muted">Pengajuan, penomoran otomatis, verifikasi pimpinan, dan keaslian surat ber-QR dalam satu tempat.</p>
      <div class="hero"><div class="xs bold" style="letter-spacing:.06em">INTEGRITAS DOKUMEN DIGITAL</div><div style="font-size:17px;font-weight:600;margin:6px 0">Surat resmi dengan nomor otomatis & QR keaslian</div><div class="sm" style="opacity:.85">Setiap surat terbit dapat diperiksa keasliannya oleh siapa pun tanpa login.</div></div>
      <button class="btn lg" id="lg-cek" style="width:100%">${ico('scan-line')} Cek Keaslian Surat (tanpa login)</button></div>
    <div><h2 style="font-size:24px;font-weight:600">Selamat Datang</h2><p class="muted" style="margin-bottom:6px">Pilih metode masuk yang sesuai.</p>
      ${pesan ? `<div class="alert err">${esc(pesan)}</div>` : ''}
      <div class="sec" style="padding-left:0">Metode utama • Akun Google</div>
      <div class="gbtn"><div id="g-btn" style="min-height:44px"></div></div>
      <div id="g-note" class="sm muted"></div>
      <div class="divider">Atau masuk dengan NIP</div>
      <div class="field"><label for="l-nip">NIP / Nama pengguna</label><input class="in" id="l-nip" autocomplete="username" placeholder="Contoh: 198009152005011002"></div>
      <div class="field"><label for="l-pw">Kata sandi</label><input class="in" id="l-pw" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi"></div>
      <div id="l-err" class="alert err hidden"></div>
      <button class="btn primary lg" id="l-go" style="width:100%">Masuk ke Sistem Persuratan</button>
      <p class="xs muted" style="margin-top:12px">Kata sandi hanya dibuat oleh admin. Lupa sandi? Hubungi admin untuk direset.</p></div></div></div>`);
  $('#lg-cek').onclick = () => tampilPublik();
  const gagal = m => { const e = $('#l-err'); e.textContent = pesanErr(m); e.classList.remove('hidden'); };
  const masuk = async () => {
    const b = $('#l-go'); b.disabled = true; $('#l-err').classList.add('hidden');
    const r = await api('loginNip', { nip: $('#l-nip').value, sandi: $('#l-pw').value });
    b.disabled = false;
    if (!r.success) return gagal(r.message);
    simpanSesi(r, 'nip'); await mulaiApp();
  };
  $('#l-go').onclick = masuk; $('#l-pw').onkeydown = e => { if (e.key === 'Enter') masuk(); };
  if (!cfg.success || !cfg.clientId) { $('#g-note').textContent = 'Login Google belum dikonfigurasi (GOOGLE_CLIENT_ID kosong).'; return; }
  let n = 0; const tunggu = setInterval(() => {
    if (window.google && google.accounts && google.accounts.id) {
      clearInterval(tunggu);
      google.accounts.id.initialize({ client_id: cfg.clientId, callback: async resp => {
        const r = await api('login', { idToken: resp.credential });
        if (!r.success) return gagal(r.message);
        simpanSesi(r, 'google'); await mulaiApp();
      } });
      google.accounts.id.renderButton($('#g-btn'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 300, locale: 'id' });
    } else if (++n > 100) { clearInterval(tunggu); $('#g-note').textContent = 'Layanan Google tidak termuat. Periksa koneksi internet.'; }
  }, 100);
}

async function mulaiApp() {
  tampil('boot');
  const r = await api('boot');
  if (!r.success) { const m = r.message; TOKEN = null; sessionStorage.removeItem('tok'); tampilLogin(pesanErr(m)); return false; }
  ST.profil = r.data.profil;
  if (ST.profil.wajibGanti) { tampil('login'); await ubahSandiWajib(); return mulaiApp(); }
  ST.menu = r.data.menu; ST.jenis = r.data.jenis || []; ST.dash = r.data.dashboard;
  bangunShell(); go('dashboard');
  return true;
}
function ubahSandiWajib() {
  return new Promise(res => {
    modal({ title: 'Ganti kata sandi sementara', sub: 'Demi keamanan, buat kata sandi baru sebelum melanjutkan.', body: `<div class="field"><label>Kata sandi sementara</label><input class="in" type="password" id="ps-l" autocomplete="current-password"></div><div class="field"><label>Kata sandi baru</label><input class="in" type="password" id="ps-b" autocomplete="new-password"><span class="hint">Minimal 8 karakter, memuat huruf dan angka.</span></div><div class="field"><label>Ulangi kata sandi baru</label><input class="in" type="password" id="ps-u" autocomplete="new-password"></div>`,
      footer: [{ label: 'Keluar', onClick: () => { keluar(); return true; } }, { label: 'Simpan & Lanjutkan', cls: 'primary', keep: true, onClick: async m => {
        if ($('#ps-b').value !== $('#ps-u').value) { toast('Kata sandi baru tidak sama.', 'err'); return false; }
        const r = await api('ubahSandi', { lama: $('#ps-l').value, baru: $('#ps-b').value });
        if (!r.success) { toast(pesanErr(r.message), 'err'); return false; }
        TOKEN = r.token; sessionStorage.setItem('tok', TOKEN); m.close(); res(); } }] });
  });
}

const ICON = { dashboard: 'layout-grid', ajukan: 'file-plus', riwayat: 'history', kelola: 'mail-open', suratmasuk: 'inbox', arsip: 'archive', template: 'file-text', nomor: 'list-ordered', laporan: 'bar-chart-3', verifikasi: 'badge-check', pengguna: 'users', instansi: 'building-2', log: 'scroll-text', bantuan: 'help-circle', cek: 'scan-line' };
function bangunShell() {
  tampil('app');
  const p = ST.profil;
  const nav = ST.menu.map(g => `<div class="sec">${esc(g.g)}</div>` + g.i.map(([k, l]) => `<button class="nav" data-menu="${k}">${ico(ICON[k] || 'circle')}<span>${esc(l)}</span></button>`).join('')).join('');
  render($('#app'), `<div class="frame">
    <aside class="side" id="side"><div class="brand"><div class="logo">${ico('mail-check')}</div><div><b>e-Surat</b><small>${esc(p.namaOrg)}</small></div></div>${nav}
      <div class="verify-card"><b>${ico('scan-line')}<span>Cek Keaslian Surat</span></b><p>Pindai atau masukkan kode verifikasi surat</p><button class="btn primary sm" style="width:100%" data-menu="cek">Buka Pengecekan</button></div></aside>
    <main class="main"><div class="topbar"><div class="tools"><button class="ibtn menu-btn" id="mb" aria-label="Menu">${ico('menu')}</button><span class="date">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })}</span></div>
      <div class="tools"><button class="ibtn" id="tb-s" aria-label="Cari arsip">${ico('search')}</button><button class="ibtn" id="tb-n" aria-label="Notifikasi">${ico('bell')}<span class="dot hidden" id="tb-dot"></span></button>
      <div class="user" id="tb-u" style="cursor:pointer"><div class="who"><b>${esc(p.nama || p.email)}</b><br><span class="role">${esc(ROLE_LABEL[p.role] || p.role)}</span></div><div class="avatar">${esc(initials(p.nama || p.email))}</div></div></div></div>
      <div id="view"></div></main></div>`);
  $$('[data-menu]').forEach(b => {
    b.onclick = () => go(b.dataset.menu);
    const pre = () => prefetch(b.dataset.menu);
    b.addEventListener('mouseenter', pre, { once: true }); b.addEventListener('touchstart', pre, { once: true, passive: true });
  });
  $('#mb').onclick = () => { const s = $('#side'); s.classList.toggle('open'); if (s.classList.contains('open')) { const sc = document.createElement('div'); sc.className = 'scrim'; sc.id = 'scrim'; sc.onclick = tutupDrawer; document.body.appendChild(sc); } else tutupDrawer(); };
  $('#tb-s').onclick = () => go('arsip');
  $('#tb-n').onclick = () => go(p.role === 'ADMIN' ? 'kelola' : p.role === 'PIMPINAN' ? 'verifikasi' : 'riwayat');
  $('#tb-u').onclick = menuUser;
  setDot();
}
function tutupDrawer() { const s = $('#side'); if (s) s.classList.remove('open'); const sc = $('#scrim'); if (sc) sc.remove(); }
function setDot() { const n = ST.dash && ST.dash.notif; const d = $('#tb-dot'); if (d) d.classList.toggle('hidden', !n); }
function menuUser() {
  const p = ST.profil;
  modal({ title: p.nama || p.email, sub: esc(p.email) + ' • ' + esc(ROLE_LABEL[p.role] || p.role), body: `<p class="muted">Anda masuk melalui ${ST.via === 'nip' ? 'NIP dan kata sandi' : 'akun Google'}.</p>`,
    footer: [ST.via === 'nip' && !p.darurat ? { label: 'Ubah Kata Sandi', icon: 'key-round', keep: true, onClick: m => { m.close(); ubahSandiMandiri(); return false; } } : null, { label: 'Keluar', cls: 'danger', icon: 'log-out', onClick: () => { keluar(); return true; } }].filter(Boolean) });
}
function ubahSandiMandiri() {
  modal({ title: 'Ubah Kata Sandi', body: `<div class="field"><label>Kata sandi lama</label><input class="in" type="password" id="ps-l" autocomplete="current-password"></div><div class="field"><label>Kata sandi baru</label><input class="in" type="password" id="ps-b" autocomplete="new-password"><span class="hint">Minimal 8 karakter, huruf dan angka.</span></div><div class="field"><label>Ulangi kata sandi baru</label><input class="in" type="password" id="ps-u" autocomplete="new-password"></div>`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      if ($('#ps-b').value !== $('#ps-u').value) { toast('Kata sandi baru tidak sama.', 'err'); return false; }
      const r = await api('ubahSandi', { lama: $('#ps-l').value, baru: $('#ps-b').value });
      if (!r.success) { toast(pesanErr(r.message), 'err'); return false; }
      TOKEN = r.token; sessionStorage.setItem('tok', TOKEN); toast('Kata sandi diperbarui.', 'ok'); } }] });
}

const PAGES = {};
let HALAMAN = '';
function go(key, params) {
  if (!PAGES[key]) return;
  hancurkanChart(); tutupDrawer(); HALAMAN = key;
  $$('.nav').forEach(b => b.classList.toggle('on', b.dataset.menu === key));
  const v = $('#view'); render(v, skel());
  window.scrollTo({ top: 0 });
  Promise.resolve(PAGES[key](v, params || {})).catch(e => { render(v, `<div class="card"><div class="alert err">Terjadi kesalahan: ${esc(e.message)}</div></div>`); });
}
function prefetch(key) {
  const peta = { riwayat: ['listRiwayat', { perPage: 10 }], kelola: ['listAntreanKelola', { status: 'SEMUA', perPage: 10 }], pengguna: ['listPengguna', { perPage: 10 }], arsip: ['listArsip', { perPage: 10 }], suratmasuk: ['listSuratMasuk', { status: 'SEMUA', perPage: 10 }], verifikasi: ['listAntreanVerifikasi', {}] };
  const x = peta[key]; if (x) swr(x[0], x[1], () => {});
}
const galatKartu = r => `<div class="card"><div class="alert err">${esc(pesanErr(r && r.message))}</div></div>`;

// =====================================================================
// DASHBOARD
// =====================================================================
const WARNA = ['#4B4FE8', '#B91C1C', '#D9DAE1', '#16A34A', '#F59E0B', '#0EA5E9'];
function gambarBar(canvas, g) {
  if (!window.Chart) return;
  Chart.defaults.font.family = "'Plus Jakarta Sans',sans-serif";
  CH.push(new Chart(canvas, { type: 'bar', data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'], datasets: [{ label: 'Diajukan', data: g.diajukan, backgroundColor: '#D9DAE1', borderRadius: 6, maxBarThickness: 18 }, { label: 'Terbit', data: g.terbit, backgroundColor: '#4B4FE8', borderRadius: 6, maxBarThickness: 18 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#ECEDF3' } } } } }));
}
function gambarDonut(canvas, per) {
  if (!window.Chart || !per.length) return;
  CH.push(new Chart(canvas, { type: 'doughnut', data: { labels: per.map(x => x.nama), datasets: [{ data: per.map(x => x.n), backgroundColor: per.map((_, i) => WARNA[i % WARNA.length]), borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } } }));
}
PAGES.dashboard = async (el) => {
  const p = ST.profil;
  const isi = (d) => {
    if (!d || !d.stat) return;
    ST.dash = d; setDot();
    const ik = ['file-text', 'clock', 'pen-line', 'badge-check'];
    const kartu = d.stat.map((s, i) => kpiCard(Object.assign({ ico: ik[i], label: s.k, num: s.n.toLocaleString('id-ID'), note: s.s, hl: i === 0 }, deltaChip(s.d)))).join('');
    const total = d.perJenis.reduce((a, x) => a + x.n, 0);
    const jenisList = d.perJenis.map((x, i) => `<div style="display:flex;justify-content:space-between;gap:8px;margin:8px 0"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${WARNA[i % WARNA.length]};margin-right:8px"></i>${esc(x.nama)}</span><b>${x.n} <span class="chip">${total ? Math.round(x.n * 100 / total) : 0}%</span></b></div>`).join('') || '<div class="empty">Belum ada data.</div>';
    let kanan = '';
    if (p.role === 'PIMPINAN') {
      kanan = `<div class="card"><div style="display:flex;justify-content:space-between"><h3>Antrean Verifikasi <span class="chip ind">${d.jumlahAntrean || 0}</span></h3></div><div class="sub" style="margin-bottom:12px">Pengajuan butuh tanda tangan Anda</div>${(d.antrean || []).map(s => `<div class="q-item" data-go="verifikasi"><div class="mono xs" style="color:var(--primary)">${esc(s.nomor || s.id)}</div><div class="bold">${esc(s.perihal)}</div><div class="sm muted">${esc(s.pemohon.nama)}</div></div>`).join('') || '<div class="empty">Tidak ada antrean.</div>'}<button class="btn" style="width:100%" data-go="verifikasi">Lihat Semua Antrean →</button></div>`;
    } else if (p.role === 'ADMIN') {
      kanan = `<div class="card"><h3>Asal Pengajuan</h3><div class="sub" style="margin-bottom:8px">Unit pemohon terbanyak</div>${(d.asal || []).map(a => `<div class="bar-row"><div style="display:flex;justify-content:space-between"><span>${esc(a.unit)}</span><b>${a.n}</b></div><div class="bar"><i style="width:${Math.round(a.n * 100 / (d.asal[0].n || 1))}%"></i></div></div>`).join('') || '<div class="empty">Belum ada data.</div>'}<button class="btn" style="width:100%;margin-top:10px" data-go="kelola">Buka Kelola Surat →</button></div>`;
    } else {
      kanan = `<div class="card"><h3>Pengajuan Terbaru</h3><div class="sub">Pantau status surat Anda</div><button class="btn primary" style="width:100%;margin-top:12px" data-go="riwayat">Lihat Riwayat Pengajuan →</button></div>`;
    }
    render(el, `${pageHead('Ringkasan Persuratan', 'Pantau alur administrasi, penerbitan surat resmi, dan persetujuan pimpinan secara terpadu.', `<span class="chip" style="background:#fff;border:1px solid var(--line)">● Sistem sinkron</span><button class="btn primary" data-go="ajukan">${ico('plus-circle')} Ajukan Surat Baru</button>`)}
      <div class="grid g-dash" style="margin-top:16px"><div class="grid" style="gap:16px">
        <div class="grid g2">${kartu}</div>
        <div class="card"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px"><div><h3>Statistik Surat per Bulan <span class="chip ind">Bulanan</span></h3><div class="sub">Perbandingan pengajuan masuk vs surat resmi terbit tahun ${esc(d.tahun)}</div></div></div><div class="chart-box" style="margin-top:12px"><canvas id="c-bar" role="img" aria-label="Grafik surat per bulan"></canvas></div>
          <div class="legend" style="margin-top:10px;justify-content:space-between"><span><i style="background:#D9DAE1"></i>Diajukan <i style="background:#4B4FE8;margin-left:14px"></i>Terbit Resmi</span><span>Efisiensi penerbitan: <b style="color:var(--ink)">${d.efisiensi}%</b></span></div></div></div>
        <div class="grid" style="gap:16px"><div class="card"><h3>Surat per Jenis</h3><div class="sub">Distribusi format dokumen aktif</div><div class="chart-box" style="height:180px;margin:12px 0"><canvas id="c-donut" role="img" aria-label="Distribusi jenis surat"></canvas></div>${jenisList}</div>${kanan}</div></div>`);
    gambarBar($('#c-bar'), d.grafik); gambarDonut($('#c-donut'), d.perJenis);
    $$('[data-go]', el).forEach(b => b.onclick = () => go(b.dataset.go));
  };
  isi(ST.dash);
  const r = await api('getDashboard');
  if (r.success && HALAMAN === 'dashboard' && JSON.stringify(r.data) !== JSON.stringify(ST.dash)) { hancurkanChart(); isi(r.data); }
};

// =====================================================================
// AJUKAN SURAT (3 langkah: jenis → formulir & pratinjau → terkirim)
// =====================================================================
PAGES.ajukan = async (el, params) => {
  if (!ST.jenis.length) { const r = await api('listTemplate'); if (r.success) ST.jenis = r.rows.filter(t => t.aktif); }
  const stepBar = n => `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h3>Pengajuan Surat Resmi Baru</h3><div class="sub">Isi formulir dengan tepat agar diproses ke tahap persetujuan.</div></div><div class="steps"><span class="step ${n > 1 ? 'done' : 'on'}">1. Pilih Jenis</span><span class="step ${n === 2 ? 'on' : n > 2 ? 'done' : ''}">2. Formulir & Pratinjau</span><span class="step ${n === 3 ? 'on' : ''}">3. Verifikasi Pimpinan</span></div></div>`;
  const pilih = () => {
    render(el, `<div class="grid">${stepBar(1)}<div class="grid g4" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">${ST.jenis.map(t => `<div class="card jenis-card" data-k="${esc(t.kode)}"><span class="code">${esc(t.kode)}</span><h3>${esc(t.nama)}</h3><div class="sub" style="margin-top:4px">${esc(t.deskripsi || '')}</div></div>`).join('') || '<div class="card empty">Belum ada jenis surat yang tersedia. Hubungi admin.</div>'}</div></div>`);
    $$('.jenis-card', el).forEach(c => c.onclick = () => form(c.dataset.k));
  };
  const form = async (kode, awal) => {
    const tpl = ST.jenis.find(t => t.kode === kode); if (!tpl) return pilih();
    await muatCtx(perluCtx(tpl.isian));
    const kd = 'draf_' + ST.profil.email + '_' + kode; let nilai = awal || null;
    if (!nilai) { try { nilai = JSON.parse(localStorage.getItem(kd) || 'null'); if (nilai) toast('Draf tersimpan dimuat.'); } catch (e) { nilai = null; } }
    render(el, `<div class="grid">${stepBar(2)}
      <div class="hl-box"><div class="ic">${ico('clipboard-check')}</div><div style="flex:1"><div class="bold" style="font-size:18px">${esc(tpl.nama)} <span class="chip" style="background:rgba(255,255,255,.2);color:#fff">${esc(tpl.kode)}</span></div><div class="sm" style="opacity:.9">${esc(tpl.deskripsi || '')}</div></div><button class="btn sm" id="gt">${ico('repeat')} Ganti Jenis</button></div>
      <div class="split"><div class="card" id="fm">${fieldsHtml(tpl.isian, nilai, 'a')}
        <div class="field"><label>Lampiran Berkas Pendukung (opsional)</label>${dropzone('a-lamp')}</div>
        <div id="a-err" class="alert err hidden"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end"><button class="btn" id="a-batal">Batal</button><button class="btn" id="a-draf">${ico('bookmark')} Simpan Draf</button><button class="btn primary lg" id="a-kirim">Ajukan Surat Sekarang ${ico('send')}</button></div></div>
        <div><div class="sec" style="padding-left:0">● Pratinjau dokumen dinamis</div><div id="a-prev"></div></div></div></div>`);
    wireDrop('a-lamp');
    const prev = () => { $('#a-prev').innerHTML = previewIsianHtml(tpl, bacaIsian($('#fm'), tpl.isian)); };
    prev(); $('#fm').addEventListener('input', prev); $('#fm').addEventListener('change', prev);
    $('#gt').onclick = pilih; $('#a-batal').onclick = () => go('dashboard');
    $('#a-draf').onclick = () => { try { localStorage.setItem(kd, JSON.stringify(bacaIsian($('#fm'), tpl.isian))); toast('Draf disimpan di perangkat ini.', 'ok'); } catch (e) { toast('Draf tidak dapat disimpan.', 'err'); } };
    $('#a-kirim').onclick = async () => {
      const data = bacaIsian($('#fm'), tpl.isian), err = cekWajib(tpl.isian, data), box = $('#a-err');
      if (err) { box.textContent = err; box.classList.remove('hidden'); return; }
      box.classList.add('hidden');
      let lamp = null; try { lamp = await lampiranDari($('#a-lamp')); } catch (e) { box.textContent = e.message; box.classList.remove('hidden'); return; }
      const b = $('#a-kirim'); b.disabled = true; b.innerHTML = '<span class="spin"></span> Mengirim…';
      const r = await api('ajukan', { jenis: kode, data, lampiran: lamp });
      if (!r.success) { b.disabled = false; b.innerHTML = 'Ajukan Surat Sekarang'; box.textContent = pesanErr(r.message); box.classList.remove('hidden'); return; }
      try { localStorage.removeItem(kd); } catch (e) { /* abaikan */ }
      render(el, `<div class="grid">${stepBar(3)}<div class="card" style="text-align:center;padding:40px 20px"><div class="chip up" style="font-size:13px;padding:6px 14px">${ico('check')} Pengajuan terkirim</div><h2 style="margin:14px 0 4px">Nomor registrasi <span class="mono" style="color:var(--primary)">${esc(r.id)}</span></h2><p class="muted">Admin akan memberi nomor surat, lalu pimpinan memverifikasi dan menandatangani. Anda dapat memantau statusnya di Riwayat Pengajuan.</p><div style="margin-top:18px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button class="btn" id="a-lagi">Ajukan Lagi</button><button class="btn primary" id="a-riw">Lihat Riwayat</button></div></div></div>`);
      $('#a-lagi').onclick = pilih; $('#a-riw').onclick = () => go('riwayat');
    };
  };
  if (params.jenis) form(params.jenis, params.nilai); else pilih();
};

// =====================================================================
// RIWAYAT PENGAJUAN & DETAIL SURAT
// =====================================================================
async function detailSurat(id) {
  const m = modal({ title: 'Detail Surat', body: '<div class="skel big"></div>', wide: true, footer: [{ label: 'Tutup', onClick: () => true }] });
  const r = await api('getPengajuan', { id });
  if (!r.success) { m.setBody(`<div class="alert err">${esc(pesanErr(r.message))}</div>`); return; }
  const s = r.surat, p = ST.profil;
  await muatCtx(perluCtx(s.isian));
  const data = s.isian.map(f => { const v = s.data[f.tag]; let t = ''; if (v && typeof v === 'object') t = v.nama || ''; else if (f.tipe === 'date') t = fdate(v); else t = v || ''; return `<dt class="muted">${esc(f.label)}</dt><dd style="margin:0 0 8px;white-space:pre-wrap">${esc(t) || '—'}</dd>`; }).join('');
  const tl = r.riwayat.map(x => `<div><b>${esc(x.aksi)}</b> <span class="muted sm">• ${fdt(x.waktu)}</span><div class="sm muted">${esc(x.email)} ${x.detail ? '— ' + esc(x.detail) : ''}</div></div>`).join('') || '<div class="muted">Belum ada riwayat.</div>';
  m.setBody(`<div class="split"><div><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">${badge(s.status)} <span class="mono sm">${esc(s.nomor || 'Belum bernomor')}</span> <span class="mono xs muted">#${esc(s.id)}</span></div>
      <div class="sm muted">Jenis</div><div class="bold" style="margin-bottom:8px">${esc(s.namaJenis)}</div><div class="sm muted">Pemohon</div><div class="bold" style="margin-bottom:12px">${esc(s.pemohon.nama)} <span class="muted sm">${esc(s.pemohon.unit)}</span></div>
      ${s.catatanPenolakan ? `<div class="alert err">${ico('alert-circle')}<div><b>Catatan:</b> ${esc(s.catatanPenolakan)}</div></div>` : ''}
      <dl style="margin:0">${data}</dl></div>
      <div><div class="sec" style="padding-left:0">Riwayat & jejak audit</div><div class="tl">${tl}</div></div></div>`);
  const f = $('.modal-f', m.el); f.innerHTML = '';
  const tambah = (label, cls, ikon, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = ico(ikon) + esc(label); b.onclick = () => fn(b); f.appendChild(b); };
  tambah('Tutup', '', 'x', () => m.close());
  if ((p.role === 'ADMIN' || p.role === 'PIMPINAN') && (s.status === 'TERBIT' || s.status === 'MENUNGGU_VERIFIKASI')) tambah('Pratinjau PDF', '', 'eye', () => pratinjauPdf(s.id, s.nomor || s.id));
  if (s.bisaUnduh) tambah('Unduh PDF', 'primary', 'download', b => unduh('fetchPdf', { id: s.id }, b));
  if (p.role === 'ADMIN' && s.status === 'TERBIT') tambah('Batalkan Surat', 'danger', 'ban', () => promptModal('Batalkan surat ' + (s.nomor || ''), 'Alasan pembatalan', async v => { const x = await api('batalkanSurat', { id: s.id, alasan: v }); if (!x.success) { toast(pesanErr(x.message), 'err'); return false; } toast('Surat dibatalkan.', 'ok'); m.close(); if (HALAMAN) go(HALAMAN); }, { tombol: 'Batalkan Surat' }));
  refreshIcons();
}

PAGES.riwayat = async (el) => {
  const S = { status: '', q: '', jenis: '', tahun: '', page: 1 };
  const muat = async () => {
    const box = $('#rw-box'); if (!box) return;
    await swr('listRiwayat', { status: S.status, q: S.q, jenis: S.jenis, tahun: S.tahun, page: S.page, perPage: 5 }, (r) => {
      if (!$('#rw-box')) return;
      if (!r.success) return render($('#rw-box'), `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
      const k = r.ringkas;
      $('#rw-kpi').innerHTML = [kpiCard({ ico: 'mail', label: 'Total Permohonan', num: String(k.total).padStart(2, '0'), note: 'semua kategori', hl: true }), kpiCard({ ico: 'hourglass', label: 'Menunggu & Diproses', num: String(k.proses).padStart(2, '0'), note: 'dalam antrean' }), kpiCard({ ico: 'badge-check', label: 'Surat Terbit (Sah)', num: String(k.terbit).padStart(2, '0'), note: 'siap unduh' }), kpiCard({ ico: 'alert-triangle', label: 'Ditolak / Dibatalkan', num: String(k.ditolak).padStart(2, '0'), note: 'periksa catatan' })].join('');
      const rows = r.rows.map(s => [`<div class="mono t1" style="color:${s.nomor ? 'var(--primary)' : 'var(--muted)'}">${esc(s.nomor || 'Belum bernomor')}</div><div class="mono t2">#${esc(s.id)}</div>`, `<span class="chip ind">${esc(s.namaJenis)}</span>`,
        `<div class="t1">${esc(s.perihal)}</div>${s.catatanPenolakan ? `<div class="alert err" style="margin:6px 0 0;padding:8px 10px;font-size:12px">Catatan: ${esc(s.catatanPenolakan)}</div>` : ''}`, `<div>${fdate(s.tanggal)}</div>`, badge(s.status),
        `<div class="acts"><button class="rbtn" data-d="${esc(s.id)}" title="Lihat detail">${ico('eye')}</button>${s.bisaUnduh ? `<button class="btn primary sm" data-u="${esc(s.id)}">${ico('download')} PDF</button>` : ''}${(s.status === 'DITOLAK' || s.status === 'DIBATALKAN') ? `<button class="btn sm" data-r="${esc(s.jenis)}">${ico('rotate-ccw')} Ajukan Ulang</button>` : ''}</div>`]);
      render($('#rw-box'), tabel(['No. Surat / Registrasi', 'Jenis', 'Perihal', 'Tanggal', 'Status', 'Aksi'], rows) + pagerHtml(r));
      const box2 = $('#rw-box'); wirePager(box2, p => { S.page = p; muat(); });
      $$('[data-d]', box2).forEach(b => b.onclick = () => detailSurat(b.dataset.d));
      $$('[data-u]', box2).forEach(b => b.onclick = () => unduh('fetchPdf', { id: b.dataset.u }, b));
      $$('[data-r]', box2).forEach(b => b.onclick = () => go('ajukan', { jenis: b.dataset.r }));
    });
  };
  render(el, `${pageHead('Riwayat Pengajuan Surat', 'Pantau status permohonan surat, lacak proses verifikasi berjenjang, dan unduh berkas PDF bertanda tangan digital resmi.', `<button class="btn primary" data-go="ajukan">${ico('plus-circle')} Ajukan Surat Baru</button>`)}
    <div class="grid g4" id="rw-kpi" style="margin:16px 0"></div>
    <div class="card"><div class="toolbar"><div class="tabs">${[['', 'Semua'], ['TERBIT', 'Terbit'], ['PROSES', 'Proses'], ['DITOLAK', 'Ditolak']].map(([v, l]) => `<button class="tab ${S.status === v ? 'on' : ''}" data-s="${v}">${l}</button>`).join('')}</div>
      <div class="search">${ico('search')}<input id="rw-q" placeholder="Cari nomor surat, perihal…"></div>
      <select class="in" id="rw-j" style="width:200px"><option value="">Semua Jenis Surat</option>${ST.jenis.map(t => `<option value="${esc(t.kode)}">${esc(t.nama)}</option>`).join('')}</select>
      <input class="in" id="rw-t" style="width:110px" placeholder="Tahun" maxlength="4" inputmode="numeric"></div><div id="rw-box">${'<div class="skel big"></div>'}</div></div>`);
  $$('[data-go]', el).forEach(b => b.onclick = () => go(b.dataset.go));
  $$('.tab', el).forEach(t => t.onclick = () => { S.status = t.dataset.s; S.page = 1; $$('.tab', el).forEach(x => x.classList.toggle('on', x === t)); muat(); });
  $('#rw-q').oninput = debounce(e => { S.q = e.target.value; S.page = 1; muat(); });
  $('#rw-j').onchange = e => { S.jenis = e.target.value; S.page = 1; muat(); };
  $('#rw-t').oninput = debounce(e => { S.tahun = e.target.value.trim(); S.page = 1; muat(); });
  muat();
};

// =====================================================================
// KELOLA SURAT (Admin): antrean, proses & penomoran, buat langsung
// =====================================================================
async function pejabatUntuk(jenis) {
  if (!CTX.pejabat) { const r = await api('listPejabat'); CTX.pejabat = r.success ? r.rows : []; }
  return CTX.pejabat.filter(p => { const j = String(p.jenis || '').split(',').map(x => x.trim()); return j.includes('*') || j.includes(jenis); });
}
const opsiPejabat = (list, pilih) => `<option value="">— pilih pejabat —</option>` + list.map(p => `<option value="${esc(p.email)}" ${p.email === pilih ? 'selected' : ''}>${esc(p.nama)} (${esc(p.jabatan)})</option>`).join('');
const unduhLampiran = (id, tombol) => unduh('fetchLampiranPengajuan', { id }, tombol);

async function prosesModal(id, setelah) {
  const m = modal({ title: 'Proses & Penomoran Surat', sub: `<span class="mono" style="color:var(--primary)">ID: #${esc(id)}</span>`, wide: true, body: '<div class="skel big"></div>' });
  const r = await api('getPengajuan', { id });
  if (!r.success) { m.setBody(`<div class="alert err">${esc(pesanErr(r.message))}</div>`); return; }
  const s = r.surat; await muatCtx(perluCtx(s.isian));
  const pj = await pejabatUntuk(s.jenis);
  m.setBody(`<div class="split"><div>
      <div class="card" style="background:var(--frame);box-shadow:none;margin-bottom:14px"><b>${esc(s.pemohon.nama)}</b><div class="sm muted">${esc(s.pemohon.email)}</div><div class="sm">${esc(s.pemohon.unit)}</div></div>
      <div class="field"><label>Jenis Template Surat</label><input class="in" value="${esc(s.namaJenis)}" disabled></div>
      <div class="field"><label>Pejabat Penandatangan (TTE Pimpinan) <span class="req">*</span></label><select class="in" id="pm-pj">${opsiPejabat(pj, s.pejabatEmail)}</select>${pj.length ? '' : '<span class="hint" style="color:var(--bad-fg)">Belum ada pejabat berwenang untuk jenis ini. Atur di menu Template.</span>'}</div>
      <div class="field"><label>Tanggal Surat</label><input type="date" class="in" id="pm-tgl" value="${esc(s.tglSurat || todayStr())}"></div>
      <div class="field"><label>Catatan Admin (internal)</label><textarea class="in" id="pm-cat" style="min-height:70px" maxlength="500">${esc(s.catatanAdmin || '')}</textarea></div>
      ${s.adaLampiran ? `<button class="btn" id="pm-lamp">${ico('paperclip')} Buka lampiran pemohon</button>` : '<div class="sm muted">Tidak ada lampiran dari pemohon.</div>'}
    </div><div><div class="sec" style="padding-left:0">Detail penugasan dokumen</div><div id="pm-f">${fieldsHtml(s.isian, s.data, 'p')}</div></div></div>`);
  const lamp = $('#pm-lamp', m.el); if (lamp) lamp.onclick = () => unduhLampiran(id, lamp);
  const kumpul = () => ({ id, data: bacaIsian($('#pm-f', m.el), s.isian), pejabatEmail: $('#pm-pj', m.el).value, tglSurat: $('#pm-tgl', m.el).value, catatanAdmin: $('#pm-cat', m.el).value });
  const f = $('.modal-f', m.el) || (() => { const d = document.createElement('div'); d.className = 'modal-f'; $('.modal', m.el).appendChild(d); return d; })();
  f.innerHTML = '';
  const btn = (label, cls, ikon, fn, keep) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.innerHTML = ico(ikon) + esc(label); b.onclick = async () => { b.disabled = true; const old = b.innerHTML; b.innerHTML = '<span class="spin"></span>'; try { await fn(); } finally { if (document.body.contains(b)) { b.disabled = false; b.innerHTML = old; refreshIcons(); } } }; f.appendChild(b); };
  btn('Tolak Pengajuan', 'danger', 'x-circle', () => { promptModal('Tolak pengajuan ' + id, 'Alasan penolakan (dilihat pemohon)', async v => { const x = await api('tolakAdmin', { id, alasan: v }); if (!x.success) { toast(pesanErr(x.message), 'err'); return false; } toast('Pengajuan ditolak.', 'ok'); m.close(); setelah && setelah(); }, { tombol: 'Tolak Pengajuan' }); });
  btn('Simpan Draf', '', 'save', async () => { const x = await api('simpanPerbaikan', kumpul()); if (!x.success) return toast(pesanErr(x.message), 'err'); toast('Perubahan disimpan.', 'ok'); setelah && setelah(); });
  btn('Beri Nomor & Kirim ke Pimpinan', 'primary', 'send', async () => {
    const k = kumpul(); const e = cekWajib(s.isian, k.data); if (e) return toast(e, 'err'); if (!k.pejabatEmail) return toast('Pilih pejabat penandatangan.', 'err');
    const x = await api('prosesDanNomori', k); if (!x.success) return toast(pesanErr(x.message), 'err');
    toast('Nomor ' + x.nomor + ' diberikan. Surat dikirim ke pimpinan.', 'ok'); m.close(); setelah && setelah();
  });
  refreshIcons();
}
async function buatLangsungModal(setelah) {
  const m = modal({ title: 'Buat Surat Langsung', sub: 'Admin membuat surat tanpa pengajuan pemohon.', body: `<div class="field"><label>Jenis Surat</label><select class="in" id="bl-j"><option value="">— pilih —</option>${ST.jenis.map(t => `<option value="${esc(t.kode)}">${esc(t.nama)}</option>`).join('')}</select></div><div id="bl-f"></div>` });
  const f = document.createElement('div'); f.className = 'modal-f'; $('.modal', m.el).appendChild(f);
  let tpl = null;
  $('#bl-j', m.el).onchange = async e => {
    tpl = ST.jenis.find(t => t.kode === e.target.value); if (!tpl) { $('#bl-f', m.el).innerHTML = ''; return; }
    await muatCtx(perluCtx(tpl.isian)); const pj = await pejabatUntuk(tpl.kode);
    $('#bl-f', m.el).innerHTML = fieldsHtml(tpl.isian, {}, 'b') + `<div class="field"><label>Pejabat Penandatangan <span class="req">*</span></label><select class="in" id="bl-pj">${opsiPejabat(pj, '')}</select></div>`;
  };
  const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Buat & Kirim ke Pimpinan';
  b.onclick = async () => {
    if (!tpl) return toast('Pilih jenis surat.', 'err'); const data = bacaIsian($('#bl-f', m.el), tpl.isian), e = cekWajib(tpl.isian, data); if (e) return toast(e, 'err');
    const pe = $('#bl-pj', m.el).value; if (!pe) return toast('Pilih pejabat.', 'err');
    b.disabled = true; b.innerHTML = '<span class="spin"></span>';
    const r = await api('buatLangsung', { jenis: tpl.kode, data, pejabatEmail: pe });
    b.disabled = false; b.textContent = 'Buat & Kirim ke Pimpinan';
    if (!r.success) return toast(pesanErr(r.message), 'err');
    toast('Surat ' + r.nomor + ' dibuat dan dikirim ke pimpinan.', 'ok'); m.close(); setelah && setelah();
  };
  f.appendChild(b);
}

PAGES.kelola = async (el) => {
  const S = { status: 'SEMUA', q: '', page: 1 };
  const TABS = [['SEMUA', 'Semua'], ['DIAJUKAN', 'Diajukan'], ['DIPROSES', 'Diproses'], ['MENUNGGU_VERIFIKASI', 'Menunggu Verifikasi'], ['TERBIT', 'Terbit'], ['DITOLAK', 'Ditolak']];
  const muat = () => swr('listAntreanKelola', { status: S.status, q: S.q, page: S.page, perPage: 8 }, r => {
    const box = $('#kl-box'); if (!box) return;
    if (!r.success) return render(box, `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
    $('#kl-tabs').innerHTML = TABS.map(([v, l]) => `<button class="tab ${S.status === v ? 'on' : ''}" data-s="${v}">${l} <span class="n">${r.hitung[v] || 0}</span></button>`).join('');
    $$('#kl-tabs .tab').forEach(t => t.onclick = () => { S.status = t.dataset.s; S.page = 1; muat(); });
    const rows = r.rows.map(s => [`<div class="mono t1" style="color:${s.nomor ? 'var(--primary)' : 'var(--muted)'}">${esc(s.nomor || 'Belum bernomor')}</div><div class="mono t2">${esc(s.id)}${s.statusNomor === 'BATAL' ? ' • <span style="color:var(--bad-fg)">nomor BATAL</span>' : ''}</div>`, `<span class="chip ind">${esc(s.namaJenis)}</span>`, `<div class="t1">${esc(s.pemohon.nama)}</div><div class="t2">${esc(s.pemohon.unit)}</div>`, `<div class="t1">${esc(s.perihal)}</div>`, fdate(s.tanggal), badge(s.status),
      `<div class="acts"><button class="rbtn" data-d="${esc(s.id)}" title="Detail">${ico('eye')}</button>${['DIAJUKAN', 'DIPROSES'].includes(s.status) ? `<button class="btn primary sm" data-p="${esc(s.id)}">Proses</button>` : ''}</div>`]);
    render(box, tabel(['No. Pengajuan / Nomor', 'Jenis', 'Pemohon & Unit', 'Perihal', 'Tanggal', 'Status', ''], rows) + pagerHtml(r));
    wirePager(box, p => { S.page = p; muat(); });
    $$('[data-d]', box).forEach(b => b.onclick = () => detailSurat(b.dataset.d));
    $$('[data-p]', box).forEach(b => b.onclick = () => prosesModal(b.dataset.p, () => go('kelola')));
  });
  render(el, `${pageHead('Kelola & Penomoran Surat', 'Kelola antrean pengajuan surat, periksa berkas, berikan nomor resmi otomatis, lalu teruskan ke pimpinan.', `<button class="btn primary" id="kl-new">${ico('file-plus')} Buat Surat Langsung</button>`)}
    <div class="card" style="margin-top:16px"><div class="tabs" id="kl-tabs" style="margin-bottom:12px"></div><div class="toolbar"><div class="search">${ico('search')}<input id="kl-q" placeholder="Cari nomor surat, nama pemohon, atau perihal…"></div></div><div id="kl-box"><div class="skel big"></div></div></div>`);
  $('#kl-q').oninput = debounce(e => { S.q = e.target.value; S.page = 1; muat(); });
  $('#kl-new').onclick = () => buatLangsungModal(() => go('kelola'));
  muat();
};

// =====================================================================
// VERIFIKASI SURAT (Pimpinan)
// =====================================================================
PAGES.verifikasi = async (el) => {
  const r = await api('listAntreanVerifikasi');
  if (!r.success) return render(el, galatKartu(r));
  let rows = r.rows, sel = rows[0] ? rows[0].id : null;
  const tampilkan = async () => {
    const s = rows.find(x => x.id === sel);
    $('#vf-list').innerHTML = rows.map(x => `<div class="q-item ${x.id === sel ? 'on' : ''}" data-i="${esc(x.id)}"><div style="display:flex;justify-content:space-between;gap:6px"><span class="chip ind">${esc(x.namaJenis)}</span><span class="xs muted">${fdt(x.tanggal)}</span></div><div class="mono xs" style="color:var(--primary);margin-top:6px">${esc(x.nomor)}</div><div class="bold">${esc(x.perihal)}</div><div class="sm muted">${esc(x.pemohon.nama)} • ${esc(x.pemohon.unit)}</div></div>`).join('') || '<div class="empty">Tidak ada surat yang menunggu verifikasi.</div>';
    $$('#vf-list [data-i]').forEach(q => q.onclick = () => { sel = q.dataset.i; tampilkan(); });
    const pane = $('#vf-pane');
    if (!s) { pane.innerHTML = '<div class="card empty">Pilih surat dari antrean.</div>'; return; }
    pane.innerHTML = `<div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><span class="badge b-MENUNGGU_VERIFIKASI">Menunggu TTD Pimpinan</span><span class="mono sm">${esc(s.nomor)}</span></div><div id="vf-pdf"><div class="skel big"></div></div>
      <label style="display:flex;gap:10px;align-items:flex-start;margin:14px 0"><input type="checkbox" id="vf-cek" style="margin-top:3px"> <span class="sm">Saya menyatakan telah memeriksa keabsahan surat ini dan menyetujui penerbitannya secara digital.</span></label>
      <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end"><button class="btn danger" id="vf-tolak">${ico('x')} Tolak dengan Catatan</button><button class="btn primary lg" id="vf-ok" disabled>${ico('shield-check')} Setujui & Bubuhkan TTE</button></div></div>`;
    refreshIcons();
    $('#vf-cek').onchange = e => { $('#vf-ok').disabled = !e.target.checked; };
    api('fetchPdf', { id: s.id, pratinjau: true }).then(x => { if (sel !== s.id || !$('#vf-pdf')) return; if (!x.success) return render($('#vf-pdf'), `<div class="alert err">${esc(pesanErr(x.message))}</div>`); $('#vf-pdf').innerHTML = `<iframe class="pdf-frame" src="${URL.createObjectURL(b64ToBlob(x.base64, 'application/pdf'))}" title="Pratinjau surat"></iframe>`; });
    const selesai = () => { MC.clear(); go('verifikasi'); };
    $('#vf-ok').onclick = async e => { const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin"></span> Menerbitkan…'; const x = await api('setujuiTTE', { id: s.id }); if (!x.success) { b.disabled = false; b.innerHTML = 'Setujui & Bubuhkan TTE'; return toast(pesanErr(x.message), 'err'); } toast('Surat ' + x.nomor + ' diterbitkan.', 'ok'); selesai(); };
    $('#vf-tolak').onclick = () => promptModal('Tolak surat ' + s.nomor, 'Catatan untuk pemohon dan admin', async v => { const x = await api('tolakPimpinan', { id: s.id, catatan: v }); if (!x.success) { toast(pesanErr(x.message), 'err'); return false; } toast('Surat ditolak dengan catatan.', 'ok'); selesai(); }, { tombol: 'Tolak dengan Catatan' });
  };
  render(el, `${pageHead('Verifikasi Surat', 'Periksa pratinjau surat, lalu setujui untuk membubuhkan tanda tangan, stempel, dan QR keaslian secara otomatis.', `<span class="chip ind">${rows.length} menunggu</span>`)}
    <div class="grid" style="grid-template-columns:minmax(260px,340px) 1fr;margin-top:16px;align-items:start"><div class="card"><h3>Antrean Surat</h3><div class="sub" style="margin-bottom:12px">Urut dari yang paling lama</div><div id="vf-list"></div></div><div id="vf-pane"></div></div>`);
  if (window.innerWidth < 900) $('#vf-list').parentElement.parentElement.style.gridTemplateColumns = '1fr';
  tampilkan();
};

// =====================================================================
// SURAT MASUK
// =====================================================================
PAGES.suratmasuk = async (el) => {
  const adm = ST.profil.role === 'ADMIN';
  const S = { status: 'SEMUA', q: '', page: 1 };
  const TABS = [['SEMUA', 'Semua'], ['DITERIMA', 'Diterima'], ['DIDISPOSISIKAN', 'Didisposisikan'], ['SELESAI', 'Selesai']];
  const muat = () => swr('listSuratMasuk', { status: S.status, q: S.q, page: S.page, perPage: 8 }, r => {
    const box = $('#sm-box'); if (!box) return;
    if (!r.success) return render(box, `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
    $('#sm-tabs').innerHTML = TABS.map(([v, l]) => `<button class="tab ${S.status === v ? 'on' : ''}" data-s="${v}">${l} <span class="n">${r.hitung[v] || 0}</span></button>`).join('');
    $$('#sm-tabs .tab').forEach(t => t.onclick = () => { S.status = t.dataset.s; S.page = 1; muat(); });
    const rows = r.rows.map(m => [`<div class="mono t1" style="color:var(--primary)">${esc(m.noAgenda)}</div><div class="t2">${fdate(m.tglTerima)}</div>`, `<div class="t1">${esc(m.instansi)}</div><div class="t2 mono">${esc(m.noSuratAsal)}</div>`, `<div class="t1">${esc(m.perihal)}</div>${m.tujuan ? `<div class="t2">Disposisi: ${esc(m.tujuan)}${m.catatan ? ' — ' + esc(m.catatan) : ''}</div>` : (m.catatan ? `<div class="t2">${esc(m.catatan)}</div>` : '')}`, `<span class="chip ${m.sifat === 'SEGERA' ? 'down' : m.sifat === 'PENTING' ? '' : 'in'}">${esc(m.sifat)}</span>`, badge(m.status),
      `<div class="acts">${m.adaLampiran ? `<button class="rbtn" data-l="${esc(m.id)}" title="Buka lampiran">${ico('paperclip')}</button>` : ''}${m.status !== 'SELESAI' ? `<button class="btn sm" data-dp="${esc(m.id)}">Disposisi</button>` : ''}${adm && m.status !== 'SELESAI' ? `<button class="btn primary sm" data-sl="${esc(m.id)}">Selesai</button>` : ''}</div>`]);
    render(box, tabel(['Agenda / Diterima', 'Pengirim & No. Asal', 'Perihal', 'Sifat', 'Status', ''], rows) + pagerHtml(r));
    wirePager(box, p => { S.page = p; muat(); });
    $$('[data-l]', box).forEach(b => b.onclick = () => unduh('fetchLampiranMasuk', { id: b.dataset.l }, b));
    $$('[data-sl]', box).forEach(b => b.onclick = async () => { const x = await api('selesaiSuratMasuk', { id: b.dataset.sl }); if (!x.success) return toast(pesanErr(x.message), 'err'); toast('Ditandai selesai.', 'ok'); muat(); });
    $$('[data-dp]', box).forEach(b => b.onclick = () => disposisiModal(b.dataset.dp, muat));
  });
  render(el, `${pageHead('Surat Masuk', 'Catat surat yang diterima, simpan lampiran pindaiannya, dan teruskan lewat disposisi.', adm ? `<button class="btn primary" id="sm-new">${ico('plus-circle')} Catat Surat Masuk</button>` : '')}
    <div class="card" style="margin-top:16px"><div class="tabs" id="sm-tabs" style="margin-bottom:12px"></div><div class="toolbar"><div class="search">${ico('search')}<input id="sm-q" placeholder="Cari agenda, nomor asal, pengirim, perihal…"></div></div><div id="sm-box"><div class="skel big"></div></div></div>`);
  $('#sm-q').oninput = debounce(e => { S.q = e.target.value; S.page = 1; muat(); });
  if (adm) $('#sm-new').onclick = () => catatMasukModal(muat);
  muat();
};
async function catatMasukModal(setelah) {
  await muatCtx(['instansi']);
  modal({ title: 'Catat Surat Masuk', wide: false, body: `<div class="field"><label>Pengirim (Instansi) <span class="req">*</span></label><select class="in" id="sm-ins"><option value="">— pilih —</option>${(CTX.instansi || []).map(i => `<option value="${esc(i.id)}">${esc(i.nama)}</option>`).join('')}</select><span class="hint">Belum ada? Tambahkan di menu Instansi.</span></div>
    <div class="row2"><div class="field"><label>Nomor Surat Asal <span class="req">*</span></label><input class="in" id="sm-no" maxlength="100"></div><div class="field"><label>Sifat</label><select class="in" id="sm-sf"><option>BIASA</option><option>PENTING</option><option>SEGERA</option></select></div></div>
    <div class="row2"><div class="field"><label>Tanggal Surat <span class="req">*</span></label><input type="date" class="in" id="sm-ts"></div><div class="field"><label>Tanggal Diterima</label><input type="date" class="in" id="sm-tt" value="${todayStr()}"></div></div>
    <div class="field"><label>Perihal <span class="req">*</span></label><textarea class="in" id="sm-pr" style="min-height:80px" maxlength="300"></textarea></div><div class="field"><label>Lampiran Pindaian (opsional)</label>${dropzone('sm-lamp')}</div>`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      let lamp = null; try { lamp = await lampiranDari($('#sm-lamp')); } catch (e) { toast(e.message, 'err'); return false; }
      const r = await api('catatSuratMasuk', { instansiId: $('#sm-ins').value, noSuratAsal: $('#sm-no').value, sifat: $('#sm-sf').value, tglSurat: $('#sm-ts').value, tglTerima: $('#sm-tt').value, perihal: $('#sm-pr').value, lampiran: lamp });
      if (!r.success) { toast(pesanErr(r.message), 'err'); return false; } toast('Dicatat dengan agenda ' + r.noAgenda, 'ok'); setelah(); }, }] });
  wireDrop('sm-lamp');
}
function disposisiModal(id, setelah) {
  const adm = ST.profil.role === 'ADMIN';
  modal({ title: 'Disposisi Surat Masuk', body: (adm ? '<div class="field"><label>Tujuan disposisi <span class="req">*</span></label><input class="in" id="dp-t" maxlength="150" placeholder="Mis. Wakil Rektor I / Bagian Kepegawaian"></div>' : '') + `<div class="field"><label>Catatan ${adm ? '' : '<span class="req">*</span>'}</label><textarea class="in" id="dp-c" maxlength="500"></textarea></div>`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: 'Simpan Disposisi', cls: 'primary', onClick: async () => { const r = await api('disposisiSuratMasuk', { id, tujuan: adm ? $('#dp-t').value : '', catatan: $('#dp-c').value }); if (!r.success) { toast(pesanErr(r.message), 'err'); return false; } toast('Disposisi disimpan.', 'ok'); setelah(); } }] });
}

// =====================================================================
// ARSIP (surat keluar terbit + surat masuk)
// =====================================================================
PAGES.arsip = async (el) => {
  const adm = ST.profil.role !== 'USER';
  const S = { q: '', arah: '', jenis: '', tahun: '', page: 1 };
  const muat = () => swr('listArsip', { q: S.q, arah: S.arah, jenis: S.jenis, tahun: S.tahun, page: S.page, perPage: 10 }, r => {
    const box = $('#ar-box'); if (!box) return;
    if (!r.success) return render(box, `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
    const rows = r.rows.map(a => [`<span class="chip ${a.tipe === 'MASUK' ? '' : 'in'}">${a.tipe === 'MASUK' ? 'Masuk' : 'Keluar'}</span>`, `<div class="mono t1" style="color:var(--primary)">${esc(a.nomor)}</div><div class="t2">${esc(a.jenis)}</div>`, `<div class="t1">${esc(a.perihal)}</div>`, esc(a.pihak), fdate(a.tanggal), badge(a.status),
      `<div class="acts"><button class="btn sm" data-a="${esc(a.tipe)}|${esc(a.id)}">${ico('download')} Unduh</button></div>`]);
    render(box, tabel(['Arah', 'Nomor / Jenis', 'Perihal', 'Pihak', 'Tanggal', 'Status', ''], rows) + pagerHtml(r));
    wirePager(box, p => { S.page = p; muat(); });
    $$('[data-a]', box).forEach(b => b.onclick = () => { const [t, id] = b.dataset.a.split('|'); unduh(t === 'MASUK' ? 'fetchLampiranMasuk' : 'fetchPdf', { id }, b); });
  });
  render(el, `${pageHead('Arsip Surat', 'Cari dan unduh surat resmi yang sudah terbit' + (adm ? ' serta surat masuk.' : '.'))}
    <div class="card" style="margin-top:16px"><div class="toolbar"><div class="search">${ico('search')}<input id="ar-q" placeholder="Cari nomor, perihal, pihak…"></div>
      ${adm ? '<select class="in" id="ar-a" style="width:150px"><option value="">Semua arah</option><option value="KELUAR">Surat keluar</option><option value="MASUK">Surat masuk</option></select>' : ''}
      <select class="in" id="ar-j" style="width:190px"><option value="">Semua jenis</option>${ST.jenis.map(t => `<option value="${esc(t.kode)}">${esc(t.nama)}</option>`).join('')}</select><input class="in" id="ar-t" style="width:100px" placeholder="Tahun" maxlength="4" inputmode="numeric"></div><div id="ar-box"><div class="skel big"></div></div></div>`);
  $('#ar-q').oninput = debounce(e => { S.q = e.target.value; S.page = 1; muat(); });
  if (adm) $('#ar-a').onchange = e => { S.arah = e.target.value; S.page = 1; muat(); };
  $('#ar-j').onchange = e => { S.jenis = e.target.value; S.page = 1; muat(); };
  $('#ar-t').oninput = debounce(e => { S.tahun = e.target.value.trim(); S.page = 1; muat(); });
  muat();
};

// =====================================================================
// TEMPLATE & PEJABAT (Admin)
// =====================================================================
const ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
function previewNomor(pola, no, kode) {
  const d = new Date(), y = d.toLocaleDateString('sv-SE', { timeZone: TZ }).slice(0, 4), m = +d.toLocaleDateString('sv-SE', { timeZone: TZ }).slice(5, 7);
  return String(pola || '').replace(/\{no(?::(0+))?\}/g, (x, z) => z ? String(no).padStart(z.length, '0') : String(no)).replace(/\{kode\}/g, kode || 'XX').replace(/\{bulan_romawi\}/g, ROMAWI[m]).replace(/\{bulan\}/g, String(m).padStart(2, '0')).replace(/\{tahun\}/g, y);
}
const TIPE_LABEL = { text: 'Teks singkat', textarea: 'Paragraf panjang', date: 'Tanggal', number: 'Angka', select: 'Pilihan (dropdown)', personel: 'Pilihan pengguna/personel', instansi: 'Pilihan instansi' };
function tebakTipe(tag) { return /tanggal|tgl/.test(tag) ? 'date' : /keperluan|rincian|uraian|isi|deskripsi/.test(tag) ? 'textarea' : /^nama_|personel/.test(tag) ? 'personel' : /instansi|pengirim|tujuan_instansi/.test(tag) ? 'instansi' : 'text'; }

PAGES.template = async (el) => {
  const [rt, rp] = await Promise.all([api('listTemplate'), api('listPejabat')]);
  if (!rt.success) return render(el, galatKartu(rt));
  CTX.pejabat = rp.success ? rp.rows : [];
  let tpls = rt.rows, polaNext = rt.pola || {}, kini = tpls[0] ? tpls[0].kode : null, baru = !tpls.length;
  const kosong = { kode: '', nama: '', deskripsi: '', idDocs: '', isian: [], formatNomor: '{no:000}/{kode}/{bulan_romawi}/{tahun}', resetNomor: 'TAHUNAN', mulaiNomor: 1, pejabatEmail: '', bolehPemohon: true, aktif: true };
  let cur = null;
  const barisIsian = f => `<tr data-tag="${esc(f.tag)}"><td class="mono" data-l="Penanda">{{${esc(f.tag)}}}</td><td data-l="Label"><input class="in" data-k="label" value="${esc(f.label)}" style="height:36px"></td><td data-l="Tipe"><select class="in" data-k="tipe" style="height:36px">${Object.keys(TIPE_LABEL).map(t => `<option value="${t}" ${f.tipe === t ? 'selected' : ''}>${TIPE_LABEL[t]}</option>`).join('')}</select><input class="in ${f.tipe === 'select' ? '' : 'hidden'}" data-k="opsi" placeholder="Opsi dipisah |" value="${esc(f.opsi || '')}" style="height:36px;margin-top:6px"></td><td data-l="Wajib"><input type="checkbox" data-k="wajib" ${f.wajib ? 'checked' : ''}></td><td><button class="rbtn" data-del title="Hapus">${ico('trash-2')}</button></td></tr>`;
  const tampilEditor = () => {
    cur = baru ? JSON.parse(JSON.stringify(kosong)) : JSON.parse(JSON.stringify(tpls.find(t => t.kode === kini) || kosong));
    const pjl = CTX.pejabat;
    $('#tp-edit').innerHTML = `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><span class="xs muted bold" style="letter-spacing:.06em">EDITOR KONFIGURASI</span><h3>${baru ? 'Template Baru' : esc(cur.nama)}</h3></div><label style="display:flex;gap:8px;align-items:center" class="sm">Aktif <span class="toggle"><input type="checkbox" id="tp-aktif" ${cur.aktif ? 'checked' : ''}><span></span></span></label></div>
      <div class="sec" style="padding-left:0">1 • Informasi dasar & berkas Google Docs</div>
      <div class="row2"><div class="field"><label>Kode Surat <span class="req">*</span></label><input class="in" id="tp-kode" maxlength="5" value="${esc(cur.kode)}" ${baru ? '' : 'disabled'} style="text-transform:uppercase"><span class="hint">Maks. 5 karakter huruf/angka</span></div><div class="field"><label>Nama Template <span class="req">*</span></label><input class="in" id="tp-nama" maxlength="100" value="${esc(cur.nama)}"></div></div>
      <div class="field"><label>Deskripsi singkat</label><input class="in" id="tp-desk" maxlength="250" value="${esc(cur.deskripsi || '')}"></div>
      <div class="field"><label>ID atau URL Google Docs master <span class="req">*</span></label><div style="display:flex;gap:8px;flex-wrap:wrap"><input class="in mono" id="tp-docs" style="flex:1;min-width:200px" value="${esc(cur.idDocs)}" placeholder="https://docs.google.com/document/d/…"><button class="btn" id="tp-deteksi">${ico('scan-search')} Deteksi penanda</button></div><span class="hint">Dokumen harus dimiliki/dapat dibuka oleh akun pemilik skrip. Tulis penanda seperti {{perihal}} di dalam dokumen.</span></div>
      <div class="sec" style="padding-left:0">2 • Pemetaan penanda isian → formulir</div><div id="tp-sys" class="sm muted" style="margin-bottom:8px"></div>
      <div class="tbl-wrap"><table><thead><tr><th>Penanda</th><th>Label formulir</th><th>Tipe input</th><th>Wajib</th><th></th></tr></thead><tbody id="tp-rows">${cur.isian.map(barisIsian).join('')}</tbody></table></div>
      <div class="alert" style="margin-top:10px">${ico('info')}<div class="sm">Penanda otomatis sistem (tidak perlu dipetakan): <span class="mono">{{nomor_surat}} {{tanggal_terbit}} {{nama_pejabat}} {{jabatan_pejabat}} {{nip_pejabat}} {{ttd}} {{cap}} {{qr}} {{kode_verifikasi}} {{nama_pemohon}} {{unit_pemohon}}</span>. Untuk tipe personel, tersedia juga <span class="mono">{{penanda_nip}} {{penanda_jabatan}}</span>.</div></div>
      <div class="sec" style="padding-left:0">3 • Format & pola nomor surat</div><div class="sm muted" style="margin-bottom:6px">Klik token untuk menyisipkan:</div><div id="tp-chips">${['{no:000}', '{no}', '{kode}', '{bulan_romawi}', '{bulan}', '{tahun}'].map(t => `<button class="tag-chip" data-t="${esc(t)}">${esc(t)} +</button>`).join('')}</div>
      <div class="field" style="margin-top:8px"><label>Pola nomor</label><input class="in mono" id="tp-pola" maxlength="80" value="${esc(cur.formatNomor)}"></div>
      <div class="card" style="background:var(--frame);box-shadow:none;margin-bottom:14px"><div class="xs muted bold">PRATINJAU NOMOR</div><div class="mono" style="font-size:22px;font-weight:700;color:var(--primary)" id="tp-prev"></div><div class="sm muted" id="tp-next"></div></div>
      <div class="row2"><div class="field"><label>Aturan reset nomor urut</label><select class="in" id="tp-reset">${[['TAHUNAN', 'Tahunan (reset tiap 1 Januari)'], ['BULANAN', 'Bulanan (reset tiap awal bulan)'], ['TIDAK', 'Tidak pernah reset']].map(([v, l]) => `<option value="${v}" ${cur.resetNomor === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Mulai nomor urut</label><input class="in" type="number" min="1" id="tp-mulai" value="${esc(cur.mulaiNomor || 1)}"></div></div>
      <div class="sec" style="padding-left:0">4 • Otorisasi & wewenang penandatanganan</div>
      <div class="row2"><div class="field"><label>Pejabat penandatangan utama</label><select class="in" id="tp-pj"><option value="">— pilih pejabat —</option>${pjl.map(p => `<option value="${esc(p.email)}" ${p.email === cur.pejabatEmail ? 'selected' : ''}>${esc(p.nama)} (${esc(p.jabatan)})</option>`).join('')}</select></div><div class="field"><label>Izinkan pemohon (USER) mengajukan</label><label style="display:flex;gap:10px;align-items:center;height:44px"><span class="toggle"><input type="checkbox" id="tp-boleh" ${cur.bolehPemohon ? 'checked' : ''}><span></span></span><span class="sm">Tampil di formulir pemohon</span></label></div></div>
      <div style="display:flex;justify-content:flex-end"><button class="btn primary lg" id="tp-simpan">${ico('check-circle')} Simpan Konfigurasi</button></div></div>`;
    refreshIcons(); pasang();
  };
  const bacaIsianTpl = () => $$('#tp-rows tr').map(tr => ({ tag: tr.dataset.tag, label: $('[data-k=label]', tr).value, tipe: $('[data-k=tipe]', tr).value, opsi: $('[data-k=opsi]', tr).value, wajib: $('[data-k=wajib]', tr).checked }));
  const pasang = () => {
    const upd = () => { const kode = ($('#tp-kode').value || 'XX').toUpperCase(); $('#tp-prev').textContent = previewNomor($('#tp-pola').value, +$('#tp-mulai').value || 1, kode); $('#tp-next').textContent = !baru && polaNext[kini] ? 'Nomor terbit berikutnya: ' + polaNext[kini] : 'Contoh dengan nomor urut awal.'; };
    $('#tp-pola').oninput = upd; $('#tp-mulai').oninput = upd; $('#tp-kode').oninput = upd; upd();
    $$('#tp-chips [data-t]').forEach(b => b.onclick = () => { const i = $('#tp-pola'); i.value += b.dataset.t; upd(); });
    $('#tp-rows').addEventListener('change', e => { if (e.target.dataset.k === 'tipe') $('[data-k=opsi]', e.target.closest('tr')).classList.toggle('hidden', e.target.value !== 'select'); });
    $('#tp-rows').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) d.closest('tr').remove(); });
    $('#tp-deteksi').onclick = async e => {
      const b = e.currentTarget; b.disabled = true; const r = await api('getPenandaDocs', { idDocs: $('#tp-docs').value }); b.disabled = false;
      if (!r.success) return toast(pesanErr(r.message), 'err');
      const ada = bacaIsianTpl(), peta = {}; ada.forEach(f => peta[f.tag] = f);
      const baruList = r.tagIsian.map(t => peta[t] || { tag: t, label: t.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()), tipe: tebakTipe(t), opsi: '', wajib: true });
      $('#tp-rows').innerHTML = baruList.map(barisIsian).join(''); refreshIcons();
      $('#tp-sys').innerHTML = `<span class="chip up">${r.tagIsian.length + r.tagSistem.length} penanda terdeteksi</span> dari “${esc(r.judul)}”. Sistem: ${r.tagSistem.map(t => `<span class="mono">{{${esc(t)}}}</span>`).join(' ') || '—'}`;
      toast('Penanda terdeteksi. Periksa tipe inputnya.', 'ok');
    };
    $('#tp-simpan').onclick = async e => {
      const b = e.currentTarget; b.disabled = true;
      const r = await api('simpanTemplate', { kode: $('#tp-kode').value, nama: $('#tp-nama').value, deskripsi: $('#tp-desk').value, idDocs: $('#tp-docs').value, isian: bacaIsianTpl(), formatNomor: $('#tp-pola').value, resetNomor: $('#tp-reset').value, mulaiNomor: $('#tp-mulai').value, pejabatEmail: $('#tp-pj').value, bolehPemohon: $('#tp-boleh').checked, aktif: $('#tp-aktif').checked });
      b.disabled = false; if (!r.success) return toast(pesanErr(r.message), 'err');
      toast('Template disimpan.', 'ok'); ST.jenis = []; const boot = await api('boot'); if (boot.success) ST.jenis = boot.data.jenis || []; kini = r.kode; baru = false; go('template');
    };
  };
  render(el, `${pageHead('Kelola Template & Pola Nomor', 'Atur berkas master Google Docs, penanda isian dinamis, pola penomoran otomatis, dan wewenang penandatanganan pimpinan.', `<button class="btn primary" id="tp-new">${ico('plus')} Tambah Template Baru</button>`)}
    <div class="grid" style="grid-template-columns:minmax(240px,320px) 1fr;margin-top:16px;align-items:start" id="tp-grid"><div id="tp-list">${tpls.map(t => `<div class="card q-item ${t.kode === kini && !baru ? 'on' : ''}" data-k="${esc(t.kode)}" style="padding:14px"><div style="display:flex;justify-content:space-between;align-items:center"><div><span class="chip ind">${esc(t.kode)}</span> <b>${esc(t.nama)}</b></div>${t.aktif ? '<span class="badge b-AKTIF">Aktif</span>' : '<span class="badge b-DIAJUKAN">Nonaktif</span>'}</div><div class="mono xs muted" style="margin-top:6px">${esc(t.formatNomor)}</div></div>`).join('') || '<div class="card empty">Belum ada template.</div>'}</div><div id="tp-edit"></div></div>
    <div class="card" style="margin-top:16px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px"><div><h3>Pejabat Penandatangan, Tanda Tangan & Cap</h3><div class="sub">Gambar tanda tangan dan stempel disimpan privat dan hanya dibubuhkan otomatis saat pimpinan menyetujui.</div></div><button class="btn" id="pj-new">${ico('user-plus')} Tambah / Ubah Pejabat</button></div><div id="pj-box"></div></div>`);
  if (window.innerWidth < 900) $('#tp-grid').style.gridTemplateColumns = '1fr';
  $$('#tp-list [data-k]').forEach(c => c.onclick = () => { kini = c.dataset.k; baru = false; $$('#tp-list [data-k]').forEach(x => x.classList.toggle('on', x === c)); tampilEditor(); });
  $('#tp-new').onclick = () => { baru = true; $$('#tp-list [data-k]').forEach(x => x.classList.remove('on')); tampilEditor(); };
  tampilEditor();
  const tampilPejabat = () => {
    $('#pj-box').innerHTML = tabel(['Pejabat', 'Jabatan', 'NIP', 'Jenis diizinkan', 'TTD', 'Cap', ''], CTX.pejabat.map(p => [`<div class="t1">${esc(p.nama)}</div><div class="t2">${esc(p.email)}</div>`, esc(p.jabatan), `<span class="mono">${esc(p.nip)}</span>`, esc(p.jenis === '*' ? 'Semua jenis' : p.jenis), p.adaTtd ? '✔' : '<span style="color:var(--bad-fg)">belum</span>', p.adaCap ? '✔' : '—', `<div class="acts"><button class="rbtn" data-e="${esc(p.email)}">${ico('pencil')}</button></div>`]));
    refreshIcons(); $$('#pj-box [data-e]').forEach(b => b.onclick = () => pejabatModal(CTX.pejabat.find(p => p.email === b.dataset.e), tpls, async () => { const r2 = await api('listPejabat'); CTX.pejabat = r2.success ? r2.rows : []; tampilPejabat(); tampilEditor(); }));
  };
  tampilPejabat();
  $('#pj-new').onclick = () => pejabatModal(null, tpls, async () => { const r2 = await api('listPejabat'); CTX.pejabat = r2.success ? r2.rows : []; tampilPejabat(); tampilEditor(); });
};
async function pejabatModal(p, tpls, setelah) {
  const pr = await api('listPersonel'), pil = pr.success ? pr.rows : [], jz = p ? String(p.jenis).split(',') : [];
  modal({ title: p ? 'Ubah Pejabat' : 'Tambah Pejabat', body: `<div class="field"><label>Akun pengguna <span class="req">*</span></label><select class="in" id="pe-e" ${p ? 'disabled' : ''}><option value="">— pilih —</option>${pil.map(u => `<option value="${esc(u.email)}" data-n="${esc(u.nama)}" data-nip="${esc(u.nip)}" ${p && p.email === u.email ? 'selected' : ''}>${esc(u.nama)} — ${esc(u.email)}</option>`).join('')}</select><span class="hint">Pastikan peran akunnya Pimpinan di menu Kelola Pengguna.</span></div>
    <div class="field"><label>Nama pada surat</label><input class="in" id="pe-n" maxlength="120" value="${esc(p ? p.nama : '')}"></div><div class="row2"><div class="field"><label>Jabatan <span class="req">*</span></label><input class="in" id="pe-j" maxlength="150" value="${esc(p ? p.jabatan : '')}"></div><div class="field"><label>NIP</label><input class="in mono" id="pe-nip" maxlength="40" value="${esc(p ? p.nip : '')}"></div></div>
    <div class="field"><label>Jenis surat yang boleh ditandatangani</label><label style="display:flex;gap:8px"><input type="checkbox" id="pe-all" ${jz.includes('*') ? 'checked' : ''}> Semua jenis</label>${tpls.map(t => `<label style="display:flex;gap:8px"><input type="checkbox" class="pe-j" value="${esc(t.kode)}" ${jz.includes(t.kode) ? 'checked' : ''}> ${esc(t.nama)} (${esc(t.kode)})</label>`).join('')}</div>
    <div class="row2"><div class="field"><label>Gambar tanda tangan (PNG transparan)</label><input type="file" id="pe-ttd" accept="image/png"><span class="hint">${p && p.adaTtd ? 'Sudah ada. Unggah hanya untuk mengganti.' : 'Maks. 1 MB.'}</span></div><div class="field"><label>Gambar stempel/cap (PNG)</label><input type="file" id="pe-cap" accept="image/png"><span class="hint">${p && p.adaCap ? 'Sudah ada.' : 'Opsional.'}</span></div></div>`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      const email = p ? p.email : $('#pe-e').value; if (!email) { toast('Pilih akun pengguna.', 'err'); return false; }
      const f1 = $('#pe-ttd').files[0], f2 = $('#pe-cap').files[0];
      if ((f1 && f1.type !== 'image/png') || (f2 && f2.type !== 'image/png')) { toast('Gambar harus PNG.', 'err'); return false; }
      const jenis = $('#pe-all').checked ? ['*'] : $$('.pe-j:checked').map(x => x.value);
      const r = await api('simpanPejabat', { email, nama: $('#pe-n').value, jabatan: $('#pe-j').value, nip: $('#pe-nip').value, jenis, ttdBase64: f1 ? await fileKeBase64(f1) : '', capBase64: f2 ? await fileKeBase64(f2) : '' });
      if (!r.success) { toast(pesanErr(r.message), 'err'); return false; } toast('Pejabat disimpan.', 'ok'); setelah(); } }] });
  const sel = $('#pe-e'); if (sel && !p) sel.onchange = () => { const o = sel.selectedOptions[0]; $('#pe-n').value = o.dataset.n || ''; $('#pe-nip').value = o.dataset.nip || ''; };
}

// =====================================================================
// NOMOR SURAT
// =====================================================================
PAGES.nomor = async (el) => {
  const S = { page: 1 };
  const muat = async () => {
    const r = await api('listNomor', { page: S.page, perPage: 10 }); if (HALAMAN !== 'nomor') return;
    if (!r.success) return render(el, galatKartu(r));
    render(el, `${pageHead('Nomor Surat', 'Buku nomor resmi. Nomor diberikan otomatis dan aman dari duplikasi; nomor yang dibatalkan ditandai dan tidak dipakai ulang.')}
      <div class="grid g2" style="margin-top:16px"><div class="card"><h3>Pencacah Nomor</h3><div class="sub" style="margin-bottom:10px">Nomor urut terakhir per jenis & periode</div>${tabel(['Jenis', 'Periode', 'Terakhir'], r.counter.map(c => [esc(c.jenis), esc(c.periode), `<b class="mono">${c.terakhir}</b>`]))}</div>
      <div class="card"><h3>Pratinjau Nomor Berikutnya</h3><div class="sub" style="margin-bottom:10px">Berdasarkan pola template</div>${Object.keys(r.pola).map(k => `<div style="display:flex;justify-content:space-between;margin:10px 0"><span class="chip ind">${esc(k)}</span><b class="mono" style="color:var(--primary)">${esc(r.pola[k])}</b></div>`).join('') || '<div class="empty">Belum ada template.</div>'}</div></div>
      <div class="card" style="margin-top:16px"><h3>Daftar Nomor Terbit</h3><div class="sub" style="margin-bottom:10px">Terbaru di atas</div>${tabel(['Nomor', 'Jenis', 'ID Pengajuan', 'Tanggal', 'Status nomor', 'Status surat'], r.rows.map(n => [`<span class="mono bold">${esc(n.nomor)}</span>`, esc(n.jenis), `<span class="mono">${esc(n.id)}</span>`, fdate(n.tanggal), n.statusNomor === 'BATAL' ? badge('BATAL') : badge('AKTIF'), badge(n.status)])) + pagerHtml(r)}</div>`);
    wirePager(el, p => { S.page = p; muat(); });
  };
  muat();
};

// =====================================================================
// KELOLA PENGGUNA
// =====================================================================
PAGES.pengguna = async (el) => {
  const S = { q: '', role: '', status: '', unit: '', page: 1 };
  const muat = () => swr('listPengguna', { q: S.q, role: S.role, status: S.status, page: S.page, perPage: 8 }, r => {
    const box = $('#pg-box'); if (!box) return;
    if (!r.success) return render(box, `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
    const k = r.ringkas;
    $('#pg-kpi').innerHTML = [kpiCard({ ico: 'users', label: 'Total Akun Terdaftar', num: k.total }), kpiCard({ ico: 'hourglass', label: 'Menunggu Persetujuan', num: k.menunggu, hl: true, note: 'akun Gmail umum', chip: k.menunggu ? 'Perlu tindakan' : '' }), kpiCard({ ico: 'check-circle', label: 'Pengguna Aktif', num: k.aktif, note: k.pimpinan + ' pimpinan' }), kpiCard({ ico: 'shield-off', label: 'Akun Diblokir', num: k.blokir })].join('');
    const rows = r.rows.map(u => [`<div style="display:flex;gap:10px;align-items:center"><div class="avatar" style="width:34px;height:34px;font-size:12px;flex:none">${esc(initials(u.nama || u.email))}</div><div><div class="t1">${esc(u.nama || '(tanpa nama)')}</div><div class="t2">${esc(u.email)}</div>${u.nip ? `<div class="t2 mono">NIP: ${esc(u.nip)}</div>` : ''}</div></div>`, `<div>${esc(u.unit) || '—'}</div><div class="t2">${esc(u.jabatan)}</div>`, `<span class="chip ind">${esc(ROLE_LABEL[u.role] || u.role)}</span>`, badge(u.status), fdate(u.tanggal),
      `<div class="acts">${u.status === 'MENUNGGU' ? `<button class="btn primary sm" data-ok="${esc(u.email)}">${ico('check')} Setujui</button><button class="btn danger sm" data-no="${esc(u.email)}">Tolak</button>` : `<button class="rbtn" data-e="${esc(u.email)}" title="Ubah">${ico('pencil')}</button><button class="rbtn" data-k="${esc(u.email)}" title="${u.adaSandi ? 'Reset sandi NIP' : 'Buat sandi NIP'}">${ico('key-round')}</button>${u.status === 'BLOKIR' ? `<button class="btn sm" data-bk="${esc(u.email)}">Buka Akses</button>` : `<button class="rbtn" data-bl="${esc(u.email)}" title="Blokir">${ico('ban')}</button>`}`}</div>`]);
    render(box, tabel(['Pengguna & Google SSO', 'Unit / Jabatan', 'Peran', 'Status', 'Terdaftar', 'Aksi otorisasi'], rows) + pagerHtml(r));
    wirePager(box, p => { S.page = p; muat(); });
    const ubah = async (email, patch, ok) => { const x = await api('ubahPengguna', Object.assign({ email }, patch)); if (!x.success) return toast(pesanErr(x.message), 'err'); toast(ok, 'ok'); muat(); };
    $$('[data-ok]', box).forEach(b => b.onclick = () => ubah(b.dataset.ok, { status: 'AKTIF' }, 'Akun disetujui.'));
    $$('[data-no]', box).forEach(b => b.onclick = () => ubah(b.dataset.no, { status: 'BLOKIR' }, 'Pendaftaran ditolak.'));
    $$('[data-bl]', box).forEach(b => b.onclick = () => ubah(b.dataset.bl, { status: 'BLOKIR' }, 'Akun diblokir.'));
    $$('[data-bk]', box).forEach(b => b.onclick = () => ubah(b.dataset.bk, { status: 'AKTIF' }, 'Akses dibuka.'));
    $$('[data-e]', box).forEach(b => b.onclick = () => penggunaModal(r.rows.find(x => x.email === b.dataset.e), muat));
    $$('[data-k]', box).forEach(b => b.onclick = async () => { const x = await api('aturSandi', { email: b.dataset.k }); if (!x.success) return toast(pesanErr(x.message), 'err'); modal({ title: 'Sandi sementara dibuat', body: `<div class="alert okk">${esc(x.catatan)}</div><div class="field"><label>NIP</label><input class="in mono" readonly value="${esc(x.nip)}"></div><div class="field"><label>Sandi sementara</label><input class="in mono" readonly value="${esc(x.sandiSementara)}" id="ss"></div>`, footer: [{ label: 'Salin Sandi', cls: 'primary', keep: true, onClick: () => { navigator.clipboard && navigator.clipboard.writeText($('#ss').value); toast('Tersalin.', 'ok'); return false; } }, { label: 'Selesai', onClick: () => true }] }); muat(); });
  });
  render(el, `${pageHead('Manajemen Pengguna & Hak Akses', 'Kelola akun Google SSO, persetujuan pendaftar dari luar organisasi, dan distribusi peran (Admin, Pimpinan, Pemohon).', `<button class="btn primary" id="pg-add">${ico('user-plus')} Tambah Pengguna</button>`)}
    <div class="grid g4" id="pg-kpi" style="margin:16px 0"></div>
    <div class="card"><div class="toolbar"><div class="search">${ico('search')}<input id="pg-q" placeholder="Cari nama, email, NIP, atau unit kerja…"></div>
      <select class="in" id="pg-r" style="width:160px"><option value="">Semua Peran</option><option value="ADMIN">Admin</option><option value="PIMPINAN">Pimpinan</option><option value="USER">Pemohon</option></select>
      <select class="in" id="pg-s" style="width:160px"><option value="">Semua Status</option><option value="AKTIF">Aktif</option><option value="MENUNGGU">Menunggu</option><option value="BLOKIR">Diblokir</option></select></div><div id="pg-box"><div class="skel big"></div></div></div>`);
  $('#pg-q').oninput = debounce(e => { S.q = e.target.value; S.page = 1; muat(); });
  $('#pg-r').onchange = e => { S.role = e.target.value; S.page = 1; muat(); };
  $('#pg-s').onchange = e => { S.status = e.target.value; S.page = 1; muat(); };
  $('#pg-add').onclick = () => penggunaModal(null, muat);
  muat();
};
function penggunaModal(u, setelah) {
  const baru = !u;
  modal({ title: baru ? 'Tambah Pengguna' : 'Ubah Pengguna', body: `<div class="field"><label>Email Google <span class="req">*</span></label><input class="in" id="up-e" maxlength="120" value="${esc(u ? u.email : '')}" ${baru ? '' : 'disabled'}></div><div class="field"><label>Nama lengkap</label><input class="in" id="up-n" maxlength="120" value="${esc(u ? u.nama : '')}"></div>
    <div class="row2"><div class="field"><label>NIP / NIDN</label><input class="in mono" id="up-nip" maxlength="40" value="${esc(u ? u.nip : '')}"><span class="hint">Dipakai untuk login NIP & pemilihan personel.</span></div><div class="field"><label>Jabatan</label><input class="in" id="up-j" maxlength="120" value="${esc(u ? u.jabatan : '')}"></div></div>
    <div class="field"><label>Unit kerja / instansi</label><input class="in" id="up-u" maxlength="150" value="${esc(u ? u.unit : '')}"></div>
    <div class="row2"><div class="field"><label>Peran</label><select class="in" id="up-r">${['USER', 'PIMPINAN', 'ADMIN'].map(r => `<option value="${r}" ${u && u.role === r ? 'selected' : ''}>${esc(ROLE_LABEL[r])}</option>`).join('')}</select></div>${baru ? '' : `<div class="field"><label>Status</label><select class="in" id="up-s">${['AKTIF', 'MENUNGGU', 'BLOKIR'].map(s => `<option value="${s}" ${u.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select></div>`}</div>`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      const d = { email: $('#up-e').value, nama: $('#up-n').value, nip: $('#up-nip').value, jabatan: $('#up-j').value, unit: $('#up-u').value, role: $('#up-r').value };
      if (!baru) { d.status = $('#up-s').value; if (u.role === d.role) delete d.role; if (u.status === d.status) delete d.status; }
      const r = await api(baru ? 'tambahPengguna' : 'ubahPengguna', d); if (!r.success) { toast(pesanErr(r.message), 'err'); return false; } toast('Tersimpan.', 'ok'); CTX.personel = null; setelah(); } }] });
}

// =====================================================================
// INSTANSI
// =====================================================================
PAGES.instansi = async (el) => {
  const muat = async () => {
    const r = await api('listInstansi', { semua: true }); if (HALAMAN !== 'instansi') return;
    if (!r.success) return render(el, galatKartu(r));
    render(el, `${pageHead('Instansi', 'Data induk instansi dan unit. Dipakai sebagai pengirim surat masuk dan tujuan surat.', `<button class="btn primary" id="in-add">${ico('plus')} Tambah Instansi</button>`)}
      <div class="card" style="margin-top:16px">${tabel(['Nama', 'Jenis', 'Alamat', 'Kontak', 'Status', ''], r.rows.map(i => [`<div class="t1">${esc(i.nama)}</div><div class="t2">${esc(i.id)}</div>`, `<span class="chip ind">${esc(i.jenis)}</span>`, esc(i.alamat), `<div>${esc(i.kontak)}</div><div class="t2">${esc(i.email)}</div>`, i.aktif ? badge('AKTIF') : badge('DIBATALKAN').replace('Dibatalkan', 'Nonaktif'), `<div class="acts"><button class="rbtn" data-e="${esc(i.id)}">${ico('pencil')}</button></div>`]))}</div>`);
    $('#in-add').onclick = () => instansiModal(null, muat);
    $$('[data-e]', el).forEach(b => b.onclick = () => instansiModal(r.rows.find(x => x.id === b.dataset.e), muat));
  };
  muat();
};
function instansiModal(i, setelah) {
  modal({ title: i ? 'Ubah Instansi' : 'Tambah Instansi', body: `<div class="field"><label>Nama instansi <span class="req">*</span></label><input class="in" id="ii-n" maxlength="150" value="${esc(i ? i.nama : '')}"></div><div class="row2"><div class="field"><label>Jenis</label><select class="in" id="ii-j"><option value="EKSTERNAL" ${i && i.jenis === 'EKSTERNAL' ? 'selected' : ''}>Eksternal</option><option value="INTERNAL" ${i && i.jenis === 'INTERNAL' ? 'selected' : ''}>Internal</option></select></div><div class="field"><label>Kontak</label><input class="in" id="ii-k" maxlength="60" value="${esc(i ? i.kontak : '')}"></div></div><div class="field"><label>Email</label><input class="in" id="ii-e" maxlength="120" value="${esc(i ? i.email : '')}"></div><div class="field"><label>Alamat</label><textarea class="in" id="ii-a" style="min-height:70px" maxlength="300">${esc(i ? i.alamat : '')}</textarea></div>${i ? `<label style="display:flex;gap:10px;align-items:center"><span class="toggle"><input type="checkbox" id="ii-ak" ${i.aktif ? 'checked' : ''}><span></span></span> Aktif</label>` : ''}`,
    footer: [{ label: 'Batal', onClick: () => true }, { label: 'Simpan', cls: 'primary', onClick: async () => { const r = await api('simpanInstansi', { id: i ? i.id : '', nama: $('#ii-n').value, jenis: $('#ii-j').value, kontak: $('#ii-k').value, email: $('#ii-e').value, alamat: $('#ii-a').value, aktif: i ? $('#ii-ak').checked : true }); if (!r.success) { toast(pesanErr(r.message), 'err'); return false; } CTX.instansi = null; toast('Instansi disimpan.', 'ok'); setelah(); } }] });
}

// =====================================================================
// LOG AKTIVITAS
// =====================================================================
PAGES.log = async (el) => {
  const S = { q: '', aksi: '', page: 1 };
  const AKSI = ['login', 'login_gagal', 'ajukan', 'proses', 'verifikasi', 'tolak', 'batal', 'unduh', 'ubah_pengguna', 'template', 'pejabat', 'instansi', 'surat_masuk'];
  const muat = async () => {
    const r = await api('listLog', { q: S.q, aksi: S.aksi, page: S.page, perPage: 15 }); const box = $('#lg-box'); if (!box) return;
    if (!r.success) return render(box, `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
    render(box, tabel(['Waktu', 'Pengguna', 'Aksi', 'ID Pengajuan', 'Detail'], r.rows.map(l => [fdt(l.waktu), esc(l.email), `<span class="chip ind">${esc(l.aksi)}</span>`, `<span class="mono">${esc(l.id)}</span>`, esc(l.detail)])) + pagerHtml(r));
    wirePager(box, p => { S.page = p; muat(); });
  };
  render(el, `${pageHead('Log Aktivitas', 'Jejak audit seluruh tindakan penting (2.000 catatan terbaru).')}<div class="card" style="margin-top:16px"><div class="toolbar"><div class="search">${ico('search')}<input id="lg-q" placeholder="Cari pengguna, ID, detail…"></div><select class="in" id="lg-a" style="width:180px"><option value="">Semua aksi</option>${AKSI.map(a => `<option>${a}</option>`).join('')}</select></div><div id="lg-box"><div class="skel big"></div></div></div>`);
  $('#lg-q').oninput = debounce(e => { S.q = e.target.value; S.page = 1; muat(); });
  $('#lg-a').onchange = e => { S.aksi = e.target.value; S.page = 1; muat(); };
  muat();
};

// =====================================================================
// LAPORAN & REKAPITULASI
// =====================================================================
PAGES.laporan = async (el) => {
  const th = todayStr().slice(0, 4), S = { dari: th + '-01-01', sampai: todayStr(), jenis: '', status: '', unit: '', page: 1 };
  const kueri = extra => Object.assign({ dari: S.dari, sampai: S.sampai, jenis: S.jenis, status: S.status, unit: S.unit, page: S.page, perPage: 10 }, extra || {});
  const muat = async () => {
    hancurkanChart(); const box = $('#lp-box'); render(box, skel(3));
    const r = await api('getLaporan', kueri()); if (HALAMAN !== 'laporan') return;
    if (!r.success) return render(box, `<div class="alert err">${esc(pesanErr(r.message))}</div>`);
    const k = r.kpi, tot = r.perJenis.reduce((a, x) => a + x.n, 0);
    render(box, `<div class="grid g4" style="margin-bottom:16px">${[kpiCard({ ico: 'inbox', label: 'Total Permohonan', num: k.total, note: 'dokumen terdaftar' }), kpiCard({ ico: 'badge-check', label: 'Surat Terbit & Sah', num: k.terbit, hl: true, note: 'rasio ' + k.rasioTerbit + '%' }), kpiCard({ ico: 'timer', label: 'Rata-rata Waktu Proses', num: k.rataJam, note: 'jam (ajukan → terbit)' }), kpiCard({ ico: 'x-circle', label: 'Ditolak / Dibatalkan', num: k.ditolak, note: '(' + k.rasioDitolak + '%)' })].join('')}</div>
      <div class="grid g-dash" style="margin-bottom:16px"><div class="card"><h3>Tren Volume Pengajuan & Penerbitan</h3><div class="chart-box" style="margin-top:10px"><canvas id="lp-bar" role="img" aria-label="Tren bulanan"></canvas></div></div><div class="card"><h3>Distribusi Kategori Surat</h3>${r.perJenis.map(x => `<div class="bar-row"><div style="display:flex;justify-content:space-between"><span>${esc(x.nama)}</span><b>${tot ? Math.round(x.n * 100 / tot) : 0}% <span class="muted">(${x.n})</span></b></div><div class="bar"><i style="width:${tot ? Math.round(x.n * 100 / tot) : 0}%"></i></div></div>`).join('') || '<div class="empty">Tidak ada data.</div>'}</div></div>
      <div class="card"><h3>Buku Rekapitulasi Surat</h3><div class="sub" style="margin-bottom:10px">${r.total} dokumen sesuai filter</div>${tabel(['No. Surat', 'Jenis & Unit', 'Perihal & Tgl Permohonan', 'Pejabat', 'Status'], r.rows.map(x => [`<div class="mono t1" style="color:var(--primary)">${esc(x.nomor || '—')}</div><div class="mono t2">${esc(x.id)}</div>`, `<div class="t1">${esc(x.jenis)}</div><div class="t2">${esc(x.unit)}</div>`, `<div class="t1">${esc(x.perihal)}</div><div class="t2">${fdt(x.tanggal)}</div>`, esc(x.pejabat), badge(x.status)])) + pagerHtml(r)}</div>`);
    gambarBar($('#lp-bar'), r.grafik); wirePager(box, p => { S.page = p; muat(); });
  };
  const ekspor = async tipe => {
    const r = await api('getLaporan', kueri({ semua: true })); if (!r.success) return toast(pesanErr(r.message), 'err');
    const data = r.rows.map(x => ({ 'No. Surat': x.nomor, 'ID Pengajuan': x.id, 'Jenis': x.jenis, 'Unit': x.unit, 'Perihal': x.perihal, 'Tgl Pengajuan': x.tanggal ? x.tanggal.slice(0, 10) : '', 'Pejabat': x.pejabat, 'Tgl Terbit': x.tanggalTerbit ? x.tanggalTerbit.slice(0, 10) : '', 'Status': STATUS_LABEL[x.status] || x.status }));
    if (!window.XLSX) return toast('Pustaka Excel belum termuat.', 'err');
    const ws = XLSX.utils.json_to_sheet(data), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Rekap');
    if (tipe === 'xlsx') XLSX.writeFile(wb, 'rekap-surat-' + todayStr() + '.xlsx'); else { const csv = XLSX.utils.sheet_to_csv(ws), a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'rekap-surat-' + todayStr() + '.csv'; a.click(); }
  };
  render(el, `${pageHead('Laporan & Rekapitulasi Dokumen Surat', 'Analisis volume surat keluar, kepatuhan verifikasi, dan rekapitulasi berkas terbit.', `<button class="btn" id="lp-x">${ico('table')} Excel (.xlsx)</button><button class="btn" id="lp-c">${ico('file-text')} CSV</button><button class="btn" id="lp-p">${ico('printer')} Cetak PDF</button>`)}
    <div class="card" style="margin:16px 0"><div class="toolbar" style="margin:0"><div class="field" style="margin:0"><label class="xs muted">Dari</label><input type="date" class="in" id="lp-d" value="${S.dari}"></div><div class="field" style="margin:0"><label class="xs muted">Sampai</label><input type="date" class="in" id="lp-s" value="${S.sampai}"></div>
      <div class="field" style="margin:0"><label class="xs muted">Jenis</label><select class="in" id="lp-j"><option value="">Semua</option>${ST.jenis.map(t => `<option value="${esc(t.kode)}">${esc(t.nama)}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label class="xs muted">Status</label><select class="in" id="lp-st"><option value="">Semua</option>${['TERBIT', 'DIAJUKAN', 'DIPROSES', 'MENUNGGU_VERIFIKASI', 'DITOLAK', 'DIBATALKAN'].map(s => `<option value="${s}">${STATUS_LABEL[s]}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label class="xs muted">Unit kerja</label><input class="in" id="lp-u" placeholder="Semua unit"></div><button class="btn primary" id="lp-go" style="align-self:flex-end;margin-bottom:0">${ico('filter')} Terapkan</button></div></div><div id="lp-box"></div>`);
  $('#lp-go').onclick = () => { S.dari = $('#lp-d').value || '0000-00-00'; S.sampai = $('#lp-s').value || '9999-99-99'; S.jenis = $('#lp-j').value; S.status = $('#lp-st').value; S.unit = $('#lp-u').value; S.page = 1; muat(); };
  $('#lp-x').onclick = () => ekspor('xlsx'); $('#lp-c').onclick = () => ekspor('csv'); $('#lp-p').onclick = () => window.print();
  muat();
};

// =====================================================================
// CEK KEASLIAN SURAT (publik & dalam aplikasi)
// =====================================================================
function hasilVerifikasi(r) {
  if (!r.success) return `<div class="alert err">${esc(pesanErr(r.message))}</div>`;
  if (!r.ditemukan) return `<div class="alert err">${ico('x-circle')}<div><b>Dokumen tidak ditemukan.</b><br>Periksa kembali tautan atau kode verifikasi.</div></div>`;
  if (!r.sah) return `<div class="alert err">${ico('shield-alert')}<div><b>Kode verifikasi TIDAK SAH.</b><br>Dokumen mungkin telah diubah atau dipalsukan.</div></div>`;
  const aktif = r.status === 'TERBIT';
  return `<div style="text-align:center;margin-bottom:12px"><span class="chip up" style="font-size:13px;padding:6px 14px">${ico('shield-check')} ${aktif ? 'Dokumen Asli & Berlaku' : 'Dokumen Asli — Telah Dibatalkan'}</span></div>
    <dl style="display:grid;grid-template-columns:140px 1fr;gap:8px;margin:0"><dt class="muted">Penerbit</dt><dd style="margin:0" class="bold">${esc(r.namaOrg)}</dd><dt class="muted">Nomor surat</dt><dd style="margin:0" class="mono bold">${esc(r.nomor)}</dd><dt class="muted">Jenis</dt><dd style="margin:0">${esc(r.jenis)}</dd><dt class="muted">Tanggal terbit</dt><dd style="margin:0">${fdate(r.tanggalTerbit)}</dd><dt class="muted">Status</dt><dd style="margin:0">${badge(r.status)}</dd></dl>`;
}
function formVerifikasi(box, awal) {
  render(box, `<div class="field"><label>Tautan QR atau kode verifikasi</label><input class="in" id="vk-in" placeholder="Tempel tautan dari QR, atau ketik: ID#KODE" value="${esc(awal || '')}"></div><button class="btn primary" id="vk-go" style="width:100%">${ico('search')} Periksa Keaslian</button><div id="vk-out" style="margin-top:16px"></div>`);
  const cek = async (id, k) => { const out = $('#vk-out'); render(out, '<div class="skel big"></div>'); render(out, hasilVerifikasi(await api('getVerifikasiPublik', { id, k }))); };
  $('#vk-go').onclick = () => {
    const v = $('#vk-in').value.trim(); let id = '', k = '';
    try { const u = new URL(v); id = u.searchParams.get('cek') || ''; k = u.searchParams.get('k') || ''; } catch (e) { const p = v.split(/[#\s]+/); id = p[0] || ''; k = p[1] || ''; }
    if (!id || !k) return toast('Format tidak dikenali. Gunakan tautan dari QR atau ID#KODE.', 'err'); cek(id, k);
  };
  return cek;
}
PAGES.cek = async (el, params) => {
  render(el, `${pageHead('Cek Keaslian Surat', 'Periksa apakah sebuah surat benar diterbitkan oleh sistem ini.')}<div class="card" style="max-width:640px;margin-top:16px" id="cek-box"></div>`);
  const cek = formVerifikasi($('#cek-box')); if (params.id && params.k) { const out = $('#vk-out'); render(out, hasilVerifikasi(await api('getVerifikasiPublik', { id: params.id, k: params.k }))); }
};
function tampilPublik(id, k) {
  tampil('pub');
  render($('#pub'), `<div class="pub"><div class="brand" style="padding:0 0 14px"><div class="logo">${ico('mail-check')}</div><div><b>e-Surat</b><small>Verifikasi Keaslian Dokumen</small></div></div><div class="card" id="pub-box"></div><div style="text-align:center;margin-top:16px"><button class="btn" id="pub-back">Masuk ke aplikasi</button></div></div>`);
  formVerifikasi($('#pub-box'));
  if (id && k) api('getVerifikasiPublik', { id, k }).then(r => render($('#vk-out'), hasilVerifikasi(r)));
  $('#pub-back').onclick = () => { history.replaceState(null, '', location.pathname); TOKEN ? mulaiApp() : tampilLogin(); };
}

// =====================================================================
// BANTUAN
// =====================================================================
PAGES.bantuan = async (el) => {
  const q = (t, j) => `<details class="card" style="margin-bottom:10px"><summary class="bold" style="cursor:pointer">${esc(t)}</summary><div class="muted" style="margin-top:8px">${j}</div></details>`;
  render(el, `${pageHead('Bantuan', 'Panduan singkat penggunaan Sistem Persuratan.')}<div style="margin-top:16px;max-width:760px">
    ${q('Bagaimana cara mengajukan surat?', 'Buka <b>Ajukan Surat</b>, pilih jenis, isi formulir, lalu klik “Ajukan Surat Sekarang”. Admin akan memberi nomor, lalu pimpinan menyetujui.')}
    ${q('Apa arti status surat?', '<b>Diajukan</b>: menunggu admin. <b>Diproses</b>: sedang diperiksa/diberi nomor. <b>Menunggu Verifikasi</b>: menunggu tanda tangan pimpinan. <b>Terbit</b>: sah dan dapat diunduh. <b>Ditolak/Dibatalkan</b>: lihat catatan.')}
    ${q('Bagaimana memeriksa keaslian surat?', 'Pindai QR pada surat, atau buka menu <b>Cek Keaslian Surat</b> dan tempel tautannya. Siapa pun dapat memeriksa tanpa login.')}
    ${q('Saya lupa kata sandi NIP', 'Hubungi admin untuk membuat sandi sementara. Anda akan diminta menggantinya saat masuk.')}
    ${q('Akun Gmail saya menunggu persetujuan', 'Akun Gmail umum perlu disetujui admin sebelum dapat dipakai. Hubungi admin organisasi Anda.')}</div>`);
};

// =====================================================================
// INISIALISASI
// =====================================================================
(async function init() {
  const q = new URLSearchParams(location.search);
  api('ping'); // warmup lapis 2: bangunkan server sejak halaman dibuka
  if (q.get('cek') && q.get('k')) return tampilPublik(q.get('cek'), q.get('k'));
  if (TOKEN) { const ok = await mulaiApp(); if (ok) return; return; }
  tampilLogin();
})();
