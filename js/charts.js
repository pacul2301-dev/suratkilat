/* Grafik SVG ringan tanpa pustaka: batang berkelompok, batang bertumpuk, garis, donat, sparkline.
   Aturan: warna kategori urutan tetap (--s1..--s5), ujung data membulat 4px berjangkar di garis dasar,
   jarak 2px antar-isian, grid samar, legenda selalu ada untuk ≥2 seri, tooltip saat hover, tabel data tersedia. */
(function () {
  'use strict';
  var U = window.SKU, esc = U.esc;
  var NS = 'http://www.w3.org/2000/svg';
  function warna(v) { return 'var(' + v + ')'; }
  function langkahBulat(max) { if (max <= 4) return 1; var p = Math.pow(10, Math.floor(Math.log10(max))), n = max / p; return (n <= 2 ? 0.5 : n <= 5 ? 1 : 2) * p; }
  function batangAtas(x, y, w, yb, r) { r = Math.min(r, w / 2, Math.max(0, yb - y)); if (yb - y <= 0.5) return ''; return 'M' + x + ',' + yb + 'L' + x + ',' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'L' + (x + w - r) + ',' + y + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'L' + (x + w) + ',' + yb + 'Z'; }
  function tabelData(labels, series, satuan) {
    return '<details class="data-tbl"><summary>Lihat tabel data</summary><div style="overflow-x:auto"><table><thead><tr><th></th>' + series.map(function (s) { return '<th>' + esc(s.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      labels.map(function (l, i) { return '<tr><td>' + esc(l) + '</td>' + series.map(function (s) { return '<td class="num">' + (s.values[i] || 0) + (satuan ? ' ' + satuan : '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>';
  }
  function legenda(series) { return series.length < 2 ? '' : '<div class="legend">' + series.map(function (s) { return '<span><i style="background:' + warna(s.color) + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div>'; }
  function pasang(el, gambar) {
    el.classList.add('chart'); gambar();
    if (window.ResizeObserver && !el._ro) { var w0 = el.clientWidth; el._ro = new ResizeObserver(function () { if (Math.abs(el.clientWidth - w0) > 8) { w0 = el.clientWidth; gambar(); } }); el._ro.observe(el); }
  }
  function tip(el, html, x, y) { var t = el.querySelector('.tip'); if (!t) { t = document.createElement('div'); t.className = 'tip'; el.appendChild(t); } t.innerHTML = html; t.style.left = x + 'px'; t.style.top = y + 'px'; t.hidden = false; }
  function tipHilang(el) { var t = el.querySelector('.tip'); if (t) t.hidden = true; }

  /** Batang berkelompok atau bertumpuk. o: { labels, series:[{name,color,values}], height, stacked, satuan, sorot } */
  function bar(el, o) {
    pasang(el, function () {
      var W = Math.max(280, el.clientWidth), H = o.height || 230, pl = 34, pr = 6, pt = 10, pb = 26, n = o.labels.length, S = o.series;
      var tot = o.labels.map(function (_, i) { return S.reduce(function (a, s) { return a + (s.values[i] || 0); }, 0); });
      var max = Math.max(1, o.stacked ? Math.max.apply(null, tot) : Math.max.apply(null, S.map(function (s) { return Math.max.apply(null, s.values.concat([0])); })));
      var step = langkahBulat(max), top = Math.ceil(max / step) * step, iw = W - pl - pr, ih = H - pt - pb, gw = iw / n;
      var bw = o.stacked ? Math.min(28, gw * 0.5) : Math.min(14, (gw * 0.62) / S.length), y = function (v) { return pt + ih - v / top * ih; };
      var s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.aria || 'Grafik batang') + '">';
      for (var g = 0; g <= top; g += step) s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="axis" x="' + (pl - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>';
      o.labels.forEach(function (lab, i) {
        var cx = pl + gw * i + gw / 2;
        if (o.stacked) {
          var dasar = 0;
          S.forEach(function (sr, j) {
            var v = sr.values[i] || 0; if (!v) return;
            var y1 = y(dasar + v), y0 = y(dasar) - (dasar ? 2 : 0), atas = j === S.length - 1 || !S.slice(j + 1).some(function (x) { return x.values[i]; });
            s += atas ? '<path d="' + batangAtas(cx - bw / 2, y1, bw, y0, 4) + '" fill="' + warna(sr.color) + '"/>' : '<rect x="' + (cx - bw / 2) + '" y="' + y1 + '" width="' + bw + '" height="' + Math.max(0, y0 - y1) + '" fill="' + warna(sr.color) + '"/>';
            dasar += v;
          });
        } else {
          var lebar = S.length * bw + (S.length - 1) * 2;
          S.forEach(function (sr, j) { var v = sr.values[i] || 0, x = cx - lebar / 2 + j * (bw + 2); s += '<path d="' + batangAtas(x, y(v), bw, y(0), 4) + '" fill="' + warna(sr.color) + '"' + (o.sorot !== undefined && o.sorot !== i ? ' opacity=".55"' : '') + '/>'; });
        }
        s += '<text class="axis" x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle"' + (o.sorot === i ? ' style="font-weight:700;fill:var(--primary-ink)"' : '') + '>' + esc(lab) + '</text>';
        s += '<rect class="hit" data-i="' + i + '" x="' + (pl + gw * i) + '" y="' + pt + '" width="' + gw + '" height="' + ih + '"/>';
      });
      s += '</svg>';
      el.innerHTML = s + tabelData(o.labels, S, o.satuan);
      el.querySelectorAll('.hit').forEach(function (h) {
        h.addEventListener('mouseenter', function () {
          var i = +h.dataset.i, cx = pl + gw * i + gw / 2;
          tip(el, '<b>' + esc(o.labelPanjang ? o.labelPanjang[i] : o.labels[i]) + '</b>' + S.map(function (sr) { return '<div><i style="background:' + warna(sr.color) + '"></i>' + esc(sr.name) + ': <b style="display:inline">' + (sr.values[i] || 0) + '</b>' + (o.satuan ? ' ' + o.satuan : '') + '</div>'; }).join(''), cx, y(o.stacked ? tot[i] : Math.max.apply(null, S.map(function (sr) { return sr.values[i] || 0; }))));
          h.style.fill = 'color-mix(in srgb, var(--primary) 6%, transparent)';
        });
        h.addEventListener('mouseleave', function () { tipHilang(el); h.style.fill = ''; });
      });
    });
    return legenda(o.series);
  }

  /** Garis satu seri dengan crosshair & tooltip. o: { labels, values, name, color, satuan, height } */
  function line(el, o) {
    pasang(el, function () {
      var W = Math.max(280, el.clientWidth), H = o.height || 200, pl = 34, pr = 10, pt = 14, pb = 26, n = o.labels.length;
      var max = Math.max(1, Math.max.apply(null, o.values)), step = langkahBulat(max), top = Math.ceil(max / step) * step, iw = W - pl - pr, ih = H - pt - pb;
      var x = function (i) { return pl + (n === 1 ? iw / 2 : iw * i / (n - 1)); }, y = function (v) { return pt + ih - v / top * ih; };
      var s = '<svg width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.aria || o.name) + '">';
      for (var g = 0; g <= top; g += step) s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y(g) + '" y2="' + y(g) + '"/><text class="axis" x="' + (pl - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end">' + g + '</text>';
      var d = o.values.map(function (v, i) { return (i ? 'L' : 'M') + x(i) + ',' + y(v || 0); }).join('');
      s += '<path d="' + d + 'L' + x(n - 1) + ',' + y(0) + 'L' + x(0) + ',' + y(0) + 'Z" fill="' + warna(o.color) + '" opacity=".08"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + warna(o.color) + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      o.values.forEach(function (v, i) { if (v) s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="4" fill="' + warna(o.color) + '" stroke="var(--surface)" stroke-width="2"/>'; });
      o.labels.forEach(function (l, i) { s += '<text class="axis" x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + '</text>'; });
      s += '<line id="xh" class="grid" x1="0" x2="0" y1="' + pt + '" y2="' + (pt + ih) + '" style="stroke:var(--muted);stroke-dasharray:3 3" visibility="hidden"/>';
      s += '<rect class="hit" x="' + pl + '" y="' + pt + '" width="' + iw + '" height="' + ih + '"/></svg>';
      el.innerHTML = s + tabelData(o.labels, [{ name: o.name, values: o.values }], o.satuan);
      var hit = el.querySelector('.hit'), xh = el.querySelector('#xh');
      hit.addEventListener('mousemove', function (e) {
        var r = hit.getBoundingClientRect(), i = Math.round((e.clientX - r.left) / r.width * (n - 1)); i = Math.max(0, Math.min(n - 1, i));
        xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('visibility', 'visible');
        tip(el, '<b>' + esc(o.labelPanjang ? o.labelPanjang[i] : o.labels[i]) + '</b>' + esc(o.name) + ': ' + (o.values[i] || 0) + (o.satuan ? ' ' + o.satuan : ''), x(i), y(o.values[i] || 0));
      });
      hit.addEventListener('mouseleave', function () { xh.setAttribute('visibility', 'hidden'); tipHilang(el); });
    });
    return '';
  }

  /** Donat dengan celah 2px antar-segmen; legenda berlabel nilai + persen. o: { items:[{label,nilai,color}], judulTengah } */
  function donut(el, o) {
    var total = o.items.reduce(function (a, b) { return a + b.nilai; }, 0), R = 64, r = 46, c = 75;
    var s = '<svg viewBox="0 0 150 150" role="img" aria-label="' + esc(o.aria || 'Grafik donat') + '">';
    if (!total) s += '<circle cx="75" cy="75" r="' + ((R + r) / 2) + '" fill="none" stroke="var(--line)" stroke-width="' + (R - r) + '"/>';
    var sudut = -Math.PI / 2, aktif = o.items.filter(function (x) { return x.nilai > 0; });
    aktif.forEach(function (it) {
      var a = it.nilai / total * Math.PI * 2, gap = aktif.length > 1 ? 2 / R : 0, a0 = sudut + gap / 2, a1 = sudut + a - gap / 2;
      if (aktif.length === 1) { s += '<circle cx="75" cy="75" r="' + ((R + r) / 2) + '" fill="none" stroke="' + warna(it.color) + '" stroke-width="' + (R - r) + '"><title>' + esc(it.label + ': ' + it.nilai) + '</title></circle>'; }
      else {
        var besar = a1 - a0 > Math.PI ? 1 : 0, p = function (rad, an) { return (c + rad * Math.cos(an)).toFixed(2) + ',' + (c + rad * Math.sin(an)).toFixed(2); };
        s += '<path d="M' + p(R, a0) + 'A' + R + ',' + R + ' 0 ' + besar + ' 1 ' + p(R, a1) + 'L' + p(r, a1) + 'A' + r + ',' + r + ' 0 ' + besar + ' 0 ' + p(r, a0) + 'Z" fill="' + warna(it.color) + '"><title>' + esc(it.label + ': ' + it.nilai) + '</title></path>';
      }
      sudut += a;
    });
    s += '<text x="75" y="70" text-anchor="middle" style="font:500 11px var(--f);fill:var(--muted)">' + esc(o.judulTengah || 'Total') + '</text><text x="75" y="90" text-anchor="middle" style="font:800 20px var(--f);fill:var(--ink)">' + (total >= 1000 ? (total / 1000).toFixed(1) + 'K' : total) + '</text></svg>';
    el.innerHTML = '<div class="donut-wrap">' + s + '<div class="donut-leg">' + o.items.map(function (it) {
      return '<div><i style="background:' + warna(it.color) + '"></i><span>' + esc(it.label) + '</span><b>' + it.nilai + ' <span style="color:var(--muted);font-weight:500">(' + (total ? Math.round(it.nilai / total * 100) : 0) + '%)</span></b></div>';
    }).join('') + '</div></div>';
  }

  /** Sparkline kecil untuk kartu KPI. */
  function spark(values, color) {
    var w = 80, h = 30, max = Math.max(1, Math.max.apply(null, values)), n = values.length;
    var d = values.map(function (v, i) { return (i ? 'L' : 'M') + (w * i / Math.max(1, n - 1)).toFixed(1) + ',' + (h - 2 - v / max * (h - 4)).toFixed(1); }).join('');
    return '<svg width="' + w + '" height="' + h + '" aria-hidden="true"><path d="' + d + 'L' + w + ',' + h + 'L0,' + h + 'Z" fill="' + warna(color || '--s1') + '" opacity=".12"/><path d="' + d + '" fill="none" stroke="' + warna(color || '--s1') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  window.Charts = { bar: bar, line: line, donut: donut, spark: spark, legenda: legenda };
})();
