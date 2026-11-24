/* Halaman: Dashboard, Buat Surat (generator + pratinjau real-time), Surat Saya + detail, Persetujuan (PIN). */
(function () {
  'use strict';
  var U = window.SKU, S = window.SK, esc = U.esc, ic = U.ic, $ = U.$, $$ = U.$$, R = U.Router;
  function M() { return S.master || { unit: [], pejabat: [], klasifikasi: [], jenis: [], template: [], pengguna: [], kop: [] }; }
  function namaJenis(id) { var j = U.byId(M().jenis, id); return j ? j.nama : '—'; }
  function namaUnit(id) { var u = U.byId(M().unit, id); return u ? u.nama : '—'; }
  function kodeJenis(id) { var j = U.byId(M().jenis, id); return j ? j.kode : ''; }
  function kodeUnit(id) { var u = U.byId(M().unit, id); return u ? u.kode : ''; }
  var ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  function cobaLagi(view, e, fn) { view.innerHTML += '<div class="callout bad" style="margin-top:12px">' + ic('error') + '<div>' + esc(e.message) + ' <button class="btn sm" id="ulang">Coba lagi</button></div></div>'; var b = $('#ulang', view); if (b) b.onclick = fn; }

  // ============================================================ Pratinjau real-time (struktur template + isian)
  var TAG_OK = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, UL: 1, OL: 1, LI: 1, P: 1, BR: 1, DIV: 1 };
  function sanitasi(html) {
    var t = document.createElement('template'); t.innerHTML = String(html || '');
    (function jalan(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 1) {
          if (!TAG_OK[c.tagName]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT)$/.test(c.tagName)) { c.remove(); return; } jalan(c); while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); return; }
          var netral = c.tagName === 'B' && /font-weight\s*:\s*(normal|400)/i.test(c.getAttribute('style') || '');
          Array.prototype.slice.call(c.attributes).forEach(function (a) { c.removeAttribute(a.name); });
          jalan(c);
          if (netral) { while (c.firstChild) c.parentNode.insertBefore(c.firstChild, c); c.remove(); }
        } else if (c.nodeType !== 3) c.remove();
      });
    })(t.content);
    return t.innerHTML;
  }
  function polos(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }
  function terbilang(n) {
    n = Math.floor(Math.abs(Number(n) || 0));
    var s = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
    function t(x) { if (x < 12) return s[x]; if (x < 20) return t(x - 10) + ' belas'; if (x < 100) return t(Math.floor(x / 10)) + ' puluh ' + t(x % 10); if (x < 200) return 'seratus ' + t(x - 100); if (x < 1000) return t(Math.floor(x / 100)) + ' ratus ' + t(x % 100); if (x < 2000) return 'seribu ' + t(x - 1000); if (x < 1e6) return t(Math.floor(x / 1000)) + ' ribu ' + t(x % 1000); if (x < 1e9) return t(Math.floor(x / 1e6)) + ' juta ' + t(x % 1e6); return t(Math.floor(x / 1e9)) + ' miliar ' + t(x % 1e9); }
    return n === 0 ? 'nol' : t(n).replace(/\s+/g, ' ').trim();
  }
  function ribuan(n) { return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function pengubah(v, p) {
    v = v === undefined || v === null ? '' : v; var tglDiatur = false;
    String(p || '').split('|').forEach(function (x) {
      x = x.trim(); if (!x) return; var nm = x.split(':')[0].toLowerCase(), arg = x.slice(nm.length + 1);
      if (nm === 'bawaan' && String(v) === '') v = arg; else if (nm === 'kapital') v = String(v).toUpperCase(); else if (nm === 'kecil') v = String(v).toLowerCase();
      else if (nm === 'judul') v = String(v).toLowerCase().replace(/\b\w/g, function (h) { return h.toUpperCase(); }); else if (nm === 'rupiah') v = 'Rp' + ribuan(v);
      else if (nm === 'ribuan') v = ribuan(v); else if (nm === 'terbilang') v = terbilang(v) + (arg === 'rupiah' ? ' rupiah' : ''); else if (nm === 'tanggal') { tglDiatur = true; if (/^\d{4}-\d{2}-\d{2}/.test(v)) v = U.tglPanjang(v); }
    });
    if (!tglDiatur && /^\d{4}-\d{2}-\d{2}$/.test(String(v))) v = U.tglPanjang(v);
    return String(v);
  }
  var POLA = /\{\{\s*([#?\/]?)\s*([A-Za-z][A-Za-z0-9_.]*)\s*(?:\|\s*([^}]*?))?\s*\}\}/g;
  function kosongNilai(v) { return v === undefined || v === null || (Array.isArray(v) ? !v.length : String(polos(v) || v).trim() === ''); }
  function gantiTeks(teks, data, ctx) {
    var out = '', akhir = 0; teks = String(teks || ''); POLA.lastIndex = 0; var m;
    while ((m = POLA.exec(teks))) {
      out += esc(teks.slice(akhir, m.index)).replace(/\n/g, '<br>'); akhir = m.index + m[0].length;
      var k = m[2].toUpperCase();
      if (m[1]) continue;
      if (/^TTD(_\d+)?$/.test(k)) { out += ctx.final ? '' : '<span class="slot-img">' + (ctx.ttdLabel || 'Spesimen TTD<br>saat disetujui') + '</span>'; continue; }
      if (k === 'QR') { out += '<span class="slot-img qr">' + ic('qr_code_2') + '<br>QR verifikasi</span>'; continue; }
      var v = data[k];
      if (kosongNilai(v)) { var lbl = ctx.label[k]; out += lbl ? '<span class="ph-kosong">' + esc(lbl) + '</span>' : esc(pengubah('', m[3])); continue; }
      var hasil = esc(pengubah(Array.isArray(v) ? v.join(', ') : v, m[3])).replace(/\n/g, '<br>');
      out += ctx.fokus === k ? '<span class="ph-v">' + hasil + '</span>' : hasil;
    }
    return out + esc(teks.slice(akhir)).replace(/\n/g, '<br>');
  }
  /** struktur: [{k:'p'|'li'|'tbl'|'hr', t, a, b, u, z, r, bw}]; data: KUNCI→nilai; skema: {bidang} */
  function renderKertas(struktur, data, skema, ctx) {
    ctx = ctx || {}; ctx.label = {}; var naskah = {}, daftar = {};
    (skema.bidang || []).forEach(function (b) { if (b.wajib || b.tipe === 'naskah') ctx.label[b.kunci] = '[' + b.label + ']'; if (b.tipe === 'naskah') naskah[b.kunci] = 1; if (b.tipe === 'daftar') daftar[b.kunci] = b; });
    ['PERIHAL', 'TUJUAN'].forEach(function (k) { ctx.label[k] = '[' + (k === 'PERIHAL' ? 'Perihal' : 'Tujuan') + ']'; });
    var html = '', lewati = null;
    (struktur || []).forEach(function (p) {
      var t = p.t || (p.r ? p.r.map(function (r) { return r.join(' '); }).join(' ') : '');
      if (lewati) { if (new RegExp('\\{\\{\\s*/\\s*' + lewati + '\\s*\\}\\}', 'i').test(t)) lewati = null; return; }
      var syarat = /\{\{\s*\?\s*([A-Za-z][A-Za-z0-9_.]*)\s*\}\}/.exec(t);
      if (syarat && kosongNilai(data[syarat[1].toUpperCase()])) { if (!new RegExp('\\{\\{\\s*/\\s*' + syarat[1] + '\\s*\\}\\}', 'i').test(t)) lewati = syarat[1]; return; }
      if (p.k === 'hr' || p.hr) { html += '<hr>'; if (p.k === 'hr') return; }
      if (p.k === 'tbl') {
        var baris = [];
        (p.r || []).forEach(function (row) {
          var blok = null; row.forEach(function (c) { var mm = /\{\{\s*#\s*([A-Za-z][A-Za-z0-9_]*)/.exec(c); if (mm) blok = mm[1].toUpperCase(); });
          if (blok) {
            var items = Array.isArray(data[blok]) && data[blok].length ? data[blok] : [{}];
            items.forEach(function (it, i) {
              var d2 = Object.assign({}, data, { NO: String(i + 1) }); Object.keys(it).forEach(function (kk) { d2[blok + '.' + kk.toUpperCase()] = it[kk]; });
              (daftar[blok] && daftar[blok].kolom || []).forEach(function (kk) { ctx.label[blok + '.' + kk.kunci] = '[' + kk.label + ']'; });
              baris.push('<tr>' + row.map(function (c) { return '<td>' + gantiTeks(c, d2, ctx) + '</td>'; }).join('') + '</tr>');
            });
          } else baris.push('<tr>' + row.map(function (c) { return '<td>' + gantiTeks(c, data, ctx) + '</td>'; }).join('') + '</tr>');
        });
        html += '<table class="' + (p.bw ? 'bd' : '') + '">' + baris.join('') + '</table>'; return;
      }
      var gaya = (p.b ? 'font-weight:700;' : '') + (p.u ? 'text-decoration:underline;' : '') + (p.z ? 'font-size:' + Math.round(p.z * 1.08) + 'px;' : '');
      var satu = /^\s*\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}\s*$/.exec(t);
      if (satu && naskah[satu[1].toUpperCase()]) {
        var k = satu[1].toUpperCase(), isi = data[k];
        html += kosongNilai(isi) ? '<p class="j"><span class="ph-kosong">' + esc(ctx.label[k]) + '</span></p>' : '<div class="j' + (ctx.fokus === k ? ' ph-v' : '') + '">' + sanitasi(isi) + '</div>';
        return;
      }
      html += (p.k === 'li' ? '<p class="' + p.a + '" style="' + gaya + 'padding-left:18px">• ' : '<p class="' + p.a + '" style="' + gaya + '">') + gantiTeks(t, data, ctx) + '</p>';
    });
    var kls = /Rahasia/.test(ctx.klas || '') ? '<div class="kls">' + esc(String(ctx.klas).toUpperCase()) + '</div>' : '';
    return '<div class="paper">' + (ctx.watermark ? '<div class="wm">' + esc(ctx.watermark) + '</div>' : '') + kls + html + '</div>';
  }
  function dataPratinjau(f, isian) {
    var cfg = S.cfg, pj = U.byId(M().pejabat, f.idPejabat) || {}, now = new Date(), tb = (f.tembusan || []).filter(Boolean);
    var d = {
      NOMOR: f.nomor || formatNomorPreview(f), TANGGAL: f.tanggal ? U.tglPanjang(f.tanggal) : U.tglPanjang(), TAHUN: String(now.getFullYear()), BULAN: U.BULAN[now.getMonth()], BULAN_ROMAWI: ROMAWI[now.getMonth()], HARI: U.HARI[now.getDay()],
      JENIS_SURAT: namaJenis(f.idJenis), UNIT_NAMA: namaUnit(f.idUnit), UNIT_KODE: kodeUnit(f.idUnit), PERIHAL: f.perihal, TUJUAN: f.tujuan, SIFAT: f.klasifikasi || 'Biasa',
      TEMBUSAN: tb.map(function (x, i) { return (i + 1) + '. ' + x; }).join('\n'), NAMA_PEJABAT: pj.nama || '', JABATAN: pj.jabatan || '', NIP: pj.nip || '', KODE_VERIFIKASI: '(terbit saat disetujui)'
    };
    ['NAMA_PEJABAT', 'JABATAN', 'NIP'].forEach(function (k) { d[k + '_1'] = d[k]; });
    Object.keys(cfg).forEach(function (k) { if (/^INSTITUSI_/.test(k)) d[k] = cfg[k]; });
    Object.keys(isian || {}).forEach(function (k) { if (d[k] === undefined || k === 'LAMPIRAN') d[k] = isian[k]; });
    return d;
  }
  function formatNomorPreview(f) {
    var now = new Date();
    return String(S.cfg.FORMAT_NOMOR_BAWAAN || '{no}/{kode_jenis}/{kode_unit}/{bulan_romawi}/{tahun}').replace(/\{no\}/g, '#').replace(/\{kode_jenis\}/g, kodeJenis(f.idJenis))
      .replace(/\{kode_unit\}/g, kodeUnit(f.idUnit)).replace(/\{bulan_romawi\}/g, ROMAWI[now.getMonth()]).replace(/\{bulan\}/g, ('0' + (now.getMonth() + 1)).slice(-2)).replace(/\{tahun\}/g, now.getFullYear()).replace(/\{singkat\}/g, S.cfg.INSTITUSI_SINGKAT || '');
  }
  window.Pratinjau = { render: renderKertas, data: dataPratinjau, sanitasi: sanitasi };

  // ============================================================ Dashboard
  R.add('dashboard', {
    title: 'Dashboard',
    render: function (view) {
      var me = S.me;
      view.innerHTML = U.judul({ title: me.role === 'pemohon' ? 'Dashboard Saya' : 'Dashboard Surat', icon: 'folder', sub: U.sapa() + ', <b>' + esc(me.nama) + '</b> • ' + U.HARI[new Date().getDay()] + ', ' + U.tglPanjang() + ' • ' + esc(me.labelPeran) }) +
        '<div id="dash">' + U.skel(1, 150) + U.skel(1, 110) + U.skel(1, 260) + '</div>';
      U.Data.ambil('dash.data', {}, { maxAge: 30000, onData: function (d) { gambarDash(view, d); } }).catch(function (e) { $('#dash', view).innerHTML = ''; cobaLagi(view, e, function () { R.jalan(); }); });
    }
  });
  function folderKartu(o) {
    return '<button class="folder ' + (o.on ? 'on' : '') + '" data-go="' + o.href + '"><div class="eyebrow"><span>' + esc(o.label) + '</span>' + ic(o.icon) + '</div><div class="big num">' + o.nilai + ' ' + esc(o.satuan) + '</div><div class="foot">' + (o.kiri || '<span></span>') + '<span>' + (o.kanan || '') + '</span></div></button>';
  }
  function gambarDash(view, d) {
    var el = $('#dash', view); if (!el) return;
    var q = d.quick, k = d.kpi, g = d.grafik, me = S.me, b = S.badge || {};
    var av = function (list) { return '<div class="avatars">' + (list || []).map(function (n) { return U.avatar(n); }).join('') + '</div>'; };
    var kartu = [
      { label: me.role === 'pemohon' ? 'Pengajuan Saya' : 'Menunggu Persetujuan', icon: 'timer', nilai: q.persetujuan, satuan: 'Surat', href: me.role === 'approver' ? '#/persetujuan' : me.role === 'pemohon' ? '#/surat' : '#/agenda?status=Diajukan', on: true, kiri: av(q.persetujuanAvatar), kanan: q.persetujuan ? 'Prioritas hari ini' : 'Tidak ada antrean' },
      { label: 'Disposisi Saya', icon: 'move_to_inbox', nilai: q.disposisi, satuan: 'Disposisi', href: '#/disposisi', kanan: q.dispoDekat ? '<span class="warn-t">● ' + q.dispoDekat + ' Deadline</span>' : 'Aman' },
      { label: 'Draf Saya', icon: 'edit_note', nilai: q.draf, satuan: 'Draf', href: '#/surat', kanan: q.drafTerakhir ? 'Diedit ' + U.lalu(q.drafTerakhir) : 'Belum ada draf' },
      me.role === 'pemohon' ? { label: 'Buat Surat', icon: 'add_circle', nilai: '+', satuan: 'Baru', href: '#/buat', kanan: 'Dari template resmi' }
        : { label: 'Jatuh Tempo Retensi', icon: 'event_busy', nilai: q.retensi, satuan: 'Arsip', href: '#/retensi', kiri: ic('folder_open'), kanan: q.retensiLewat ? '<span class="warn-t">' + q.retensiLewat + ' lewat tempo</span>' : 'Batas simpan ' + (S.cfg.RETENSI_PERINGATAN_HARI || 90) + ' hari' }
    ];
    var naik = k.keluarBulanLalu ? Math.round((k.keluarBulanIni - k.keluarBulanLalu) / k.keluarBulanLalu * 100) : null;
    var jamTtd = k.rataJam || 0, ttdVal = jamTtd >= 24 ? (Math.round(jamTtd / 2.4) / 10) : jamTtd, ttdSat = jamTtd >= 24 ? 'Hari' : 'Jam';
    var bulanIni = new Date().getMonth();
    var jenisItems = g.jenis.slice(0, 4).map(function (x, i) { return { label: x.label, nilai: x.nilai, color: ['--s1', '--s2', '--s3', '--s4'][i] }; });
    var sisaJenis = g.jenis.slice(4).reduce(function (a, x) { return a + x.nilai; }, 0); if (sisaJenis) jenisItems.push({ label: 'Lainnya', nilai: sisaJenis, color: '--s5' });
    el.innerHTML =
      '<div class="sec-h"><div class="eyebrow">Akses Cepat (Quick Access)</div><a class="link-btn" href="#/agenda">Buka Buku Agenda</a></div>' +
      '<div class="qa">' + kartu.map(folderKartu).join('') + '</div>' +
      '<div class="kpis">' +
      '<div class="kpi"><div class="eyebrow">Total surat keluar (bulan ini)</div><div class="val num">' + k.keluarBulanIni + (naik !== null ? '<span class="trend ' + (naik < 0 ? 'down' : '') + '">' + ic(naik < 0 ? 'trending_down' : 'trending_up') + ' ' + (naik > 0 ? '+' : '') + naik + '%</span>' : '') + '</div><div class="meta">Dibandingkan ' + U.BULAN[(bulanIni + 11) % 12] + ' (' + k.keluarBulanLalu + ')</div><div style="position:absolute;right:18px;top:26px">' + Charts.spark(g.perBulan.keluar.slice(0, bulanIni + 1)) + '</div></div>' +
      '<div class="kpi"><div class="eyebrow">Rata-rata waktu TTD</div><div class="val num">' + ttdVal + ' <small>' + ttdSat + '</small></div><div class="meta" style="color:' + (jamTtd <= 48 ? 'var(--green)' : 'var(--rev)') + '">' + ic(jamTtd <= 48 ? 'check_circle' : 'schedule') + ' ' + (jamTtd <= 48 ? 'Sesuai SLA (< 2 hari)' : 'Di atas SLA 2 hari') + '</div><span class="ico" style="background:var(--ok-bg);color:var(--ok)">' + ic('bolt', 'fill') + '</span></div>' +
      '<div class="kpi"><div class="eyebrow">Disposisi tepat waktu</div><div class="val num">' + (k.tepatWaktu === null ? '—' : k.tepatWaktu + '%') + ' <small style="font-size:12px">Target 90%</small></div><div class="bar"><i style="width:' + (k.tepatWaktu || 0) + '%"></i></div><div class="meta">' + k.dispoTelat + ' disposisi lewat tenggat · ' + k.tertunda + ' surat tertunda</div><span class="ico" style="background:var(--row-sel);color:var(--primary-ink)">' + ic('task_alt') + '</span></div>' +
      '</div>' +
      '<div class="charts"><div class="card"><div class="chart-h"><div><h3>Tren Pembuatan Surat ' + d.tahun + '</h3><div class="sub">Volume surat keluar (terbit) vs surat masuk per bulan</div></div><div id="lgBar"></div></div><div id="cBar"></div></div>' +
      '<div class="card"><h3>Klasifikasi Keamanan</h3><div class="sub" style="margin-bottom:14px">Distribusi tingkat kerahasiaan dokumen</div><div id="cKlas"></div><div class="note-box">Setiap surat terbit dikunci hash SHA-256 & QR verifikasi publik</div></div></div>' +
      '<div class="sec-h"><div><div class="eyebrow">Laporan statistik</div><h2>Kinerja Persuratan</h2></div></div>' +
      '<div class="charts three"><div class="card"><h3>Komposisi Jenis Surat</h3><div class="sub" style="margin-bottom:12px">Surat keluar terbit ' + d.tahun + '</div><div id="cJenis"></div></div>' +
      '<div class="card"><h3>Waktu Persetujuan</h3><div class="sub" style="margin-bottom:8px">Rata-rata jam dari diajukan → disetujui</div><div id="cTtd"></div></div>' +
      '<div class="card"><div class="chart-h"><div><h3>Status Disposisi</h3><div class="sub">Per bulan dibuat</div></div><div id="lgDispo"></div></div><div id="cDispo"></div></div></div>' +
      '<div class="sec-h"><div><div class="eyebrow">Surat terbaru (all files)</div><h2>Daftar Arsip & Sirkulasi</h2></div><a class="btn sm line" href="#/agenda">' + ic('filter_list') + 'Semua di Buku Agenda</a></div>' +
      '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Nama dokumen & perihal</th><th>Penandatangan / Pihak</th><th>Tanggal</th><th>Status</th><th>Klasifikasi</th></tr></thead><tbody>' +
      (d.terbaru.length ? d.terbaru.map(barisRingkas).join('') : '<tr><td colspan="5">' + U.kosong('Belum ada surat. Mulai dari tombol "Buat Surat Baru".', 'description') + '</td></tr>') + '</tbody></table></div></div>';
    $$('[data-go]', el).forEach(function (b) { b.onclick = function () { location.hash = b.dataset.go; }; });
    $('#lgBar', el).innerHTML = Charts.bar($('#cBar', el), { labels: U.BLN, labelPanjang: U.BULAN, sorot: bulanIni, series: [{ name: 'Surat Keluar', color: '--s1', values: g.perBulan.keluar }, { name: 'Surat Masuk', color: '--s1-soft', values: g.perBulan.masuk }], aria: 'Tren surat per bulan' });
    Charts.donut($('#cKlas', el), { items: g.klasifikasi.map(function (x, i) { return { label: x.label, nilai: x.nilai, color: ['--s1', '--s3', '--s4', '--s2'][i] }; }), aria: 'Klasifikasi keamanan' });
    Charts.donut($('#cJenis', el), { items: jenisItems.length ? jenisItems : [{ label: 'Belum ada', nilai: 0, color: '--s1' }], aria: 'Komposisi jenis surat' });
    var nb = d.tahun === new Date().getFullYear() ? bulanIni + 1 : 12;
    Charts.line($('#cTtd', el), { labels: U.BLN.slice(0, nb), labelPanjang: U.BULAN.slice(0, nb), values: g.waktuTtd.slice(0, nb), name: 'Rata-rata', satuan: 'jam', color: '--s1', height: 190 });
    $('#lgDispo', el).innerHTML = Charts.bar($('#cDispo', el), { labels: U.BLN, labelPanjang: U.BULAN, stacked: true, height: 190, series: [{ name: 'Belum', color: '--s2', values: g.dispoStatus.map(function (x) { return x.Belum || 0; }) }, { name: 'Sebagian', color: '--s4', values: g.dispoStatus.map(function (x) { return x.Sebagian || 0; }) }, { name: 'Selesai', color: '--s3', values: g.dispoStatus.map(function (x) { return x.Selesai || 0; }) }] });
    ikatBaris(el);
  }
  function barisRingkas(r) {
    var pihak = r.t === 'M' ? (r.asal || '—') : (r.pejabat || r.pemohonNama || '—');
    return '<tr data-t="' + r.t + '" data-id="' + esc(r.id) + '"><td class="c-main"><div class="doc">' + U.docIc(r) + '<div><div class="no ' + (r.nomor ? '' : 'muted') + '">' + esc(r.nomor || 'Belum bernomor') + '</div><div class="ttl">' + esc(r.perihal) + '</div></div></div></td>' +
      '<td data-l="' + (r.t === 'M' ? 'Asal' : 'Penandatangan') + '"><div class="person">' + U.avatar(pihak) + '<span>' + esc(pihak) + '</span></div></td><td data-l="Tanggal" class="when">' + U.tgl(r.tanggal || r.dibuat) + '<small>' + U.jam(r.disetujui || r.dibuat) + '</small></td><td data-l="Status">' + U.badge(r.status) + '</td><td data-l="Klasifikasi">' + U.klasBadge(r.klas) + '</td></tr>';
  }
  function ikatBaris(root) { $$('tr[data-id]', root).forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest('input,button,a')) return; location.hash = tr.dataset.t === 'M' ? '#/masuk/' + tr.dataset.id : '#/surat/' + tr.dataset.id; }; }); }
  window.SKPage = { barisRingkas: barisRingkas, ikatBaris: ikatBaris };

  // ============================================================ Buat Surat (generator)
  var F = null;   // state formulir aktif
  R.add('buat', {
    title: 'Buat Surat', renderUlang: true,
    render: function (view, arg, q) {
      F = null;
      if (arg[0]) return muatEdit(view, arg[0]);
      var tplId = q.get('tpl');
      if (tplId) return mulaiForm(view, { idTemplate: tplId });
      pilihTemplate(view);
    }
  });
  function headGen(langkah, teks) {
    return '<div class="ph"><div><div class="ph-t" style="gap:10px"><span class="eyebrow">Generator dokumen</span><span class="tag-chip">Automasi Presisi</span></div><h1 style="margin-top:4px">Buat Surat Keluar</h1></div>' +
      '<div class="step-pill"><span class="n">' + langkah + '</span><span class="t">Langkah ' + langkah + ' dari 3: ' + esc(teks) + '</span><span class="step-dots">' + [1, 2, 3].map(function (i) { return '<i class="' + (i < langkah ? 'done' : i === langkah ? 'on' : '') + '"></i>'; }).join('') + '</span></div></div>';
  }
  function pilihTemplate(view) {
    var tpl = M().template.filter(function (t) { return t.aktif; });
    var grup = {}; tpl.forEach(function (t) { (grup[t.idJenis] = grup[t.idJenis] || []).push(t); });
    var drafLokal = []; try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('sk:' + S.me.email + ':drafbaru:') === 0) { var v = JSON.parse(localStorage.getItem(k)); if (v && v.d && v.d.perihal !== undefined) drafLokal.push(v.d); } }); } catch (e) { }
    view.innerHTML = headGen(1, 'Pilih Template') +
      (drafLokal.length ? '<div class="callout info" style="margin-bottom:16px">' + ic('history') + '<div>Ada <b>' + drafLokal.length + '</b> isian yang belum disimpan di perangkat ini. ' + drafLokal.map(function (d) { return '<a href="#/buat?tpl=' + esc(d.idTemplate) + '">' + esc(d.perihal || namaJenis(d.idJenis)) + '</a>'; }).join(' · ') + '</div></div>' : '') +
      '<div class="toolbar"><label class="pill-search grow">' + ic('search') + '<input id="cariTpl" placeholder="Cari template atau jenis surat…"></label>' + (S.me.role === 'superadmin' ? '<a class="btn sm line" href="#/master/template">' + ic('settings') + 'Kelola Template</a>' : '') + '</div><div id="tplList"></div>';
    function gambar(f) {
      f = (f || '').toLowerCase();
      var html = Object.keys(grup).map(function (j) {
        var isi = grup[j].filter(function (t) { return !f || (t.nama + ' ' + namaJenis(j)).toLowerCase().indexOf(f) >= 0; });
        if (!isi.length) return '';
        return '<div class="sec-h" style="margin-top:14px"><h2 style="font-size:16px">' + esc(namaJenis(j)) + '</h2><span class="hint">' + esc(kodeJenis(j)) + '</span></div><div class="tpl-grid">' +
          isi.map(function (t) { return '<button class="tpl-card" data-tpl="' + esc(t.id) + '"><span class="ic">' + ic('description') + '</span><b>' + esc(t.nama) + '</b><span class="hint">' + t.bidang + ' kolom isian · versi ' + t.versi + '</span></button>'; }).join('') + '</div>';
      }).join('');
      $('#tplList', view).innerHTML = html || U.kosong(tpl.length ? 'Tidak ada template yang cocok.' : 'Belum ada template aktif. ' + (S.me.role === 'superadmin' ? 'Buka Master Data → Template.' : 'Hubungi Admin Tata Usaha.'), 'draft');
      $$('[data-tpl]', view).forEach(function (b) { b.onclick = function () { location.hash = '#/buat?tpl=' + b.dataset.tpl; }; });
    }
    gambar(); $('#cariTpl', view).oninput = U.debounce(function (e) { gambar(e.target.value); }, 120);
  }
  async function muatEdit(view, id) {
    view.innerHTML = headGen(2, 'Isi Formulir Template') + U.skel(3, 120);
    try {
      var r = await U.api('surat.get', { id: id });
      if (!r.success) throw new Error(r.message);
      var s = r.data;
      if (!s.bolehEdit) { U.toast('Surat berstatus ' + s.status + ' tidak bisa diubah.', 'err'); location.hash = '#/surat/' + id; return; }
      mulaiForm(view, { id: s.id, idTemplate: s.idTemplate, idJenis: s.jenis, idUnit: s.unit, kodeKlasifikasi: s.kodeKlas, klasifikasi: s.klas, perihal: s.perihal, tujuan: s.tujuan, tembusan: s.tembusan || [], idPejabat: s.idPejabat, aksesKhusus: s.aksesKhusus || '', isian: s.isian || {}, status: s.status, catatanRevisi: s.catatanRevisi, nomor: s.nomor });
    } catch (e) { view.innerHTML = headGen(2, 'Isi Formulir'); cobaLagi(view, e, function () { muatEdit(view, id); }); }
  }
  async function mulaiForm(view, awal) {
    view.innerHTML = headGen(2, 'Isi Formulir Template') + '<div class="gen"><div>' + U.skel(3, 140) + '</div><div>' + U.skel(1, 500) + '</div></div>';
    var t;
    try { t = await U.Data.ambil('template.get', { id: awal.idTemplate }, { maxAge: 600000 }); }
    catch (e) { view.innerHTML = headGen(2, 'Isi Formulir'); return cobaLagi(view, e, function () { mulaiForm(view, awal); }); }
    var drafKey = 'drafbaru:' + awal.idTemplate, simpanan = !awal.id ? U.Store.get(drafKey) : null;
    var jenis = U.byId(M().jenis, t.idJenis) || {};
    var unitSaya = S.me.unit && U.byId(M().unit, S.me.unit) ? S.me.unit : (M().unit[0] || {}).id;
    F = Object.assign({ idTemplate: t.id, idJenis: t.idJenis, idUnit: unitSaya, kodeKlasifikasi: jenis.klasDefault, klasifikasi: 'Biasa', perihal: '', tujuan: '', tembusan: [], idPejabat: '', aksesKhusus: '', isian: {} }, awal, simpanan && simpanan.d ? simpanan.d : {});
    F.tpl = t; F.fokus = '';
    gambarForm(view, !!(simpanan && simpanan.d));
  }
  function opsiSelect(list, nilai, label, val) { return list.map(function (x) { var v = val(x); return '<option value="' + esc(v) + '"' + (String(v) === String(nilai) ? ' selected' : '') + '>' + esc(label(x)) + '</option>'; }).join(''); }
  function inputBidang(b, v) {
    var id = 'f_' + b.kunci, wajib = b.wajib ? ' <span class="req">*</span>' : '';
    var lbl = '<label for="' + id + '"><span>' + esc(b.label) + wajib + ' <span class="hint" style="font-weight:400">{{' + esc(b.kunci) + '}}</span></span>' + (b.tipe === 'naskah' ? '<span class="hint" id="cnt_' + b.kunci + '"></span>' : '') + '</label>';
    var bantu = b.bantu ? '<span class="hint">' + esc(b.bantu) + '</span>' : '';
    v = v === undefined || v === null ? '' : v;
    if (b.tipe === 'naskah') return '<div class="field" data-k="' + esc(b.kunci) + '">' + lbl + '<div class="editor"><div class="editor-tb">' + [['format_bold', 'bold'], ['format_italic', 'italic'], ['format_underlined', 'underline'], ['format_list_bulleted', 'insertUnorderedList'], ['format_list_numbered', 'insertOrderedList'], ['format_clear', 'removeFormat']].map(function (x) { return '<button type="button" data-cmd="' + x[1] + '" aria-label="' + x[1] + '">' + ic(x[0]) + '</button>'; }).join('') + '</div><div class="editor-isi" id="' + id + '" contenteditable="true" data-ph="Tulis isi surat di sini…">' + sanitasi(v) + '</div></div>' + bantu + '</div>';
    if (b.tipe === 'daftar') {
      var rows = Array.isArray(v) && v.length ? v : [{}];
      return '<div class="field" data-k="' + esc(b.kunci) + '">' + lbl + '<div style="overflow-x:auto"><table class="daftar-tbl" id="' + id + '"><thead><tr><th>No</th>' + (b.kolom || []).map(function (k) { return '<th>' + esc(k.label) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        rows.map(function (r, i) { return barisDaftar(b, r, i); }).join('') + '</tbody></table></div><button type="button" class="btn sm line" data-tambah="' + esc(b.kunci) + '" style="justify-self:start">' + ic('add') + 'Tambah baris</button>' + bantu + '</div>';
    }
    if (b.tipe === 'area') return '<div class="field">' + lbl + '<textarea class="textarea" id="' + id + '" data-k="' + esc(b.kunci) + '">' + esc(v) + '</textarea>' + bantu + '</div>';
    if (b.tipe === 'pilihan') return '<div class="field">' + lbl + '<select class="select" id="' + id + '" data-k="' + esc(b.kunci) + '"><option value="">— pilih —</option>' + (b.opsi || []).map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' + bantu + '</div>';
    var tipe = { tanggal: 'date', angka: 'number' }[b.tipe] || 'text';
    return '<div class="field">' + lbl + '<input class="input" id="' + id + '" data-k="' + esc(b.kunci) + '" type="' + tipe + '" value="' + esc(v) + '"' + (b.tipe === 'gambar' ? ' placeholder="Tempel ID/URL gambar Google Drive"' : '') + '>' + bantu + '</div>';
  }
  function barisDaftar(b, r, i) { return '<tr><td class="num">' + (i + 1) + '</td>' + (b.kolom || []).map(function (k) { return '<td><input class="input" data-kol="' + esc(k.kunci) + '" value="' + esc(r[k.kunci] || '') + '"></td>'; }).join('') + '<td><button type="button" class="icon-btn" data-hapus aria-label="Hapus baris">' + ic('delete') + '</button></td></tr>'; }

  function gambarForm(view, dariLokal) {
    var t = F.tpl, sk = t.skema || { bidang: [] }, m = M(), jenis = U.byId(m.jenis, F.idJenis) || {};
    var pejabat = m.pejabat.filter(function (p) { return p.berlaku; });
    var tte = String(jenis.tte).toLowerCase() === 'ya';
    var klasObj = U.byId(m.klasifikasi, F.kodeKlasifikasi, 'kode');
    view.innerHTML = headGen(2, 'Isi Formulir Template') +
      (F.status === 'Revisi' && F.catatanRevisi ? '<div class="callout rev" style="margin-bottom:16px">' + ic('rate_review') + '<div><b>Catatan revisi dari pejabat:</b> ' + esc(F.catatanRevisi) + '</div></div>' : '') +
      (dariLokal ? '<div class="callout info" style="margin-bottom:16px">' + ic('history') + '<div>Isian sebelumnya dipulihkan dari perangkat ini. <button class="link-btn" id="buangLokal">Mulai dari kosong</button></div></div>' : '') +
      '<div class="gen"><form id="formSurat" autocomplete="off" novalidate>' +
      '<div class="tpl-bar"><span class="ic">' + ic('description') + '</span><div style="min-width:0;flex:1"><div class="eyebrow">Template aktif</div><b>' + esc(t.nama) + '</b></div>' + (F.id ? '' : '<a class="btn line sm" href="#/buat">' + ic('sync') + 'Ganti Template</a>') + '</div>' +
      '<div class="panel"><div class="panel-in"><div class="panel-h"><h3>1. Klasifikasi Tata Persuratan & Keamanan</h3><span class="hint">ID: ' + esc(jenis.kode || '') + '</span></div>' +
      '<div class="grid2"><div class="field"><label>Jenis Surat <span class="req">*</span></label><select class="select" id="fJenis">' + opsiSelect(m.jenis.filter(function (j) { return j.status === 'Aktif'; }), F.idJenis, function (j) { return j.nama; }, function (j) { return j.id; }) + '</select></div>' +
      '<div class="field"><label><span>Kode Klasifikasi Arsip <span class="req">*</span></span><span class="ret-tag" id="retTag">' + (klasObj ? 'Retensi ' + klasObj.retensi + ' Thn' : '') + '</span></label><select class="select" id="fKlasArsip">' + opsiSelect(m.klasifikasi, F.kodeKlasifikasi, function (k) { return k.kode + ' — ' + k.uraian; }, function (k) { return k.kode; }) + '</select></div></div>' +
      '<div class="field"><label>Unit Kerja Penerbit <span class="req">*</span></label><select class="select" id="fUnit">' + opsiSelect(m.unit.filter(function (u) { return u.status === 'Aktif'; }), F.idUnit, function (u) { return u.kode + ' — ' + u.nama; }, function (u) { return u.id; }) + '</select></div>' +
      '<div class="field"><label>Tingkat Keamanan Distribusi Dokumen</label><div class="seg" id="fKlas">' + ['Biasa', 'Terbatas', 'Rahasia', 'Sangat Rahasia'].map(function (k, i) { return '<button type="button" data-v="' + k + '" class="' + (F.klasifikasi === k ? 'on' : '') + '"><i style="background:' + ['var(--primary)', 'var(--s4)', 'var(--s2)', 'var(--red)'][i] + '"></i>' + k + '</button>'; }).join('') + '</div></div>' +
      '<div class="field" id="boxAkses"' + (F.klasifikasi === 'Biasa' ? ' hidden' : '') + '><label>Penerima internal yang ditunjuk <span class="hint">(email, pisahkan koma — boleh melihat dokumen ini)</span></label><input class="input" id="fAkses" value="' + esc(F.aksesKhusus) + '" placeholder="kabag.keuangan@instansi.ac.id"></div>' +
      '<div class="nomor-box"><span class="ic">' + ic('lock') + '</span><div><b id="nomorPrev">' + esc(F.nomor || formatNomorPreview(F)) + '</b><span class="mini-tag">' + (F.nomor ? 'SUDAH DIALOKASIKAN' : 'ALOKASI OTOMATIS') + '</span><p>Nomor urut resmi dialokasikan secara atomik (LockService) saat ' + (S.cfg.NOMOR_SAAT === 'ajukan' ? 'surat diajukan' : 'disetujui oleh pejabat penanda tangan') + '. Nomor batal tidak pernah dipakai ulang.</p></div></div>' +
      '</div></div>' +
      '<div class="panel"><div class="panel-in"><div class="panel-h"><h3>2. Parameter Isi Dokumen</h3><span class="tag-chip">TAGS {{…}}</span></div>' +
      '<div class="grid2"><div class="field"><label>Tanggal Surat</label><input class="input" value="Otomatis saat ditandatangani" disabled></div>' +
      '<div class="field"><label for="fTujuan">Yth / Penerima <span class="req">*</span></label><input class="input" id="fTujuan" value="' + esc(F.tujuan) + '" placeholder="Kepala Biro Perencanaan dan Keuangan" maxlength="500"></div></div>' +
      '<div class="field"><label>Tembusan (Cc)</label><div class="chips" id="fTembusan"></div></div>' +
      '<div class="field"><label for="fPerihal">Perihal <span class="req">*</span></label><input class="input" id="fPerihal" value="' + esc(F.perihal) + '" placeholder="Undangan Pembahasan …" maxlength="300"></div>' +
      sk.bidang.map(function (b) { return inputBidang(b, F.isian[b.kunci]); }).join('') +
      '<div class="field"><label><span>Pejabat Penandatangan <span class="req">*</span></span><span class="badge ' + (tte ? 'b-sent' : 'b-ok') + '">' + (tte ? 'TTE Tersertifikasi (Fase 2)' : 'Persetujuan Internal + QR') + '</span></label><select class="select" id="fPejabat"><option value="">— pilih pejabat —</option>' +
      opsiSelect(pejabat, F.idPejabat, function (p) { return p.nama + ' — ' + p.jabatan + (p.nip ? ' (NIP ' + p.nip + ')' : ''); }, function (p) { return p.id; }) + '</select>' +
      (tte ? '<span class="hint">Jenis surat ini ditandai memerlukan TTE tersertifikasi (BSrE) — pada MVP disahkan dengan Persetujuan Internal + QR.</span>' : '') + '</div>' +
      '</div></div>' +
      '<div class="actions-bar"><button type="button" class="btn" id="bDraf">' + ic('bookmark') + 'Simpan Draf</button><button type="button" class="btn" id="bPdf">' + ic('picture_as_pdf') + 'Pratinjau PDF</button><span style="flex:1"></span><button type="button" class="btn pri lg" id="bAjukan">Ajukan untuk Persetujuan ' + ic('arrow_forward') + '</button></div>' +
      '</form><div class="preview-col"><div class="preview-h"><span class="eyebrow live">Pratinjau dokumen real-time</span><span class="hint">Skala A4 · ' + esc(t.nama) + '</span></div><div class="paper-box" id="paperBox"></div></div></div>';

    var form = $('#formSurat', view);
    var lb = $('#buangLokal', view); if (lb) lb.onclick = function () { U.Store.del('drafbaru:' + F.idTemplate); mulaiForm(view, { idTemplate: F.idTemplate }); };
    // Tembusan chips
    var chipBox = $('#fTembusan', view);
    function gambarChip() {
      chipBox.innerHTML = F.tembusan.map(function (x, i) { return '<span class="chip">' + ic('person') + esc(x) + '<button type="button" data-i="' + i + '" aria-label="Hapus ' + esc(x) + '">' + ic('close') + '</button></span>'; }).join('') + '<input id="inTembusan" placeholder="+ Tambah tembusan, tekan Enter" list="dlTembusan"><datalist id="dlTembusan">' + M().pejabat.map(function (p) { return '<option value="' + esc(p.jabatan) + '">'; }).join('') + '</datalist>';
      $$('[data-i]', chipBox).forEach(function (b) { b.onclick = function () { F.tembusan.splice(+b.dataset.i, 1); gambarChip(); segar(); }; });
      var inp = $('#inTembusan', chipBox);
      inp.onkeydown = function (e) { if ((e.key === 'Enter' || e.key === ',') && inp.value.trim()) { e.preventDefault(); var v = inp.value.trim().replace(/,$/, ''); inp.value = ''; F.tembusan.push(v); gambarChip(); segar(); $('#inTembusan', chipBox).focus(); } if (e.key === 'Backspace' && !inp.value && F.tembusan.length) { F.tembusan.pop(); gambarChip(); segar(); $('#inTembusan', chipBox).focus(); } };
      inp.onblur = function () { var v = inp.value.trim(); if (v && document.body.contains(inp)) { inp.value = ''; F.tembusan.push(v); gambarChip(); segar(); } };
    }
    gambarChip();
    // seg klasifikasi
    $$('#fKlas button', view).forEach(function (b) { b.onclick = function () { F.klasifikasi = b.dataset.v; $$('#fKlas button', view).forEach(function (x) { x.classList.toggle('on', x === b); }); $('#boxAkses', view).hidden = F.klasifikasi === 'Biasa'; segar(); }; });
    // editor naskah
    $$('.editor', view).forEach(function (ed) {
      var isi = $('.editor-isi', ed);
      $$('[data-cmd]', ed).forEach(function (b) { b.onmousedown = function (e) { e.preventDefault(); document.execCommand(b.dataset.cmd, false, null); segar(); }; });
      isi.addEventListener('paste', function (e) { var h = e.clipboardData.getData('text/html'), tx = e.clipboardData.getData('text/plain'); e.preventDefault(); document.execCommand('insertHTML', false, h ? sanitasi(h) : esc(tx).replace(/\n/g, '<br>')); });
    });
    // daftar
    view.addEventListener('click', function (e) {
      var tb = e.target.closest('[data-tambah]'); if (tb) { var b = sk.bidang.filter(function (x) { return x.kunci === tb.dataset.tambah; })[0], body = $('#f_' + b.kunci + ' tbody', view); body.insertAdjacentHTML('beforeend', barisDaftar(b, {}, body.children.length)); segar(); }
      var hp = e.target.closest('[data-hapus]'); if (hp) { var tr = hp.closest('tr'), tbody = tr.parentNode; if (tbody.children.length > 1) tr.remove(); else $$('input', tr).forEach(function (i) { i.value = ''; }); $$('tr', tbody).forEach(function (r, i) { r.firstChild.textContent = i + 1; }); segar(); }
    });
    form.addEventListener('focusin', function (e) { var k = e.target.dataset.k || (e.target.closest('[data-k]') || {}).dataset; F.fokus = typeof k === 'string' ? k : k && k.k ? k.k : ({ fTujuan: 'TUJUAN', fPerihal: 'PERIHAL' })[e.target.id] || ''; segar(); });
    form.addEventListener('input', segar); form.addEventListener('change', segar);
    $('#fJenis', view).onchange = function () { var j = U.byId(M().jenis, this.value); if (j && j.klasDefault) $('#fKlasArsip', view).value = j.klasDefault; segar(); };
    $('#bDraf', view).onclick = function () { kirim(this, false); };
    $('#bAjukan', view).onclick = function () { kirim(this, true); };
    $('#bPdf', view).onclick = function () { var btn = this; baca(); U.sibuk(btn, async function () { var r = await U.api('surat.pratinjau', { form: payload() }, { timeout: 120000 }); if (!r.success) return U.toast(r.message, 'err'); U.tampilDokumen(r.data, 'Pratinjau PDF (draf)'); }); };
    segar();
  }
  function baca() {
    var v = function (id) { var e = $('#' + id); return e ? e.value.trim() : ''; };
    F.idJenis = v('fJenis'); F.kodeKlasifikasi = v('fKlasArsip'); F.idUnit = v('fUnit'); F.tujuan = v('fTujuan'); F.perihal = v('fPerihal'); F.idPejabat = v('fPejabat'); F.aksesKhusus = v('fAkses');
    (F.tpl.skema.bidang || []).forEach(function (b) {
      var el = $('#f_' + b.kunci); if (!el) return;
      if (b.tipe === 'naskah') { F.isian[b.kunci] = sanitasi(el.innerHTML); var c = $('#cnt_' + b.kunci); if (c) c.textContent = 'Karakter: ' + polos(el.innerHTML).length; }
      else if (b.tipe === 'daftar') F.isian[b.kunci] = $$('tbody tr', el).map(function (tr) { var o = {}; $$('[data-kol]', tr).forEach(function (i) { o[i.dataset.kol] = i.value.trim(); }); return o; }).filter(function (o) { return Object.keys(o).some(function (k) { return o[k]; }); });
      else if (b.tipe === 'gambar') { var m = el.value.match(/[-\w]{25,}/); F.isian[b.kunci] = m ? m[0] : el.value.trim(); }
      else F.isian[b.kunci] = el.value.trim();
    });
  }
  var segar = U.debounce(function () {
    if (!F || !$('#paperBox')) return;
    baca();
    var k = U.byId(M().klasifikasi, F.kodeKlasifikasi, 'kode'), rt = $('#retTag'); if (rt) rt.textContent = k ? 'Retensi ' + k.retensi + ' Thn' : '';
    if (!F.nomor) $('#nomorPrev').textContent = formatNomorPreview(F);
    $('#paperBox').innerHTML = renderKertas(F.tpl.struktur, dataPratinjau(F, F.isian), F.tpl.skema, { fokus: F.fokus, watermark: 'DRAF', klas: F.klasifikasi });
    if (!F.id) U.Store.set('drafbaru:' + F.idTemplate, { t: Date.now(), d: payload() });
  }, 90);
  function payload() { return { id: F.id || '', idTemplate: F.idTemplate, idJenis: F.idJenis, idUnit: F.idUnit, kodeKlasifikasi: F.kodeKlasifikasi, klasifikasi: F.klasifikasi, perihal: F.perihal, tujuan: F.tujuan, tembusan: F.tembusan.slice(), idPejabat: F.idPejabat, aksesKhusus: F.aksesKhusus, isian: Object.assign({}, F.isian) }; }
  function cekWajib() {
    var salah = [];
    if (!F.tujuan) salah.push(['fTujuan', 'Tujuan / Penerima']); if (!F.perihal) salah.push(['fPerihal', 'Perihal']);
    (F.tpl.skema.bidang || []).forEach(function (b) { var v = F.isian[b.kunci]; if (b.wajib && (b.tipe === 'daftar' ? !(v && v.length) : b.tipe === 'naskah' ? !polos(v) : !String(v || '').trim())) salah.push(['f_' + b.kunci, b.label]); });
    if (!F.idPejabat) salah.push(['fPejabat', 'Pejabat penandatangan']);
    $$('.bad').forEach(function (e) { e.classList.remove('bad'); });
    salah.forEach(function (s) { var e = $('#' + s[0]); if (e) (e.classList.contains('editor-isi') ? e.parentNode : e).classList.add('bad'); });
    if (salah.length) { var e0 = $('#' + salah[0][0]); if (e0) e0.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return salah.map(function (s) { return s[1]; });
  }
  async function kirim(btn, ajukan) {
    baca();
    if (ajukan) { var salah = cekWajib(); if (salah.length) return U.toast('Lengkapi dulu: ' + salah.join(', '), 'err'); var pj = U.byId(M().pejabat, F.idPejabat); if (!(await U.konfirmasi({ title: 'Ajukan surat?', msg: 'Surat akan dikirim ke ' + (pj ? pj.nama + ' (' + pj.jabatan + ')' : 'pejabat') + ' untuk disetujui dengan PIN. Setelah diajukan, isi tidak bisa diubah kecuali dikembalikan untuk revisi.', okText: 'Ya, ajukan' }))) return; }
    else if (!F.perihal) { U.toast('Isi perihal dulu agar draf mudah ditemukan.', 'err'); $('#fPerihal').focus(); return; }
    await U.sibuk(btn, async function () {
      var p = payload(); p.ajukan = !!ajukan;
      var r = await U.api('surat.simpan', p);
      if (!r.success) return U.toast(r.message, 'err');
      U.Store.del('drafbaru:' + F.idTemplate);
      U.Data.basi(['surat.list', 'dash.data', 'agenda.list', 'surat.get']);
      App.segarBadge();
      U.toast(r.message, 'ok');
      if (ajukan) location.hash = '#/surat/' + r.data.id;
      else if (!F.id) { F.id = r.data.id; history.replaceState(null, '', '#/buat/' + r.data.id); }
    });
  }

  // ============================================================ Surat Saya
  var tabSaya = 'semua';
  R.add('surat', {
    title: 'Surat Saya',
    render: function (view, arg) {
      view.innerHTML = U.judul({ title: 'Surat Saya', icon: 'outbox', sub: 'Draf, pengajuan, dan surat terbit yang Anda buat.', aksi: '<a class="btn pri" href="#/buat">' + ic('add') + 'Buat Surat</a>' }) +
        '<div class="toolbar"><div class="tabs" id="tabSaya"></div><span class="grow"></span><label class="pill-search">' + ic('search') + '<input id="cariSaya" placeholder="Cari perihal / nomor…"></label></div><div id="listSaya">' + U.skel(5) + '</div>';
      var data = [];
      function gambar() {
        var f = ($('#cariSaya', view).value || '').toLowerCase(), grup = { semua: data, draf: [], menunggu: [], terbit: [], batal: [] };
        data.forEach(function (r) { (r.status === 'Draf' || r.status === 'Revisi' ? grup.draf : r.status === 'Diajukan' || r.status === 'Disetujui' ? grup.menunggu : r.status === 'Dibatalkan' ? grup.batal : grup.terbit).push(r); });
        $('#tabSaya', view).innerHTML = [['semua', 'Semua'], ['draf', 'Draf & Revisi'], ['menunggu', 'Menunggu'], ['terbit', 'Terbit'], ['batal', 'Dibatalkan']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tabSaya === t[0] ? 'on' : '') + '">' + t[1] + ' (' + grup[t[0]].length + ')</button>'; }).join('');
        $$('#tabSaya button', view).forEach(function (b) { b.onclick = function () { tabSaya = b.dataset.t; gambar(); }; });
        var list = grup[tabSaya].filter(function (r) { return !f || (r.perihal + ' ' + (r.nomor || '') + ' ' + r.tujuan).toLowerCase().indexOf(f) >= 0; });
        $('#listSaya', view).innerHTML = '<div class="tbl-wrap cards"><div class="tbl-scroll"><table class="tbl"><thead><tr><th>Nomor & perihal</th><th>Penanda tangan</th><th>Diubah</th><th>Status</th><th>Klasifikasi</th></tr></thead><tbody>' +
          (list.length ? list.map(function (r) { return barisRingkas(Object.assign({}, r, { tanggal: r.diubah })); }).join('') : '<tr><td colspan="5">' + U.kosong('Belum ada surat di sini.', 'drafts') + '</td></tr>') + '</tbody></table></div></div>';
        ikatBaris(view);
      }
      $('#cariSaya', view).oninput = U.debounce(gambar, 120);
      U.Data.ambil('surat.list', { lingkup: 'saya' }, { maxAge: 20000, onData: function (d) { data = d; gambar(); } }).catch(function (e) { $('#listSaya', view).innerHTML = ''; cobaLagi(view, e, function () { R.jalan(); }); });
      if (arg[0]) bukaDetail(arg[0]);
    },
    argBerubah: function (view, arg) { if (arg[0]) bukaDetail(arg[0]); }
  });

  // ============================================================ Detail surat (drawer)
  function timeline(s) {
    var urut = [['Dibuat', 'edit_document', s.dibuat], ['Diajukan', 'send', s.diajukan], ['Disetujui', 'verified', s.disetujui], ['Ditandatangani', 'qr_code_2', s.status === 'Ditandatangani' || s.status === 'Dikirim' || s.status === 'Diarsipkan' ? s.disetujui : ''], ['Dikirim', 'local_shipping', (s.ekspedisi || [])[0] ? s.ekspedisi[0].tanggal : ''], ['Diarsipkan', 'inventory_2', s.status === 'Diarsipkan' ? s.diubah : '']];
    var idx = { Draf: 0, Revisi: 0, Diajukan: 1, Disetujui: 2, Ditandatangani: 3, Dikirim: 4, Diarsipkan: 5, Dibatalkan: -1 }[s.status];
    var html = urut.map(function (u, i) { var cls = s.status === 'Dibatalkan' ? (u[2] ? 'done' : '') : i < idx ? 'done' : i === idx ? 'cur' : ''; return '<div class="tl-i ' + cls + '"><span class="tl-d">' + ic(cls === 'done' ? 'check' : u[1]) + '</span><div><b>' + u[0] + (i === 0 && s.status === 'Revisi' ? ' · dikembalikan untuk revisi' : '') + '</b><small>' + (u[2] ? U.tgl(u[2]) + ' ' + U.jam(u[2]) : '—') + '</small></div></div>'; }).join('');
    if (s.status === 'Dibatalkan') html += '<div class="tl-i bad"><span class="tl-d">' + ic('block') + '</span><div><b>Dibatalkan</b><small>' + esc(s.alasanBatal || '') + ' · ' + U.tgl(s.diubah) + '</small></div></div>';
    return '<div class="tl">' + html + '</div>';
  }
  async function bukaDetail(id, opsi) {
    opsi = opsi || {};
    var dw = U.drawer({ eyebrow: 'Detail surat keluar', title: 'Memuat…', body: U.skel(4, 70), onClose: function (esc_) { if (!opsi.tanpaHash && /^#\/(surat|persetujuan)\//.test(location.hash)) history.replaceState(null, '', location.hash.replace(/\/[^\/]+$/, '')); } });
    try {
      var s = await U.Data.ambil('surat.get', { id: id }, { maxAge: 0 });
      gambarDetail(dw, s);
    } catch (e) { dw.isi({ title: 'Tidak dapat dibuka', body: '<div class="callout bad">' + ic('error') + esc(e.message) + '</div>' }); }
  }
  async function gambarDetail(dw, s) {
    var pj = s.ttd || {}, tb = (s.tembusan || []).join(', ');
    var body = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + U.badge(s.status) + U.klasBadge(s.klas) + '<span class="badge plain b-sent">' + esc(s.tte === 'Internal' ? 'Persetujuan Internal' : s.tte) + '</span></div>' +
      (s.status === 'Revisi' && s.catatanRevisi ? '<div class="callout rev">' + ic('rate_review') + '<div><b>Catatan revisi:</b> ' + esc(s.catatanRevisi) + '</div></div>' : '') +
      (s.akses.tertutup ? '<div class="callout bad">' + ic('lock') + '<div>Dokumen <b>' + esc(s.klas) + '</b>: Anda hanya dapat melihat nomor dan tanggal.</div></div>' : '') +
      '<dl class="kv"><dt>Perihal</dt><dd>' + esc(s.perihal) + '</dd><dt>Tujuan</dt><dd>' + esc(s.tujuan || '—') + '</dd>' + (tb ? '<dt>Tembusan</dt><dd>' + esc(tb) + '</dd>' : '') +
      '<dt>Jenis / Unit</dt><dd>' + esc(namaJenis(s.jenis)) + ' · ' + esc(namaUnit(s.unit)) + '</dd><dt>Klasifikasi arsip</dt><dd>' + esc(s.kodeKlas || '—') + (s.retensi ? ' · retensi s.d. ' + U.tgl(s.retensi) : '') + '</dd>' +
      '<dt>Pemohon</dt><dd>' + esc(s.pemohonNama) + '</dd><dt>Penanda tangan</dt><dd>' + esc(pj.nama || s.pejabat || '—') + (pj.jabatan ? ' — ' + esc(pj.jabatan) : '') + (pj.waktu ? '<br><span class="hint">' + esc(pj.metode) + ' · ' + U.tgl(pj.waktu) + ' ' + U.jam(pj.waktu) + '</span>' : '') + '</dd>' +
      (s.kodeVerifikasi ? '<dt>Verifikasi</dt><dd><a href="' + esc(s.urlVerifikasi) + '" target="_blank" rel="noopener">' + esc(s.kodeVerifikasi) + ' ↗</a></dd><dt>SHA-256</dt><dd class="num" style="font-size:12px">' + esc(s.hash || '') + '</dd>' : '') + '</dl>' +
      '<div><div class="eyebrow" style="margin-bottom:10px">Alur status</div>' + timeline(s) + '</div>' +
      (s.isian ? '<div><div class="eyebrow" style="margin-bottom:10px">Isi surat (pratinjau)</div><div class="paper-box" id="detPaper">' + U.skel(1, 300) + '</div></div>' : '') +
      (s.ekspedisi && s.ekspedisi.length ? '<div><div class="eyebrow" style="margin-bottom:8px">Buku ekspedisi</div>' + s.ekspedisi.map(function (x) { return '<div class="check">' + ic('local_shipping') + '<div><b>' + esc(x.cara) + '</b> → ' + esc(x.penerima) + '<br><span class="hint">' + U.tgl(x.tanggal) + (x.adaBukti ? ' · ada bukti terima' : '') + '</span></div></div>'; }).join('') + '</div>' : '') +
      (s.riwayat && s.riwayat.length ? '<details><summary class="eyebrow" style="cursor:pointer">Riwayat versi (' + s.riwayat.length + ')</summary>' + s.riwayat.map(function (v) { return '<div class="hint" style="padding:6px 0;border-bottom:1px solid var(--line)">v' + v.versi + ' · ' + U.tgl(v.waktu) + ' ' + U.jam(v.waktu) + ' · ' + esc(v.oleh) + ' — ' + esc(v.catatan) + '</div>'; }).join('') + '</details>' : '');
    var a = [];
    if (s.bolehEdit) a.push('<a class="btn" href="#/buat/' + esc(s.id) + '">' + ic('edit') + 'Ubah</a>');
    if (s.bolehEdit) a.push('<button class="btn pri" data-a="ajukan">' + ic('send') + 'Ajukan</button>');
    if (s.bolehSetujui) { a.push('<button class="btn warn" data-a="revisi">' + ic('undo') + 'Minta Revisi</button>'); a.push('<button class="btn ok" data-a="setujui">' + ic('verified') + 'Setujui (PIN)</button>'); }
    if (s.status === 'Disetujui' && (S.me.role === 'superadmin' || s.bolehSetujui || (s.pejabatEmail === S.me.email))) a.push('<button class="btn pri" data-a="terbit">' + ic('refresh') + 'Terbitkan ulang PDF</button>');
    if (s.akses.isi && s.adaPdf) a.push('<button class="btn line" data-a="pdf">' + ic('picture_as_pdf') + (s.akses.unduh ? 'Lihat / Unduh PDF' : 'Lihat PDF') + '</button>');
    else if (s.akses.isi && !s.adaPdf && s.status !== 'Dibatalkan') a.push('<button class="btn line" data-a="pratinjau">' + ic('picture_as_pdf') + 'Pratinjau PDF</button>');
    if (s.urlVerifikasi) a.push('<button class="btn line" data-a="salin">' + ic('link') + 'Salin tautan verifikasi</button>');
    if (S.me.role === 'superadmin' && (s.status === 'Ditandatangani' || s.status === 'Dikirim')) a.push('<a class="btn line" href="#/distribusi?surat=' + esc(s.id) + '">' + ic('local_shipping') + 'Kirim / Ekspedisi</a>');
    if (s.bolehBatal) a.push('<button class="btn danger" data-a="batal">' + ic('block') + 'Batalkan</button>');
    dw.isi({ title: s.nomor || 'Belum bernomor', body: body, foot: a.join('') });
    var el = dw.el;
    $$('[data-a]', el).forEach(function (b) { b.onclick = function () { aksiSurat(b.dataset.a, s, b, dw); }; });
    if (s.isian && s.idTemplate) {
      try { var t = await U.Data.ambil('template.get', { id: s.idTemplate }, { maxAge: 600000 }); var box = $('#detPaper', el); if (box) box.innerHTML = renderKertas(t.struktur, dataPratinjau({ idJenis: s.jenis, idUnit: s.unit, perihal: s.perihal, tujuan: s.tujuan, tembusan: s.tembusan, klasifikasi: s.klas, idPejabat: s.idPejabat, nomor: s.nomor, tanggal: s.tanggal && s.adaPdf ? s.tanggal : '' }, s.isian), t.skema, { klas: s.klas, final: s.adaPdf, ttdLabel: 'Tanda tangan', watermark: s.adaPdf ? '' : 'DRAF' }); }
      catch (e) { var bx = $('#detPaper', el); if (bx) bx.innerHTML = '<div class="hint">Pratinjau tidak tersedia: ' + esc(e.message) + '</div>'; }
    }
  }
  async function aksiSurat(aksi, s, btn, dw) {
    var setelah = function (r) { if (!r.success) { U.toast(r.message, 'err'); return false; } U.toast(r.message || 'Berhasil.', 'ok'); U.Data.basi(['surat.list', 'surat.get', 'dash.data', 'agenda.list']); App.segarBadge(); if (dw) { dw.close(true); } R.jalan(); return true; };
    if (aksi === 'ajukan') { if (await U.konfirmasi({ title: 'Ajukan surat?', msg: 'Surat dikirim ke pejabat penanda tangan untuk disetujui.', okText: 'Ajukan' })) await U.sibuk(btn, async function () { setelah(await U.api('surat.ajukan', { id: s.id })); }); }
    if (aksi === 'batal') { var al = await U.konfirmasi({ title: 'Batalkan surat ' + (s.nomor || '') + '?', msg: s.nomor ? 'Nomor ' + s.nomor + ' akan ditandai batal di registri dan tidak dipakai ulang. QR verifikasi akan menampilkan status "Dibatalkan".' : 'Surat akan dibatalkan.', danger: true, okText: 'Batalkan surat', input: { label: 'Alasan pembatalan', min: 5, ph: 'Contoh: salah tujuan, diganti surat baru' } }); if (al) await U.sibuk(btn, async function () { setelah(await U.api('surat.batal', { id: s.id, alasan: al })); }); }
    if (aksi === 'revisi') { var cat = await U.konfirmasi({ title: 'Minta revisi', msg: 'Surat dikembalikan ke pemohon beserta catatan Anda.', okText: 'Kembalikan', input: { label: 'Catatan revisi (wajib)', min: 5, ph: 'Bagian yang perlu diperbaiki…' } }); if (cat) await U.sibuk(btn, async function () { setelah(await U.api('surat.revisi', { id: s.id, catatan: cat })); }); }
    if (aksi === 'setujui') setujuiDenganPin(s, setelah);
    if (aksi === 'terbit') await U.sibuk(btn, async function () { setelah(await U.api('surat.terbitUlang', { id: s.id }, { timeout: 180000 })); });
    if (aksi === 'pdf') await U.sibuk(btn, async function () { var r = await U.api('surat.pdf', { id: s.id, lihat: !s.akses.unduh }); if (!r.success) return U.toast(r.message, 'err'); U.tampilDokumen(r.data, s.nomor); });
    if (aksi === 'pratinjau') await U.sibuk(btn, async function () { var r = await U.api('surat.pratinjau', { id: s.id }, { timeout: 120000 }); if (!r.success) return U.toast(r.message, 'err'); U.tampilDokumen(r.data, 'Pratinjau ' + (s.nomor || 'draf')); });
    if (aksi === 'salin') { try { await navigator.clipboard.writeText(s.urlVerifikasi); U.toast('Tautan verifikasi disalin.', 'ok'); } catch (e) { prompt('Salin tautan ini:', s.urlVerifikasi); } }
  }
  /** Persetujuan: PIN belum ada → minta dibuat dulu. */
  function setujuiDenganPin(s, setelah) {
    if (S.me.pejabat && !S.me.pejabat.pinAda) return App.aturPin(function () { setujuiDenganPin(s, setelah); });
    U.dialogPin({
      nomor: s.nomor || ('#/' + kodeJenis(s.jenis) + '/' + kodeUnit(s.unit) + '/' + ROMAWI[new Date().getMonth()] + '/' + new Date().getFullYear()),
      onKirim: async function (pin) {
        var r = await U.api('surat.setujui', { id: s.id, pin: pin }, { timeout: 180000 });
        if (r.success) { setelah(r); if (r.data && r.data.adaPdf) suksesTerbit(r.data); return { ok: true }; }
        if (r.code === 'PIN_BELUM') { App.aturPin(function () { setujuiDenganPin(s, setelah); }); return { ok: true }; }
        return { ok: false, pesan: r.message, kunci: r.code === 'PIN_LOCKED' };
      }
    });
  }
  function suksesTerbit(s) {
    var m = U.modal({ body: '<div style="text-align:center"><div class="lock-ic" style="background:var(--ok-bg);color:var(--ok)">' + ic('verified', 'fill') + '</div><h2>Surat Disahkan</h2><p style="color:var(--muted)">Nomor <b style="color:var(--ink)">' + esc(s.nomor) + '</b> telah terbit dengan QR verifikasi dan hash SHA-256.</p></div>', foot: '<button class="btn" data-x>Tutup</button><button class="btn pri" data-pdf>' + ic('picture_as_pdf') + 'Lihat PDF Final</button>' });
    m.el.querySelector('.modal-f').classList.add('even');
    $('[data-x]', m.el).onclick = function () { m.close(); };
    $('[data-pdf]', m.el).onclick = function () { var b = this; U.sibuk(b, async function () { var r = await U.api('surat.pdf', { id: s.id, lihat: true }); if (r.success) { m.close(); U.tampilDokumen(r.data, s.nomor); } else U.toast(r.message, 'err'); }); };
  }
  window.SKSurat = { bukaDetail: bukaDetail, setujuiDenganPin: setujuiDenganPin, renderKertas: renderKertas, dataPratinjau: dataPratinjau };

  // ============================================================ Persetujuan (approver)
  var tabSetuju = 'menunggu', pilihId = null;
  R.add('persetujuan', {
    title: 'Persetujuan', roles: ['approver'],
    render: function (view, arg) {
      pilihId = arg[0] || null;
      view.innerHTML = U.judul({ title: 'Persetujuan & Tanda Tangan', chip: '<span class="badge b-wait" id="chipTunggu">Memuat…</span>', sub: 'Otorisasi persuratan resmi dengan PIN, penerbitan QR verifikasi, dan permintaan revisi.', aksi: '<a class="btn line" href="#/disposisi">' + ic('move_to_inbox') + 'Disposisi</a><a class="btn line" href="#/pengaturan/pin">' + ic('password') + 'PIN Saya</a>' }) +
        '<div class="split" id="splitSetuju"><div><div class="toolbar" style="padding:8px"><div class="tabs" id="tabSetuju"></div></div><div class="qlist" id="qlist">' + U.skel(4, 110) + '</div></div><div id="qdet"></div></div>';
      var data = [];
      function gambar() {
        var g = { menunggu: [], disetujui: [], revisi: [], batal: [] };
        data.forEach(function (r) { (r.status === 'Diajukan' ? g.menunggu : r.status === 'Revisi' ? g.revisi : r.status === 'Dibatalkan' ? g.batal : g.disetujui).push(r); });
        $('#chipTunggu', view).textContent = g.menunggu.length + ' Menunggu Keputusan Anda';
        $('#tabSetuju', view).innerHTML = [['menunggu', 'Menunggu'], ['disetujui', 'Disetujui'], ['revisi', 'Revisi'], ['batal', 'Batal']].map(function (t) { return '<button data-t="' + t[0] + '" class="' + (tabSetuju === t[0] ? 'on' : '') + '">' + t[1] + ' (' + g[t[0]].length + ')</button>'; }).join('');
        $$('#tabSetuju button', view).forEach(function (b) { b.onclick = function () { tabSetuju = b.dataset.t; pilihId = null; gambar(); }; });
        var list = g[tabSetuju];
        $('#qlist', view).innerHTML = list.length ? list.map(function (r) {
          return '<button class="qcard ' + (r.id === pilihId ? 'on' : '') + '" data-id="' + esc(r.id) + '"><div class="top"><span class="badge plain b-sent">' + esc(namaJenis(r.jenis)) + '</span>' + U.badge(r.status) + (r.klas !== 'Biasa' ? U.klasBadge(r.klas) : '') + '<span class="time">' + U.lalu(r.diajukan || r.diubah) + '</span></div>' +
            '<div class="no">' + esc(r.nomor || 'Nomor terbit saat disetujui') + '</div><div class="ttl">' + esc(r.perihal) + '</div><div class="by">' + U.avatar(r.pemohonNama) + esc(r.pemohonNama) + ' • ' + esc(namaUnit(r.unit)) + '</div></button>';
        }).join('') : U.kosong(tabSetuju === 'menunggu' ? 'Tidak ada surat yang menunggu persetujuan Anda. 🎉' : 'Kosong.', 'task_alt');
        $$('.qcard', view).forEach(function (b) { b.onclick = function () { pilihId = b.dataset.id; history.replaceState(null, '', '#/persetujuan/' + pilihId); $$('.qcard', view).forEach(function (x) { x.classList.toggle('on', x === b); }); detail(view, pilihId); }; });
        if (!pilihId && list.length && window.innerWidth >= 1100) pilihId = list[0].id;
        if (pilihId) detail(view, pilihId); else $('#qdet', view).innerHTML = window.innerWidth >= 1100 ? '<div class="det-panel">' + U.kosong('Pilih surat di sebelah kiri.', 'touch_app') + '</div>' : '';
      }
      U.Data.ambil('surat.list', { lingkup: 'persetujuan' }, { maxAge: 15000, onData: function (d) { data = d; gambar(); } }).catch(function (e) { $('#qlist', view).innerHTML = ''; cobaLagi(view, e, function () { R.jalan(); }); });
    },
    argBerubah: function (view, arg) { if (arg[0]) { pilihId = arg[0]; detail(view, arg[0]); } }
  });
  async function detail(view, id) {
    var box = $('#qdet', view); if (!box) return;
    var kecil = window.innerWidth < 1100;
    if (kecil) { return bukaDetail(id, { tanpaHash: false }); }
    box.innerHTML = '<div class="det-panel">' + U.skel(1, 90) + U.skel(1, 420) + '</div>';
    try {
      var s = await U.Data.ambil('surat.get', { id: id }, { maxAge: 0 });
      if (pilihId !== id) return;
      var t = s.isian ? await U.Data.ambil('template.get', { id: s.idTemplate }, { maxAge: 600000 }) : null;
      box.innerHTML = '<div class="det-panel"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span class="ms" style="color:var(--primary-ink)">article</span><b>Pratinjau Naskah Dinas Resmi</b><span class="badge b-sent plain">' + esc(namaJenis(s.jenis)) + '</span><span style="flex:1"></span><button class="btn sm line" id="bLihatPdf">' + ic('picture_as_pdf') + (s.adaPdf ? 'PDF Final' : 'Pratinjau PDF') + '</button><button class="btn sm ghost" id="bDetail">' + ic('open_in_new') + 'Detail</button></div>' +
        '<div class="meta-grid"><div><small>Pemohon</small><b>' + esc(s.pemohonNama) + '</b></div><div><small>Klasifikasi</small><b>' + esc(s.kodeKlas) + '</b></div><div><small>Sifat surat</small><b>' + esc(s.klas) + '</b></div><div><small>Status</small><b>' + U.badge(s.status) + '</b></div></div>' +
        (s.catatanRevisi && s.status === 'Revisi' ? '<div class="callout rev">' + ic('rate_review') + esc(s.catatanRevisi) + '</div>' : '') +
        '<div class="paper-box" style="max-height:62vh">' + (t ? renderKertas(t.struktur, dataPratinjau({ idJenis: s.jenis, idUnit: s.unit, perihal: s.perihal, tujuan: s.tujuan, tembusan: s.tembusan, klasifikasi: s.klas, idPejabat: s.idPejabat, nomor: s.nomor }, s.isian), t.skema, { klas: s.klas, ttdLabel: 'Tanda tangan Anda' }) : U.kosong('Isi tidak dapat ditampilkan.', 'lock')) + '</div>' +
        (s.bolehSetujui ? '<div class="sticky-acts"><button class="btn warn lg" id="bRevisi">' + ic('undo') + 'Minta Revisi</button><button class="btn ok lg" id="bSetuju">' + ic('verified') + 'Setujui & Tanda Tangani (PIN)</button></div>' : '') + '</div>';
      var setelah = function (r) { if (!r.success) { U.toast(r.message, 'err'); return; } U.toast(r.message, 'ok'); var list = U.Data.peek('surat.list', { lingkup: 'persetujuan' }); if (list) U.Data.simpan('surat.list', { lingkup: 'persetujuan' }, list.map(function (x) { return x.id === s.id ? Object.assign({}, x, r.data) : x; })); U.Data.basi(['surat.list', 'surat.get', 'dash.data', 'agenda.list']); App.segarBadge(); pilihId = null; R.jalan(); };
      $('#bLihatPdf', box).onclick = function () { aksiSurat(s.adaPdf ? 'pdf' : 'pratinjau', s, this); };
      $('#bDetail', box).onclick = function () { bukaDetail(s.id, { tanpaHash: true }); };
      if (s.bolehSetujui) {
        $('#bSetuju', box).onclick = function () { setujuiDenganPin(s, setelah); };
        $('#bRevisi', box).onclick = async function () { var b = this, cat = await U.konfirmasi({ title: 'Minta revisi', msg: 'Surat dikembalikan ke ' + s.pemohonNama + ' beserta catatan.', okText: 'Kembalikan', input: { label: 'Catatan revisi (wajib)', min: 5 } }); if (cat) U.sibuk(b, async function () { setelah(await U.api('surat.revisi', { id: s.id, catatan: cat })); }); };
      }
    } catch (e) { box.innerHTML = '<div class="det-panel"><div class="callout bad">' + ic('error') + esc(e.message) + '</div></div>'; }
  }
})();
