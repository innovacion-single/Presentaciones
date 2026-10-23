/* ===== Motor de la plantilla BPE (edición del PowerPoint) ===== */
var VidaEngine = (function () {
  var EMU = 914400, GREEN = "A8D08D";
  var RUN_SRC = '<a:r>(<a:rPr[^>]*/>|<a:rPr[\\s\\S]*?</a:rPr>)<a:t(?: [^>]*)?>([^<]*)</a:t></a:r>';
  function runs(p) { var re = new RegExp(RUN_SRC, "g"), out = [], m; while ((m = re.exec(p))) out.push({ rpr: m[1], t: m[2], start: m.index, end: m.index + m[0].length }); return out; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function unesc(s) { return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); }
  function parText(p) { return runs(p).map(function (r) { return unesc(r.t); }).join(""); }

  function styles(p) {
    var rs = runs(p);
    if (!rs.length) return null;
    var body = null, lab = null, grn = null;
    rs.forEach(function (r) {
      var bold = /b="1"/.test(r.rpr), green = r.rpr.indexOf(GREEN) >= 0, tt = r.t.trim();
      if (!body && !bold && !green && tt && tt !== "•") body = r.rpr;
      if (!lab && bold) lab = r.rpr;
      if (!grn && green) grn = r.rpr;
    });
    body = body || rs[rs.length - 1].rpr;
    lab = lab || body;
    grn = grn || body.replace(/<a:srgbClr val="[0-9A-Fa-f]{6}"\/>/, '<a:srgbClr val="' + GREEN + '"/>');
    return { first: rs[0].rpr, lab: lab, body: body, grn: grn };
  }
  function rebuild(p, segs, st) {
    var rs = runs(p);
    if (!rs.length) return p;
    var a = rs[0].start, b = rs[rs.length - 1].end;
    var html = segs.filter(function (s) { return s[1] !== "" && s[1] != null; }).map(function (s) {
      return "<a:r>" + st[s[0]] + '<a:t xml:space="preserve">' + esc(s[1]) + "</a:t></a:r>";
    }).join("");
    return p.slice(0, a) + html + p.slice(b);
  }
  // Separa montos y porcentajes para pintarlos en verde
  function greenify(text, base) {
    base = base || "body";
    var re = /(\$\s?[\d,]+(?:\.\d+)?|\b\d+(?:[.,]\d+)?\s?%|\b[\d,]+\s?UMA\b)/g, out = [], last = 0, m;
    while ((m = re.exec(text))) { if (m.index > last) out.push([base, text.slice(last, m.index)]); out.push(["grn", m[0]]); last = m.index + m[0].length; }
    if (last < text.length) out.push([base, text.slice(last)]);
    return out;
  }

  function Deck(files) { this.f = files; this.removed = {}; this.warnings = []; }
  Deck.prototype.xml = function (n) { return this.f["ppt/slides/slide" + n + ".xml"]; };
  Deck.prototype.setXml = function (n, x) { this.f["ppt/slides/slide" + n + ".xml"] = x; };
  Deck.prototype.shapeMatch = function (x, name) {
    var re = /<p:sp>[\s\S]*?<\/p:sp>/g, m;
    while ((m = re.exec(x))) if (m[0].indexOf(' name="' + name + '"') >= 0) return { s: m[0], start: m.index, end: m.index + m[0].length };
    throw new Error("No encontré la figura " + name);
  };
  Deck.prototype.pars = function (s) { var re = /<a:p>[\s\S]*?<\/a:p>/g, out = [], m; while ((m = re.exec(s))) out.push({ p: m[0], start: m.index, end: m.index + m[0].length }); return out; };
  Deck.prototype.setShapeText = function (n, name, segs, par) {
    var x = this.xml(n), sm = this.shapeMatch(x, name), ps = this.pars(sm.s), p = ps[par || 0];
    var s2 = sm.s.slice(0, p.start) + rebuild(p.p, segs, styles(p.p)) + sm.s.slice(p.end);
    this.setXml(n, x.slice(0, sm.start) + s2 + x.slice(sm.end));
  };
  // pars = [[indiceMolde, segs|null], ...]
  Deck.prototype.setShapePars = function (n, name, list) {
    var x = this.xml(n), sm = this.shapeMatch(x, name), ps = this.pars(sm.s);
    var protos = ps.map(function (q) { return q.p; });
    var html = list.map(function (it) {
      var p = protos[it[0]];
      if (!it[1] || !runs(p).length) return p;
      return rebuild(p, it[1], styles(p));
    }).join("");
    var s2 = sm.s.slice(0, ps[0].start) + html + sm.s.slice(ps[ps.length - 1].end);
    this.setXml(n, x.slice(0, sm.start) + s2 + x.slice(sm.end));
  };
  Deck.prototype.removeShape = function (n, name) { var x = this.xml(n), sm = this.shapeMatch(x, name); this.setXml(n, x.slice(0, sm.start) + x.slice(sm.end)); };
  Deck.prototype.scaleFont = function (n, name, f) {
    var x = this.xml(n), sm = this.shapeMatch(x, name);
    var s = sm.s.replace(/(<a:(?:rPr|endParaRPr|defRPr)[^>]*\ssz=")(\d+)(")/g, function (_, a, v, c) { return a + Math.round(+v * f) + c; });
    this.setXml(n, x.slice(0, sm.start) + s + x.slice(sm.end));
  };
  function geo(s) { var m = /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(s); return m ? { x: +m[1], y: +m[2], cx: +m[3], cy: +m[4] } : null; }
  function setGeo(s, g) { return s.replace(/<a:off x="-?\d+" y="-?\d+"\/><a:ext cx="\d+" cy="\d+"\/>/, '<a:off x="' + g.x + '" y="' + g.y + '"/><a:ext cx="' + g.cx + '" cy="' + g.cy + '"/>'); }
  Deck.prototype.moveShape = function (n, name, fn) {
    var x = this.xml(n), sm = this.shapeMatch(x, name), g = geo(sm.s); fn(g);
    this.setXml(n, x.slice(0, sm.start) + setGeo(sm.s, g) + x.slice(sm.end));
  };

  /* ---- Lámina 5: renglones de "Mi póliza" ---- */
  var ROWS = [["texto_4", "texto_3"], ["texto_5", "texto_6"], ["texto_7", "texto_8"], ["texto_9", "texto_10"], ["texto_11", "texto_12"], ["texto_13", "texto_14"], ["texto_16", "texto_15"]];
  Deck.prototype.polizaRows = function (rows) {
    var self = this, n = 5, x = this.xml(n);
    var y0 = geo(this.shapeMatch(x, "texto_4").s).y, yEnd = geo(this.shapeMatch(x, "texto_16").s).y;
    var voff = geo(this.shapeMatch(x, "texto_3").s).y - y0;
    var vx = geo(this.shapeMatch(x, "texto_15").s);
    rows = rows.slice(0, 7);
    var N = rows.length;
    var step = N > 1 ? Math.min((yEnd - y0) / (N - 1), Math.round(0.68 * EMU)) : 0;
    ROWS.forEach(function (pair, i) {
      if (i >= N) { self.removeShape(n, pair[0]); self.removeShape(n, pair[1]); return; }
      var r = rows[i], y = Math.round(y0 + i * step);
      var lines = String(r.concepto).split("\n").slice(0, 2);
      var lx = self.xml(n), lsm = self.shapeMatch(lx, pair[0]), lps = self.pars(lsm.s);
      if (lps.length === 2) {
        self.setShapeText(n, pair[0], [["body", lines[0]]], 0);
        self.setShapeText(n, pair[0], [["body", lines[1] || ""]], 1);
        if (!lines[1]) { // quita el segundo renglón vacío
          var x2 = self.xml(n), sm2 = self.shapeMatch(x2, pair[0]), ps2 = self.pars(sm2.s);
          var s2 = sm2.s.slice(0, ps2[1].start) + sm2.s.slice(ps2[1].end);
          self.setXml(n, x2.slice(0, sm2.start) + s2 + x2.slice(sm2.end));
        }
      } else {
        self.setShapeText(n, pair[0], [["body", lines.join(" ")]], 0);
      }
      self.setShapeText(n, pair[1], [["grn", r.monto]], 0);
      self.moveShape(n, pair[0], function (g) { g.y = y; });
      self.moveShape(n, pair[1], function (g) { g.y = y + voff; g.x = vx.x; g.cx = vx.cx; });
    });
    // línea vertical
    var lx2 = this.xml(n), lm = /<p:cxnSp>[\s\S]*?<\/p:cxnSp>/.exec(lx2);
    if (lm) {
      var g = geo(lm[0]); var endY = Math.round(y0 + (N - 1) * step + 0.62 * EMU);
      g.cy = Math.max(0, endY - g.y);
      this.setXml(n, lx2.slice(0, lm.index) + setGeo(lm[0], g) + lx2.slice(lm.index + lm[0].length));
    }
  };

  /* ---- Tabla de pérdidas orgánicas (lámina 9) ---- */
  Deck.prototype.setTable = function (n, title, rows) {
    var x = this.xml(n);
    var tcpr = /<a:tcPr marL[\s\S]*?<\/a:tcPr>/.exec(x)[0];
    var tblpr = /<a:tblPr>[\s\S]*?<\/a:tblPr>/.exec(x)[0];
    function cell(text, sz, b, algn, color, span, hm) {
      var at = (span ? ' gridSpan="' + span + '"' : "") + (hm ? ' hMerge="1"' : "");
      if (text == null) return "<a:tc" + at + "><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></a:txBody>" + tcpr + "</a:tc>";
      return "<a:tc" + at + "><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr" + (algn ? ' algn="' + algn + '"' : "") + '><a:lnSpc><a:spcPct val="100000"/></a:lnSpc></a:pPr>' +
        '<a:r><a:rPr sz="' + sz + '" b="' + b + '"><a:solidFill><a:srgbClr val="' + (color || "FEFEFE") + '"/></a:solidFill><a:latin typeface="Barlow"/></a:rPr>' +
        "<a:t>" + esc(text) + "</a:t></a:r></a:p></a:txBody>" + tcpr + "</a:tc>";
    }
    var two = rows.length > 9, cols, HH, HR, sz, X, Y;
    if (two) { cols = [Math.round(4.2 * EMU), Math.round(1.5 * EMU), Math.round(4.2 * EMU), Math.round(1.5 * EMU)]; HH = Math.round(0.45 * EMU); HR = 240000; sz = 1200; X = Math.round(0.4 * EMU); Y = Math.round(2.4 * EMU); }
    else { cols = [4859093, 1388503]; HH = 694347; HR = 266920; sz = 1600; }
    var k = cols.length, trs = [];
    var blanks = ""; for (var i = 1; i < k; i++) blanks += cell(null, 0, 0, null, null, null, true);
    trs.push('<a:tr h="360475">' + cell(title, 2200, 1, "ctr", "89DC8F", k) + blanks + "</a:tr>");
    var hdr = cell("TIPO DE PÉRDIDA ORGÁNICA", 1350, 1, "ctr") + cell("PORCENTAJE DE SUMA ASEGURADA", 1350, 1, "ctr");
    trs.push('<a:tr h="' + HH + '">' + (two ? hdr + hdr : hdr) + "</a:tr>");
    var nrows;
    if (two) {
      var half = Math.ceil(rows.length / 2); nrows = half;
      for (var j = 0; j < half; j++) {
        var l = rows[j], r = rows[j + half] || ["", ""];
        trs.push('<a:tr h="' + HR + '">' + cell(l[0], sz, 0) + cell(l[1], 1300, 0, "ctr") + cell(r[0], sz, 0) + cell(r[1], 1300, 0, "ctr") + "</a:tr>");
      }
    } else {
      nrows = rows.length;
      rows.forEach(function (r) { trs.push('<a:tr h="' + HR + '">' + cell(r[0], sz, 0) + cell(r[1], sz, 0, "ctr") + "</a:tr>"); });
    }
    var grid = cols.map(function (w) { return '<a:gridCol w="' + w + '"/>'; }).join("");
    var tbl = "<a:tbl>" + tblpr + "<a:tblGrid>" + grid + "</a:tblGrid>" + trs.join("") + "</a:tbl>";
    x = x.replace(/<a:tbl>[\s\S]*?<\/a:tbl>/, function () { return tbl; });
    var gm = /<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/.exec(x), gs = gm[0];
    var xf = /<p:xfrm><a:off x="(\d+)" y="(\d+)"\/><a:ext cx="\d+" cy="\d+"\/><\/p:xfrm>/.exec(gs);
    var ox = two ? X : +xf[1], oy = two ? Y : +xf[2];
    var tot = cols.reduce(function (a, b) { return a + b; }, 0);
    gs = gs.replace(xf[0], '<p:xfrm><a:off x="' + ox + '" y="' + oy + '"/><a:ext cx="' + tot + '" cy="' + (360475 + HH + nrows * HR) + '"/></p:xfrm>');
    this.setXml(n, x.slice(0, gm.index) + gs + x.slice(gm.index + gm[0].length));
  };

  /* ---- Imágenes ---- */
  Deck.prototype.relsOf = function (n) { return this.f["ppt/slides/_rels/slide" + n + ".xml.rels"] || ""; };
  Deck.prototype.ridFor = function (n, media) { var m = new RegExp('Id="(rId\\d+)"[^>]*Target="\\.\\./media/' + media.replace(".", "\\.") + '"').exec(this.relsOf(n)); return m ? m[1] : null; };
  Deck.prototype.removePicByMedia = function (media) {
    for (var n = 1; n <= 17; n++) {
      if (!this.xml(n)) continue;
      var rid = this.ridFor(n, media); if (!rid) continue;
      var x = this.xml(n);
      x = x.replace(new RegExp('<p:pic>(?:(?!</p:pic>)[\\s\\S])*?r:embed="' + rid + '"[\\s\\S]*?</p:pic>', "g"), "");
      this.setXml(n, x);
    }
  };
  Deck.prototype.removeYellowMarks = function (n) {
    this.setXml(n, this.xml(n).replace(/<p:sp>(?:(?!<\/p:sp>)[\s\S])*?<a:srgbClr val="FFFF00"\/>[\s\S]*?<\/p:sp>/g, ""));
  };
  Deck.prototype.setConsentGeometry = function (n, media, w, h) {
    var rid = this.ridFor(n, media); if (!rid) return;
    var x = this.xml(n);
    var re = new RegExp('<p:pic>(?:(?!</p:pic>)[\\s\\S])*?r:embed="' + rid + '"[\\s\\S]*?</p:pic>'), m = re.exec(x);
    if (!m) return;
    var pic = m[0], g = geo(pic), ncx = Math.round(g.cy * w / h);
    var maxW = Math.round(6.2 * EMU);
    if (ncx > maxW) { var ncy = Math.round(maxW * h / w); g.y += Math.round((g.cy - ncy) / 2); g.cy = ncy; ncx = maxW; }
    g.x = g.x + Math.round((g.cx - ncx) / 2); g.cx = ncx;
    pic = setGeo(pic, g).replace(/<a:srcRect[^\/]*\/>/, "<a:srcRect/>");
    this.setXml(n, x.slice(0, m.index) + pic + x.slice(m.index + m[0].length));
  };

  /* ---- Borrar láminas ---- */
  Deck.prototype.deleteSlides = function (nums) {
    var f = this.f;
    nums.forEach(function (n) {
      var rx = f["ppt/_rels/presentation.xml.rels"];
      var m = new RegExp('<Relationship Id="(rId\\d+)"[^>]*Target="slides/slide' + n + '\\.xml"/>').exec(rx);
      if (!m) return;
      f["ppt/_rels/presentation.xml.rels"] = rx.replace(m[0], "");
      f["ppt/presentation.xml"] = f["ppt/presentation.xml"].replace(new RegExp('<p:sldId id="\\d+" r:id="' + m[1] + '"/>'), "");
      var rel = f["ppt/slides/_rels/slide" + n + ".xml.rels"] || "";
      var notes = []; var nm, nre = /Target="\.\.\/notesSlides\/(notesSlide\d+\.xml)"/g;
      while ((nm = nre.exec(rel))) notes.push(nm[1]);
      delete f["ppt/slides/slide" + n + ".xml"]; delete f["ppt/slides/_rels/slide" + n + ".xml.rels"];
      var ct = f["[Content_Types].xml"].replace(new RegExp('<Override PartName="/ppt/slides/slide' + n + '\\.xml"[^>]*/>'), "");
      notes.forEach(function (nf) {
        delete f["ppt/notesSlides/" + nf]; delete f["ppt/notesSlides/_rels/" + nf + ".rels"];
        ct = ct.replace(new RegExp('<Override PartName="/ppt/notesSlides/' + nf.replace(".", "\\.") + '"[^>]*/>'), "");
      });
      f["[Content_Types].xml"] = ct;
    });
  };

  Deck.prototype.allText = function () {
    var out = []; for (var n = 1; n <= 17; n++) { var x = this.xml(n); if (x) out.push([n, (x.match(/<a:t[^>]*>[^<]*<\/a:t>/g) || []).map(function (t) { return unesc(t.replace(/<[^>]+>/g, "")); }).join(" ")]); }
    return out;
  };

  /* ===== Llenado completo desde los datos que devuelve Claude ===== */
  function clip(s, n) { s = String(s == null ? "" : s).trim(); return s.length > n ? s.slice(0, n - 1).trim() + "…" : s; }
  function arr(a) { return Array.isArray(a) ? a.filter(function (v) { return v != null && v !== ""; }) : []; }

  function fill(deck, A, B, opts) {
    var del = [], warn = deck.warnings;
    var aseg = clip(A.aseguradora || "", 40);
    var isZurich = /zurich/i.test(aseg);

    // 1 Portada
    var cliente = clip((A.cliente || "").toUpperCase(), 60);
    deck.setShapeText(1, "cliente", [["body", cliente]]);
    if (cliente.length > 28) deck.scaleFont(1, "cliente", Math.max(0.55, 30 / cliente.length));
    if (A.subgrupo) deck.setShapeText(1, "subgrupo", [["body", clip(A.subgrupo, 40)]]); else deck.removeShape(1, "subgrupo");
    deck.setShapeText(1, "tipo_poliza", [["body", clip(A.tipo_poliza || "Póliza de Vida Grupo", 45)]]);
    deck.setShapeText(1, "vigencia", [["body", clip(A.vigencia_corta || "", 20)]]);

    // 5 Mi póliza
    deck.setShapeText(5, "texto_1", [["body", clip("MI POLIZA " + aseg.toUpperCase(), 40)]]);
    deck.setShapeText(5, "texto_2", [["body", clip("POLIZA " + (A.poliza_numero || ""), 45)]], 0);
    var sub = clip(A.vigencia_larga || "", 70);
    deck.setShapeText(5, "texto_2", [["body", sub]], 1);
    var filas = arr(A.filas_poliza).map(function (r) { return { concepto: clip(r.concepto, 110), monto: clip(r.monto, 30) }; });
    if (filas.length) deck.polizaRows(filas); else warn.push("No se encontraron coberturas para la lámina 5.");

    // 6-8 Coberturas
    var cov = arr(A.coberturas).map(function (c) { return { t: clip(c.titulo, 70), x: clip(c.texto, 340) }; });
    var slots = [{ n: 6, proto: 0, blank: 1, max: 3 }, { n: 7, proto: 2, blank: 1, max: 3 }, { n: 8, proto: 0, blank: 1, max: 2 }];
    var CAP = 720, ci = 0;
    slots.forEach(function (s) {
      var list = [], used = 0;
      while (ci < cov.length && list.length < s.max && (list.length === 0 || used + cov[ci].t.length + cov[ci].x.length <= CAP)) {
        used += cov[ci].t.length + cov[ci].x.length; list.push(cov[ci]); ci++;
      }
      if (!list.length) { del.push(s.n); return; }
      var pars = [];
      list.forEach(function (c, i) {
        if (i) pars.push([s.blank, null]);
        pars.push([s.proto, [["first", "• "], ["lab", c.t.replace(/:?$/, ":")]].concat(greenify(" " + c.x))]);
      });
      deck.setShapePars(s.n, "texto_2", pars);
    });
    if (ci < cov.length) warn.push("No cupieron todas las coberturas en las láminas 6 a 8: " + cov.slice(ci).map(function (c) { return c.t; }).join(", ") + ".");

    // 9 Pérdidas orgánicas
    var po = A.perdidas_organicas;
    if (po && arr(po.filas).length) {
      deck.setShapePars(9, "texto_2", [[0, [["first", "• "], ["lab", "Pérdidas orgánicas:"], ["body", " " + clip(po.texto, 380)]]]]);
      var t = "TABLA DE INDEMNIZACIONES" + (po.escala ? " · ESCALA " + clip(po.escala, 12).toUpperCase() : "");
      deck.setTable(9, t, arr(po.filas).slice(0, 20).map(function (r) { return [clip(r[0], 75), clip(r[1], 8)]; }));
    } else del.push(9);

    // 10-11 Exclusiones de accidente
    var ea = B.exclusiones_accidente;
    if (ea && arr(ea.items).length) {
      var items = arr(ea.items).map(function (t) { return clip(t, 220); });
      var first = [], used = 0, k = 0;
      while (k < items.length && first.length < 9 && used + items[k].length <= 1350) { used += items[k].length; first.push(items[k]); k++; }
      var rest = items.slice(k);
      if (ea.titulo) { deck.setShapeText(10, "texto_1", [["body", clip(ea.titulo, 62)]]); deck.setShapeText(11, "texto_1", [["body", clip(ea.titulo, 62)]]); }
      deck.setShapePars(10, "texto_2", first.map(function (t, i) { return [0, [["body", (i + 1) + ". " + t]]]; }));
      var p11 = rest.map(function (t, i) { return [0, [["body", (first.length + i + 1) + ". " + t]]]; });
      if (ea.nota_endosos) {
        var nota = clip(ea.nota_endosos, 900), mm = /^([^:]{3,40}:)([\s\S]*)$/.exec(nota);
        p11.push([7, mm ? [["lab", mm[1]]].concat(greenify(mm[2])) : greenify(nota)]);
      }
      if (p11.length) deck.setShapePars(11, "texto_2", p11); else del.push(11);
      if (rest.length > 8) warn.push("La lista de exclusiones de accidente es larga; revisa que la lámina 11 no se salga.");
    } else { del.push(10); del.push(11); }

    // 12 Exclusiones de invalidez
    var ei = B.exclusiones_invalidez;
    if (ei && arr(ei.items).length) {
      if (ei.titulo) deck.setShapeText(12, "texto_1", [["body", clip(ei.titulo, 62)]]);
      var p12 = arr(ei.items).slice(0, 14).map(function (t, i) { return [0, [["body", (i + 1) + ". " + clip(t, 220)]]]; });
      if (ei.nota_endosos) {
        var n2 = clip(ei.nota_endosos, 520), m2 = /^([^:,]{3,60}[:,])([\s\S]*)$/.exec(n2);
        p12.push([10, m2 ? [["lab", m2[1]]].concat(greenify(m2[2])) : greenify(n2)]);
      }
      deck.setShapePars(12, "texto_2", p12);
    } else del.push(12);

    // 13 Asistencia funeraria
    var fu = B.funeraria;
    if (fu && arr(fu.secciones).length) {
      deck.setShapeText(13, "texto_2", [["body", clip(fu.intro || "", 140)]]);
      var secs = arr(fu.secciones);
      function secPars(sec) { return [[0, [["lab", clip(sec.titulo || "", 60).toUpperCase()]]]].concat(arr(sec.items).slice(0, 8).map(function (t) { return [1, [["body", "• " + clip(t, 110)]]]; })); }
      deck.setShapePars(13, "texto_3", secPars(secs[0]));
      var p4 = secs[1] ? secPars(secs[1]) : [];
      if (fu.nota) { var m3 = /^([^:]{3,30}:)([\s\S]*)$/.exec(clip(fu.nota, 240)); p4.push([5, m3 ? [["lab", m3[1]], ["body", m3[2]]] : [["body", clip(fu.nota, 240)]]]); }
      if (p4.length) deck.setShapePars(13, "texto_4", p4); else deck.removeShape(13, "texto_4");
      if (fu.como_usar) deck.setShapeText(13, "texto_6", [["body", clip(fu.como_usar, 120)]]); else deck.removeShape(13, "texto_6");
    } else del.push(13);

    // 14 Documentos
    var dc = B.documentos || {};
    var fal = arr(dc.fallecimiento).slice(0, 8), inv = arr(dc.invalidez).slice(0, 6);
    if (fal.length || inv.length) {
      var p14 = [];
      if (fal.length) { p14.push([0, [["lab", "Fallecimiento"]]], [1, null]); fal.forEach(function (t, i) { p14.push([2, [["body", (i + 1) + ". " + clip(t, 170)]]]); }); }
      if (inv.length) { p14.push([10, null], [13, [["lab", clip(dc.invalidez_titulo || "Invalidez total y permanente", 60)]]], [14, null]); inv.forEach(function (t, i) { p14.push([15, [["body", (i + 1) + ". " + clip(t, 170)]]]); }); }
      deck.setShapePars(14, "texto_3", p14);
    } else del.push(14);

    // 15 Consentimiento
    var co = B.consentimiento || {};
    deck.removeYellowMarks(15);
    var p15 = [[0, null]];
    if (co.pago) p15.push([1, [["lab", clip(co.pago, 130)]]], [2, null]);
    if (co.intro) p15.push([3, greenify(clip(co.intro, 200))], [4, null]);
    var its = arr(co.items).slice(0, 2);
    if (its[0]) p15.push([5, [["lab", clip(its[0].titulo || "", 45)], ["body", " " + clip(its[0].texto || "", 200)]]]);
    if (its[1]) p15.push([6, null], [7, [["body", "b)     "], ["body", clip((its[1].titulo ? its[1].titulo + " " : "") + (its[1].texto || ""), 230)]]]);
    if (p15.length > 1) deck.setShapePars(15, "texto_3", p15);
    if (!opts.consentImage) deck.removePicByMedia("image10.png");
    if (p15.length <= 1 && !opts.consentImage) del.push(15);

    // 16 Accidente y aviso
    var grupos = arr((B.accidente || {}).grupos).slice(0, 2);
    if (grupos.length) {
      var p16 = [];
      grupos.forEach(function (g, gi) {
        if (gi) p16.push([3, null]);
        p16.push([0, [["lab", clip(g.titulo || "", 95)]]], [1, null]);
        arr(g.items).slice(0, 4).forEach(function (t, i) { if (i) p16.push([3, null]); p16.push([2, [["body", (i + 1) + ". " + clip(t, 105)]]]); });
      });
      deck.setShapePars(16, "texto_3", p16);
    } else deck.removeShape(16, "texto_3");
    if (B.aviso) deck.setShapePars(16, "CuadroTexto 7", [[0, null], [1, [["body", clip(B.aviso, 340)]]]]);
    else deck.removeShape(16, "CuadroTexto 7");
    if (!grupos.length && !B.aviso) del.push(16);

    // Logo
    if (!opts.logo) deck.removePicByMedia("image6.png");

    var uniq = del.filter(function (v, i) { return del.indexOf(v) === i; }).sort(function (a, b) { return b - a; });
    deck.deleteSlides(uniq);

    // Revisión de restos del ejemplo
    var bad = ["Fábricas Selectas", "FÁBRICAS SELECTAS", "FABRICAS SELECTAS", "12000-6431"];
    if (!isZurich) bad = bad.concat(["Zurich", "ZURICH", "ANEMEX", "Anemex"]);
    deck.allText().forEach(function (st) { bad.forEach(function (b) { if (st[1].indexOf(b) >= 0) warn.push("La lámina " + st[0] + " todavía menciona “" + b + "”. Revísala antes de enviarla."); }); });
    return { borradas: uniq.slice().sort(function (a, b) { return a - b; }) };
  }

  return { Deck: Deck, fill: fill, greenify: greenify };
})();
if (typeof module !== "undefined") module.exports = VidaEngine;
