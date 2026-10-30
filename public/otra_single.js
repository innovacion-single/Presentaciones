/* ===== Tipo "Otra" con el formato nuevo de Single (plantilla_otra.json) =====
   Fijas: portada (1) y cierre (9). Moldes: carta (2), texto (3), tarjetas (4), calidad (5), pasos (6),
   etiquetas (7), lista (8) y tabla (sobre el fondo de la 8). Independiente de Empresariales y de Daños. */
var OtraSingleEngine = (function () {
  var EMU = 914400;
  var NAVY = "0C1E42", GREEN = "89DD8F", LIGHT = "F3F5F7", SLATE = "3A4A66", FONT = "Chivo";
  var MOLD = { carta: 2, texto: 3, tarjetas: 4, calidad: 5, pasos: 6, etiquetas: 7, lista: 8, tabla: 8 };
  var MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  function E(i) { return Math.round(i * EMU); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function clip(s, n) { s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function arr(a) { return Array.isArray(a) ? a.filter(function (v) { return v != null && v !== ""; }) : []; }

  /* ---- figuras por id ---- */
  function find(x, id) {
    var re = new RegExp('<p:(sp|pic|graphicFrame)>(?:(?!<p:(?:sp|pic|graphicFrame|grpSp|cxnSp)>)[\\s\\S])*?<p:cNvPr id="' + id + '"[\\s\\S]*?</p:\\1>'), m = re.exec(x);
    if (!m) throw new Error("No encontré la figura " + id);
    return { s: m[0], start: m.index, end: m.index + m[0].length };
  }
  function put(d, n, id, fn) { var x = d.xml(n), m = find(x, id); d.setXml(n, x.slice(0, m.start) + fn(m.s) + x.slice(m.end)); }
  function remove(d, n, ids) { ids.forEach(function (id) { var x = d.xml(n), m = find(x, id); d.setXml(n, x.slice(0, m.start) + x.slice(m.end)); }); }
  function geo(s) { var m = /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(s); return { x: +m[1], y: +m[2], cx: +m[3], cy: +m[4] }; }
  function setGeo(s, g) { return s.replace(/<a:off x="-?\d+" y="-?\d+"\/><a:ext cx="\d+" cy="\d+"\/>/, '<a:off x="' + Math.round(g.x) + '" y="' + Math.round(g.y) + '"/><a:ext cx="' + Math.round(g.cx) + '" cy="' + Math.round(g.cy) + '"/>'); }
  function move(d, n, id, fn) { put(d, n, id, function (s) { var g = geo(s); fn(g); return setGeo(s, g); }); }
  function getGeo(d, n, id) { return geo(find(d.xml(n), id).s); }

  /* ---- texto: conserva el estilo del primer renglón; **así** usa el estilo de acento (verde en títulos oscuros, negritas en texto) ---- */
  function runStyles(s) {
    var rprs = [], m, re = /<a:r><a:rPr([^>]*?)(\/>|>([\s\S]*?)<\/a:rPr>)/g;
    while ((m = re.exec(s))) rprs.push(m[0].slice(5));
    var withFill = rprs.filter(function (r) { return /srgbClr/.test(r); });
    var base = withFill[0] || rprs[0] || '<a:rPr lang="es-MX" dirty="0"/>';
    var color = /srgbClr val="(\w+)"/.exec(base), accent = null;
    withFill.forEach(function (r) { var c = /srgbClr val="(\w+)"/.exec(r); if (!accent && color && c && c[1] !== color[1]) accent = r; });
    if (!accent) accent = /\sb="\d"/.test(base) ? base : base.replace("<a:rPr", '<a:rPr b="1"');
    return { base: base, accent: accent };
  }
  function runsXml(text, st, scale) {
    var parts = String(text).split(/\*\*/), out = "";
    parts.forEach(function (t, i) {
      if (!t) return;
      var r = i % 2 ? st.accent : st.base;
      if (scale && scale !== 1) r = r.replace(/sz="(\d+)"/, function (_, v) { return 'sz="' + Math.round(+v * scale / 50) * 50 + '"'; });
      r = r.replace(/lang="[^"]*"/, 'lang="es-MX"');
      if (!/<a:latin/.test(r)) r = /\/>$/.test(r) ? r.replace(/\/>$/, '><a:latin typeface="' + FONT + '"/></a:rPr>') : r.replace(/<\/a:rPr>$/, '<a:latin typeface="' + FONT + '"/></a:rPr>');
      out += "<a:r>" + r + "<a:t>" + esc(t) + "</a:t></a:r>";
    });
    return out;
  }
  // paras: lista de textos; opts: {scale, spcAft (pt), pPr (para reemplazar), size}
  function setText(d, n, id, paras, opts) {
    opts = opts || {};
    put(d, n, id, function (s) {
      var st = runStyles(s);
      var pm = /<a:p>(?:(?!<\/a:p>)[\s\S])*?<a:r>[\s\S]*?<\/a:p>/.exec(s) || /<a:p>[\s\S]*?<\/a:p>/.exec(s);
      var pPr = opts.pPr || ((/<a:pPr[^>]*\/>|<a:pPr[^>]*>[\s\S]*?<\/a:pPr>/.exec(pm[0]) || [""])[0]);
      if (opts.spcAft != null) {
        pPr = pPr.replace(/<a:spcAft>[\s\S]*?<\/a:spcAft>/, "");
        if (/<a:pPr[^>]*\/>$/.test(pPr)) pPr = pPr.replace(/\/>$/, "></a:pPr>");
        pPr = pPr.replace(/(<a:lnSpc>[\s\S]*?<\/a:lnSpc>)|(<a:pPr[^>]*>)/, function (m0) { return m0 + '<a:spcAft><a:spcPts val="' + Math.round(opts.spcAft * 100) + '"/></a:spcAft>'; });
      }
      if (opts.scale && opts.scale !== 1) pPr = pPr.replace(/<a:spcPts val="(\d+)"\/><\/a:lnSpc>/, function (_, v) { return '<a:spcPts val="' + Math.round(+v * opts.scale) + '"/></a:lnSpc>'; });
      var body = paras.map(function (t) { return "<a:p>" + pPr + runsXml(t, st, opts.scale) + "</a:p>"; }).join("");
      var b0 = s.indexOf("<a:p>"), b1 = s.lastIndexOf("</a:p>") + 6;
      if (b0 < 0) return s;
      return s.slice(0, b0) + body + s.slice(b1);
    });
  }
  // escala para que el texto quepa: ancho y alto en pulgadas, tamaño en pt, interlineado como factor del tamaño
  function fit(paras, w, h, pt, lead) {
    lead = lead || 1.4;
    for (var sc = 1; sc >= 0.62; sc -= 0.04) {
      var cpl = Math.max(8, Math.floor(w * 72 / (pt * sc * 0.55))), lines = 0;
      paras.forEach(function (p) { lines += Math.max(1, Math.ceil(String(p).replace(/\*\*/g, "").length / cpl)); });
      if (lines * pt * sc * lead / 72 + (paras.length - 1) * 0.08 <= h) return sc;
    }
    return 0.62;
  }

  /* ---- moldes ---- */
  function titulo(d, n, id, t, w, maxPt) {
    var sc = fit([t], w || 11.9, 0.62, maxPt || 36, 1.1);
    setText(d, n, id, [t], { scale: sc });
  }

  function portada(d, P, fecha) {
    setText(d, 1, 5, [clip(P.categoria || "", 40).toUpperCase()]);
    var t = clip(P.titulo || "", 60);
    setText(d, 1, 6, [t], { scale: fit([t], 6.44, 1.69, 44, 1.05) });
    if (P.subtitulo) { var st = clip(P.subtitulo, 110); setText(d, 1, 7, [st], { scale: fit([st], 6.44, 0.95, 16, 1.4) }); move(d, 1, 7, function (g) { g.cy = E(1.0); }); } else remove(d, 1, [7]);
    setText(d, 1, 8, [fecha]);
  }

  function carta(d, n, L) {
    setText(d, n, 3, [clip(L.saludo || "", 60)]);
    var ps = arr(L.parrafos).slice(0, 5).map(function (p) { return clip(p, 520); });
    var sc = fit(ps, 5.09, 4.05, 14, 1.45);
    setText(d, n, 4, ps, { scale: sc, spcAft: 9 });
    move(d, n, 4, function (g) { g.cy = E(4.15); });
    remove(d, n, [5, 6, 12]);
  }

  function texto(d, n, L) {
    titulo(d, n, 4, clip(L.titulo, 60), 6.9);
    var ps = arr(L.parrafos).slice(0, 3).map(function (p) { return clip(p, 600); });
    var r = L.recuadro && L.recuadro.texto ? L.recuadro : null, h = r ? 1.75 : 4.3;
    setText(d, n, 5, ps, { scale: fit(ps, 6.29, h, 12, 1.65), spcAft: 6 });
    move(d, n, 5, function (g) { g.cy = E(h); });
    if (r) {
      setText(d, n, 8, [clip(r.titulo || "", 70)]);
      var rt = clip(r.texto, 360);
      setText(d, n, 9, [rt], { scale: fit([rt], 5.79, 1.15, 10, 1.6) });
    } else remove(d, n, [6, 7, 8, 9]);
  }

  var CARDS = [{ bg: [4, 5], icon: 6, t: 7, x: 8 }, { bg: [9, 10], icon: 11, t: 12, x: 13 }, { bg: [14, 15], icon: 16, t: 17, x: 18 },
    { bg: [19, 20], icon: 34, t: 22, x: 23 }, { bg: [36, 46], icon: 52, t: 50, x: 48 }, { bg: [28, 54], icon: 60, t: 58, x: 56 }];
  function tarjetas(d, n, L) {
    titulo(d, n, 2, clip(L.titulo, 60), 11.9, 32);
    if (L.subtitulo) setText(d, n, 3, [clip(L.subtitulo, 110)]); else remove(d, n, [3]);
    var cs = arr(L.tarjetas).slice(0, 6);
    CARDS.forEach(function (c, i) {
      remove(d, n, [c.icon]);
      if (i >= cs.length) { remove(d, n, c.bg.concat([c.t, c.x])); return; }
      var ix = i % 2 ? 7.06 : 1.17, ti = clip(cs[i].titulo, 50), tx = clip(cs[i].texto, 170);
      setText(d, n, c.t, [ti], { scale: fit([ti], 5.2, 0.3, 16, 1.2) });
      move(d, n, c.t, function (g) { g.x = E(ix); g.cx = E(5.2); });
      setText(d, n, c.x, [tx], { scale: fit([tx], 5.26, 0.62, 14, 1.4) });
      move(d, n, c.x, function (g) { g.cy = E(0.75); });
    });
  }

  var STEPS = [{ box: 4, num: 5, t: 6, x: 7 }, { box: 9, num: 10, t: 11, x: 12 }, { box: 14, num: 15, t: 16, x: 17 }, { box: 19, num: 20, t: 21, x: 22 }];
  var ARROWS = [8, 13, 18];
  function pasos(d, n, L) {
    titulo(d, n, 2, clip(L.titulo, 60), 11.9, 32);
    if (L.subtitulo) setText(d, n, 3, [clip(L.subtitulo, 110)]); else remove(d, n, [3]);
    var ps = arr(L.pasos).slice(0, 4), k = Math.max(2, ps.length);
    // los primeros k-1 usan las cajas normales y el último la caja resaltada
    var use = []; for (var i = 0; i < k - 1; i++) use.push(STEPS[i]); use.push(STEPS[3]);
    STEPS.forEach(function (s) { if (use.indexOf(s) < 0) remove(d, n, [s.box, s.num, s.t, s.x]); });
    ARROWS.slice(k - 1).forEach(function (a) { remove(d, n, [a]); });
    var W = 2.42, gap = 0.62, x0 = (13.333 - (k * W + (k - 1) * gap)) / 2;
    use.forEach(function (s, i) {
      var p = ps[i] || { titulo: "", texto: "" }, dx = x0 + i * (W + gap);
      move(d, n, s.box, function (g) { g.x = E(dx); });
      [s.num, s.t, s.x].forEach(function (id) { move(d, n, id, function (g) { g.x = E(dx + 0.28); }); });
      setText(d, n, s.num, [(i + 1 < 10 ? "0" : "") + (i + 1)]);
      var ti = clip(p.titulo, 40), tx = clip(p.texto, 120);
      setText(d, n, s.t, [ti], { scale: fit([ti], 1.92, 0.56, 14, 1.25) });
      setText(d, n, s.x, [tx], { scale: fit([tx], 1.92, 1.0, 11, 1.45) });
      move(d, n, s.x, function (g) { g.cy = E(1.0); });
      if (i < k - 1) move(d, n, ARROWS[i], function (g) { g.x = E(dx + W + gap / 2 - 0.14); });
    });
  }

  function etiquetas(d, n, L) {
    titulo(d, n, 2, clip(L.titulo, 45), 6.5, 32);
    var x = d.xml(n), proto = [find(x, 4).s, find(x, 11).s];
    remove(d, n, [4, 5, 6, 7, 8, 9, 11, 20, 12, 13]);
    var gs = arr(L.grupos).slice(0, 2), y = 1.83, nid = 200, add = "";
    [3, 10].forEach(function (lid, gi) {
      var g = gs[gi];
      if (!g) { remove(d, n, [lid]); return; }
      setText(d, n, lid, [clip(g.nombre, 30).toUpperCase()]);
      move(d, n, lid, function (q) { q.y = E(y); });
      var cx = 0.89, cy = y + 0.4;
      arr(g.etiquetas).slice(0, 10).forEach(function (t) {
        t = clip(t, 32);
        var w = 0.42 + t.length * 0.105;
        if (cx + w > 7.15 && cx > 0.89) { cx = 0.89; cy += 0.58; }
        var s = proto[gi].replace(/<p:cNvPr id="\d+"/, '<p:cNvPr id="' + (nid++) + '"');
        s = setGeo(s, { x: E(cx), y: E(cy), cx: E(w), cy: E(0.44) });
        s = s.replace(/<a:t>[^<]*<\/a:t>/, "<a:t>" + esc(t) + "</a:t>");
        add += s; cx += w + 0.12;
      });
      y = cy + 0.44 + 0.45;
    });
    d.setXml(n, d.xml(n).replace("</p:spTree>", add + "</p:spTree>"));
  }

  var LSTEPS = [[6, 7, 8, 9], [10, 11, 12, 13], [14, 15, 16, 17]];
  function lista(d, n, L) {
    titulo(d, n, 2, clip(L.titulo, 60), 11.9, 32);
    var ps = arr(L.pasos).slice(0, 3), wide = !ps.length;
    setText(d, n, 3, [clip(L.encabezado || "", 80)]);
    var items = arr(L.items).slice(0, 14).map(function (t) { return clip(t, wide ? 150 : 95); });
    var w = wide ? 10.4 : 5.6, sc = fit(items, w - 0.8, 2.95, 14, 1.39);
    var x = d.xml(n), m = find(x, 5), pm = /<a:p><a:pPr marL="742950"[\s\S]*?<\/a:pPr>/.exec(m.s);
    setText(d, n, 5, items, { scale: sc, pPr: pm ? pm[0].slice(5) : null });
    remove(d, n, [4]);
    LSTEPS.forEach(function (ids, i) {
      if (i >= ps.length) { remove(d, n, ids); return; }
      var ti = clip(ps[i].titulo, 40), tx = clip(ps[i].texto, 120);
      setText(d, n, ids[2], [ti], { scale: fit([ti], 3.83, 0.3, 16, 1.2) });
      setText(d, n, ids[3], [tx], { scale: fit([tx], 3.83, 0.55, 12, 1.4) });
    });
    if (wide) { move(d, n, 3, function (g) { g.cx = E(11.55); }); move(d, n, 5, function (g) { g.cx = E(10.6); }); }
  }

  function tabla(d, n, L) {
    titulo(d, n, 2, clip(L.titulo, 60), 11.9, 32);
    remove(d, n, [3, 4, 5].concat(LSTEPS[0], LSTEPS[1], LSTEPS[2]));
    var hdr = arr(L.encabezados).slice(0, 4), filas = arr(L.filas).slice(0, 12), nc = Math.max(2, hdr.length);
    var W = 11.55, first = nc === 2 ? 0.6 : nc === 3 ? 0.44 : 0.34, cols = [W * first];
    for (var i = 1; i < nc; i++) cols.push(W * (1 - first) / (nc - 1));
    var sz = filas.length > 9 ? 1100 : 1250, rh = filas.length > 9 ? 0.36 : 0.42;
    function cell(t, o) {
      var ln = function (tag) { return "<a:" + tag + ' w="9525"><a:solidFill><a:srgbClr val="DCE2EB"/></a:solidFill></a:' + tag + ">"; };
      return '<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="' + (o.algn || "l") + '"/><a:r><a:rPr lang="es-MX" sz="' + o.sz + '" b="' + (o.b ? 1 : 0) + '" dirty="0"><a:solidFill><a:srgbClr val="' + o.c + '"/></a:solidFill><a:latin typeface="' + FONT + '"/></a:rPr><a:t>' + esc(t) + "</a:t></a:r></a:p></a:txBody>" +
        '<a:tcPr marL="91440" marR="91440" marT="45720" marB="45720" anchor="ctr"><a:lnL w="0"><a:noFill/></a:lnL><a:lnR w="0"><a:noFill/></a:lnR>' + ln("lnT") + ln("lnB") + '<a:solidFill><a:srgbClr val="' + o.f + '"/></a:solidFill></a:tcPr></a:tc>';
    }
    var trs = ['<a:tr h="' + E(0.5) + '">' + cols.map(function (_, j) { return cell(clip(hdr[j] || "", 40), { sz: 1250, b: 1, c: LIGHT, f: NAVY, algn: j ? "ctr" : "l" }); }).join("") + "</a:tr>"];
    filas.forEach(function (r, ri) {
      r = arr(r).length ? r : [];
      trs.push('<a:tr h="' + E(rh) + '">' + cols.map(function (_, j) { return cell(clip(r[j] == null ? "" : r[j], j ? 60 : 90), { sz: sz, b: j === 0, c: j === 0 ? NAVY : SLATE, f: ri % 2 ? "F8FAFC" : "FFFFFF", algn: j ? "ctr" : "l" }); }).join("") + "</a:tr>");
    });
    var grid = cols.map(function (w) { return '<a:gridCol w="' + E(w) + '"/>'; }).join("");
    var fr = '<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="300" name="tabla"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
      '<p:xfrm><a:off x="' + E(0.89) + '" y="' + E(1.75) + '"/><a:ext cx="' + E(W) + '" cy="' + E(0.5 + filas.length * rh) + '"/></p:xfrm>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="0"/><a:tblGrid>' + grid + "</a:tblGrid>" + trs.join("") + "</a:tbl></a:graphicData></a:graphic></p:graphicFrame>";
    d.setXml(n, d.xml(n).replace("</p:spTree>", fr + "</p:spTree>"));
  }

  function build(deck, plan) {
    var now = new Date();
    portada(deck, plan.portada || {}, MESES[now.getMonth()] + " " + now.getFullYear());
    var list = [1], warn = [];
    arr(plan.laminas).forEach(function (L) {
      var t = L && L.tipo; if (!MOLD[t]) return;
      var k = OtraEngine.clone(deck, MOLD[t]);
      try {
        if (t === "carta") carta(deck, k, L); else if (t === "texto") texto(deck, k, L); else if (t === "tarjetas") tarjetas(deck, k, L);
        else if (t === "pasos") pasos(deck, k, L); else if (t === "etiquetas") etiquetas(deck, k, L); else if (t === "lista") lista(deck, k, L);
        else if (t === "tabla") tabla(deck, k, L);
        list.push(k);
      } catch (e) { warn.push("No se pudo armar una lámina de tipo " + t + ": " + e.message); }
    });
    list.push(9);
    OtraEngine.order(deck, list);
    return { usedMedia: OtraEngine.usedMedia(deck), laminas: list.length, warnings: warn };
  }

  // Solo portada y cierre (para Daños): deja las láminas 1 y 9 del formato nuevo
  function portadaYCierre(deck, P) {
    var now = new Date();
    portada(deck, P || {}, MESES[now.getMonth()] + " " + now.getFullYear());
    OtraEngine.order(deck, [1, 9]);
    return { usedMedia: OtraEngine.usedMedia(deck) };
  }

  return { build: build, portadaYCierre: portadaYCierre };
})();
if (typeof module !== "undefined") module.exports = OtraSingleEngine;
