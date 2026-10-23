/* ===== Tipo "Otra": diseño de Single con el contenido que suban (independiente de Empresariales) ===== */
var OtraEngine = (function () {
  var EMU = 914400;
  var SHELLS = { datos: [5], puntos: [6, 7, 8], lista: [12], tabla: [9], secciones: [14] };
  function clip(s, n) { s = String(s == null ? "" : s).trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function greenify(text, base) { return VidaEngine.greenify(text, base); }
  function geo(s) { var m = /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(s); return m ? { x: +m[1], y: +m[2], cx: +m[3], cy: +m[4] } : null; }
  function setGeo(s, g) { return s.replace(/<a:off x="-?\d+" y="-?\d+"\/><a:ext cx="\d+" cy="\d+"\/>/, '<a:off x="' + g.x + '" y="' + g.y + '"/><a:ext cx="' + g.cx + '" cy="' + g.cy + '"/>'); }

  function clone(deck, n) {
    var f = deck.f, k = 1;
    Object.keys(f).forEach(function (p) { var m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(p); if (m) k = Math.max(k, +m[1] + 1); });
    f["ppt/slides/slide" + k + ".xml"] = f["ppt/slides/slide" + n + ".xml"];
    f["ppt/slides/_rels/slide" + k + ".xml.rels"] = (f["ppt/slides/_rels/slide" + n + ".xml.rels"] || "").replace(/<Relationship [^>]*notesSlide[^>]*\/>/g, "");
    f["[Content_Types].xml"] = f["[Content_Types].xml"].replace("</Types>", '<Override PartName="/ppt/slides/slide' + k + '.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>');
    var rx = f["ppt/_rels/presentation.xml.rels"], rid = 0, m, re = /Id="rId(\d+)"/g;
    while ((m = re.exec(rx))) rid = Math.max(rid, +m[1]); rid++;
    f["ppt/_rels/presentation.xml.rels"] = rx.replace("</Relationships>", '<Relationship Id="rId' + rid + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide' + k + '.xml"/></Relationships>');
    var px = f["ppt/presentation.xml"], sid = 0; re = /<p:sldId id="(\d+)"/g;
    while ((m = re.exec(px))) sid = Math.max(sid, +m[1]); sid++;
    f["ppt/presentation.xml"] = px.replace("</p:sldIdLst>", '<p:sldId id="' + sid + '" r:id="rId' + rid + '"/></p:sldIdLst>');
    return k;
  }
  function order(deck, list) {
    var f = deck.f, rx = f["ppt/_rels/presentation.xml.rels"], ridOf = {}, m, re = /Id="(rId\d+)"[^>]*Target="slides\/slide(\d+)\.xml"/g;
    while ((m = re.exec(rx))) ridOf[+m[2]] = m[1];
    var px = f["ppt/presentation.xml"], ids = {}; re = /<p:sldId id="(\d+)" r:id="(rId\d+)"\/>/g;
    while ((m = re.exec(px))) ids[m[2]] = m[1];
    var unused = Object.keys(ridOf).map(Number).filter(function (n) { return list.indexOf(n) < 0; });
    var all = list.concat(unused).map(function (n) { return '<p:sldId id="' + ids[ridOf[n]] + '" r:id="' + ridOf[n] + '"/>'; }).join("");
    f["ppt/presentation.xml"] = px.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, "<p:sldIdLst>" + all + "</p:sldIdLst>");
    deck.deleteSlides(unused.sort(function (a, b) { return b - a; }));
  }
  function usedMedia(deck) {
    var used = {}; Object.keys(deck.f).forEach(function (p) { if (/\.rels$/.test(p)) { var m, re = /media\/([^"]+)"/g; while ((m = re.exec(deck.f[p]))) used[m[1]] = 1; } });
    return used;
  }

  var ROWS = [["texto_4", "texto_3"], ["texto_5", "texto_6"], ["texto_7", "texto_8"], ["texto_9", "texto_10"], ["texto_11", "texto_12"], ["texto_13", "texto_14"], ["texto_16", "texto_15"]];
  function fillDatos(d, n, L) {
    d.setShapeText(n, "texto_1", [["body", clip(L.titulo, 40)]]);
    var sub = (L.subtitulo || []).concat(["", ""]);
    d.setShapeText(n, "texto_2", [["body", clip(sub[0], 60)]], 0);
    d.setShapeText(n, "texto_2", [["body", clip(sub[1], 75)]], 1);
    var x = d.xml(n), gy = function (nm) { return geo(d.shapeMatch(d.xml(n), nm).s).y; };
    var y0 = gy("texto_4"), yEnd = gy("texto_16"), voff = gy("texto_3") - y0, vx = geo(d.shapeMatch(x, "texto_15").s);
    var filas = (L.filas || []).slice(0, 7), N = filas.length;
    var step = N > 1 ? Math.min((yEnd - y0) / (N - 1), 0.68 * EMU) : 0;
    ROWS.forEach(function (pair, i) {
      if (i >= N) { d.removeShape(n, pair[0]); d.removeShape(n, pair[1]); return; }
      var r = filas[i], y = Math.round(y0 + i * step), lines = String(r.concepto || "").split("\n").slice(0, 2);
      var npar = (d.shapeMatch(d.xml(n), pair[0]).s.match(/<a:p>/g) || []).length;
      if (npar === 2) { d.setShapeText(n, pair[0], [["body", clip(lines[0], 60)]], 0); d.setShapeText(n, pair[0], [["body", clip(lines[1] || "", 60)]], 1); }
      else d.setShapeText(n, pair[0], [["body", clip(lines.join(" "), 60)]]);
      d.setShapeText(n, pair[1], [["grn", clip(r.valor, 30)]]);
      d.moveShape(n, pair[0], function (g) { g.y = y; });
      d.moveShape(n, pair[1], function (g) { g.y = y + voff; g.x = vx.x; g.cx = vx.cx; });
    });
    var lx = d.xml(n), lm = /<p:cxnSp>[\s\S]*?<\/p:cxnSp>/.exec(lx);
    if (lm) { var g = geo(lm[0]); g.cy = Math.max(0, Math.round(y0 + (Math.max(N, 1) - 1) * step + 0.62 * EMU) - g.y); d.setXml(n, lx.slice(0, lm.index) + setGeo(lm[0], g) + lx.slice(lm.index + lm[0].length)); }
  }
  function fillPuntos(d, n, L, shell) {
    d.setShapeText(n, "texto_1", [["body", clip(L.titulo, 30)]]);
    var proto = shell === 7 ? 2 : 0, pars = [];
    (L.puntos || []).slice(0, 3).forEach(function (p, i) {
      if (i) pars.push([1, null]);
      pars.push([proto, [["first", "• "], ["lab", clip(p.titulo, 70).replace(/:?$/, ":")]].concat(greenify(" " + clip(p.texto, 330)))]);
    });
    if (pars.length) d.setShapePars(n, "texto_2", pars);
  }
  function fillLista(d, n, L) {
    d.setShapeText(n, "texto_1", [["body", clip(L.titulo, 62)]]);
    var pars = (L.items || []).slice(0, 14).map(function (t, i) { return [0, [["body", (i + 1) + ". " + clip(t, 220)]]]; });
    if (L.nota) { var nota = clip(L.nota, 520), m = /^([^:]{3,40}:)([\s\S]*)$/.exec(nota); pars.push([10, m ? [["lab", m[1]]].concat(greenify(m[2])) : greenify(nota)]); }
    if (pars.length) d.setShapePars(n, "texto_2", pars);
  }
  function fillTabla(d, n, L) {
    d.setShapeText(n, "texto_1", [["body", clip(L.titulo, 40)]]);
    if (L.texto) d.setShapePars(n, "texto_2", [[0, [["body", clip(L.texto, 380)]]]]); else d.removeShape(n, "texto_2");
    var x = d.xml(n), tcpr = /<a:tcPr marL[\s\S]*?<\/a:tcPr>/.exec(x)[0], tblpr = /<a:tblPr>[\s\S]*?<\/a:tblPr>/.exec(x)[0];
    function cell(text, sz, b, algn, color) {
      return "<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr" + (algn ? ' algn="' + algn + '"' : "") + '><a:lnSpc><a:spcPct val="100000"/></a:lnSpc></a:pPr>' +
        '<a:r><a:rPr sz="' + sz + '" b="' + b + '"><a:solidFill><a:srgbClr val="' + (color || "FEFEFE") + '"/></a:solidFill><a:latin typeface="Barlow"/></a:rPr><a:t>' + esc(text) + "</a:t></a:r></a:p></a:txBody>" + tcpr + "</a:tc>";
    }
    var filas = (L.filas || []).slice(0, 20), hdr = (L.encabezados || []).concat(["", ""]);
    var W1 = Math.round(6.2 * EMU), W2 = Math.round(3.2 * EMU), sz = filas.length <= 9 ? 1500 : 1200, HR = filas.length <= 9 ? 266920 : 220000;
    var trs = ['<a:tr h="420000">' + cell(clip(hdr[0], 60).toUpperCase(), 1350, 1, "ctr", "89DC8F") + cell(clip(hdr[1], 30).toUpperCase(), 1350, 1, "ctr", "89DC8F") + "</a:tr>"];
    filas.forEach(function (r) { r = (r || []).concat(["", ""]); trs.push('<a:tr h="' + HR + '">' + cell(clip(r[0], 90), sz, 0) + cell(clip(r[1], 40), sz, 0, "ctr") + "</a:tr>"); });
    var tbl = "<a:tbl>" + tblpr + '<a:tblGrid><a:gridCol w="' + W1 + '"/><a:gridCol w="' + W2 + '"/></a:tblGrid>' + trs.join("") + "</a:tbl>";
    x = x.replace(/<a:tbl>[\s\S]*?<\/a:tbl>/, function () { return tbl; });
    var gm = /<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/.exec(x), gs = gm[0];
    var xf = /<p:xfrm><a:off x="\d+" y="\d+"\/><a:ext cx="\d+" cy="\d+"\/><\/p:xfrm>/.exec(gs)[0];
    var X = Math.round((13.333 * EMU - (W1 + W2)) / 2), Y = Math.round(2.45 * EMU);
    gs = gs.replace(xf, '<p:xfrm><a:off x="' + X + '" y="' + Y + '"/><a:ext cx="' + (W1 + W2) + '" cy="' + (420000 + filas.length * HR) + '"/></p:xfrm>');
    d.setXml(n, x.slice(0, gm.index) + gs + x.slice(gm.index + gm[0].length));
  }
  function fillSecciones(d, n, L) {
    d.setShapeText(n, "texto_1", [["body", clip(L.titulo, 30)]]);
    if (L.subtitulo) d.setShapeText(n, "texto_2", [["lab", clip(L.subtitulo, 40)]]); else d.removeShape(n, "texto_2");
    var pars = [];
    (L.grupos || []).slice(0, 2).forEach(function (g, gi) {
      if (gi) pars.push([10, null]);
      pars.push([0, [["lab", clip(g.titulo, 70)]]], [1, null]);
      (g.items || []).slice(0, 8).forEach(function (t, i) { pars.push([2, [["body", (i + 1) + ". " + clip(t, 170)]]]); });
    });
    if (pars.length) d.setShapePars(n, "texto_3", pars);
  }

  function build(deck, plan, opts) {
    var p = plan.portada || {}, cli = clip(String(p.cliente || "").toUpperCase(), 60);
    deck.setShapeText(1, "cliente", [["body", cli]]);
    if (cli.length > 28) deck.scaleFont(1, "cliente", Math.max(0.55, 30 / cli.length));
    [["subgrupo", "subtitulo", 40], ["tipo_poliza", "tipo", 45], ["vigencia", "vigencia", 20]].forEach(function (t) {
      if (p[t[1]]) deck.setShapeText(1, t[0], [["body", clip(p[t[1]], t[2])]]); else deck.removeShape(1, t[0]);
    });
    var list = [1, 2, 3, 4], rot = 0;
    (plan.laminas || []).forEach(function (L) {
      var t = L && L.tipo; if (!SHELLS[t]) return;
      var shell = t === "puntos" ? SHELLS[t][rot++ % 3] : SHELLS[t][0];
      var k = clone(deck, shell);
      deck.removeYellowMarks(k);
      if (t === "datos") fillDatos(deck, k, L); else if (t === "puntos") fillPuntos(deck, k, L, shell);
      else if (t === "lista") fillLista(deck, k, L); else if (t === "tabla") fillTabla(deck, k, L); else fillSecciones(deck, k, L);
      list.push(k);
    });
    list.push(17);
    order(deck, list);
    if (!opts.logo) for (var n = 1; n < 200; n++) { if (deck.f["ppt/slides/slide" + n + ".xml"]) { var rid = deck.ridFor(n, "image6.png"); if (rid) deck.setXml(n, deck.xml(n).replace(new RegExp('<p:pic>(?:(?!</p:pic>)[\\s\\S])*?r:embed="' + rid + '"[\\s\\S]*?</p:pic>', "g"), "")); } }
    return { usedMedia: usedMedia(deck), laminas: list.length };
  }
  return { build: build, clone: clone, order: order, usedMedia: usedMedia };
})();
if (typeof module !== "undefined") module.exports = OtraEngine;
