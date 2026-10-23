/* ===== Tipo "Daños": portada + láminas fijas 2-4 + comparativo en tablas con formato Single =====
   Independiente de Empresariales y de Otra. Usa la plantilla BPE solo como fuente de diseño. */
var DanosEngine = (function () {
  var EMU = 914400, SHELL = 12;
  var WHITE = "FEFEFE", GREEN = "89DC8F", RED = "FF8F86", MUTED = "A8A7C8";
  var HDR_FILL = "1D1C47", CUR_FILL = "16153A", LINE = "3A3970", FONT = "Barlow";

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function E(inches) { return Math.round(inches * EMU); }

  function cell(text, o) {
    o = o || {};
    var size = o.size || 1100, color = o.color || WHITE, align = o.align || "l";
    var ln = function (tag) { return "<a:" + tag + ' w="6350"><a:solidFill><a:srgbClr val="' + LINE + '"/></a:solidFill></a:' + tag + ">"; };
    var fill = o.fill ? '<a:solidFill><a:srgbClr val="' + o.fill + '"/></a:solidFill>' : "<a:noFill/>";
    var tcpr = '<a:tcPr marL="68580" marR="68580" marT="34290" marB="34290" anchor="ctr"><a:lnL w="0"><a:noFill/></a:lnL><a:lnR w="0"><a:noFill/></a:lnR>' + ln("lnT") + ln("lnB") + fill + "</a:tcPr>";
    var paras = String(text == null ? "" : text).split("\n").map(function (line) {
      var t = line.trim(), it = o.italic || (t.charAt(0) === "(" && t.charAt(t.length - 1) === ")");
      return '<a:p><a:pPr algn="' + align + '"/><a:r><a:rPr lang="es-MX" sz="' + size + '" b="' + (o.bold ? 1 : 0) + '" i="' + (it ? 1 : 0) + '" dirty="0">' +
        '<a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill><a:latin typeface="' + FONT + '"/></a:rPr><a:t>' + esc(line) + "</a:t></a:r></a:p>";
    }).join("");
    return "<a:tc><a:txBody><a:bodyPr/><a:lstStyle/>" + paras + "</a:txBody>" + tcpr + "</a:tc>";
  }

  function tableFrame(x, y, cols, rows, heights) {
    var sum = function (a) { return a.reduce(function (p, q) { return p + q; }, 0); };
    var grid = cols.map(function (w) { return '<a:gridCol w="' + w + '"/>'; }).join("");
    var trs = rows.map(function (r, i) { return '<a:tr h="' + heights[i] + '">' + r + "</a:tr>"; }).join("");
    return '<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="91" name="tabla"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>' +
      '<p:xfrm><a:off x="' + x + '" y="' + y + '"/><a:ext cx="' + sum(cols) + '" cy="' + sum(heights) + '"/></p:xfrm>' +
      '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="0"/>' +
      "<a:tblGrid>" + grid + "</a:tblGrid>" + trs + "</a:tbl></a:graphicData></a:graphic></p:graphicFrame>";
  }

  function newSlide(deck, title, subtitle) {
    var k = OtraEngine.clone(deck, SHELL);
    deck.setShapeText(k, "texto_1", [["body", title]]);
    deck.removeShape(k, "texto_2");
    var x = deck.xml(k).replace(/<p:pic>(?:(?!<\/p:pic>)[\s\S])*?name="Imagen 7"[\s\S]*?<\/p:pic>/g, "");
    if (subtitle) {
      x = x.replace("</p:spTree>", '<p:sp><p:nvSpPr><p:cNvPr id="90" name="subtitulo"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="' + E(0.46) + '" y="' + E(0.86) + '"/><a:ext cx="' + E(10) + '" cy="' + E(0.3) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>' +
        '<p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/><a:p><a:r><a:rPr lang="es-MX" sz="1300" dirty="0"><a:solidFill><a:srgbClr val="' + MUTED + '"/></a:solidFill><a:latin typeface="Chivo Thin"/></a:rPr><a:t>' + esc(subtitle) + "</a:t></a:r></a:p></p:txBody></p:sp></p:spTree>");
    }
    deck.setXml(k, x);
    return k;
  }

  function addTable(deck, k, colsIn, rows, heightsIn, yIn) {
    var cols = colsIn.map(E), heights = heightsIn.map(E), tot = cols.reduce(function (a, b) { return a + b; }, 0);
    var x = Math.round((13.333 * EMU - tot) / 2);
    deck.setXml(k, deck.xml(k).replace("</p:spTree>", tableFrame(x, E(yIn), cols, rows, heights) + "</p:spTree>"));
  }

  /* fmt: "hl" = resaltado (verde negritas), "red" = rojo, "i" = cursiva */
  function style(fmt) {
    var st = {}; fmt = fmt || [];
    if (fmt.indexOf("hl") >= 0) { st.bold = true; st.color = GREEN; }
    if (fmt.indexOf("b") >= 0) st.bold = true;
    if (fmt.indexOf("red") >= 0) st.color = RED;
    if (fmt.indexOf("i") >= 0) st.italic = true;
    return st;
  }

  function slideDatos(deck, rows, fecha) {
    var k = newSlide(deck, "Datos generales", fecha);
    var body = rows.map(function (r, i) {
      return cell(r[0], { bold: true, color: GREEN, size: 1300, fill: HDR_FILL }) + cell(r[1], { bold: i === 0, size: i === 0 ? 1500 : 1300 });
    });
    addTable(deck, k, [3.2, 6.6], body, rows.map(function (r) { return String(r[1]).length > 60 ? 0.62 : 0.5; }), 1.6);
    return k;
  }

  function slidePrimas(deck, P, fecha) {
    var k = newSlide(deck, "Comparativo de primas", fecha);
    var n = P.headers.length, wl = 1.45, wc = Math.min(1.4, (12.4 - wl) / n), cur = P.actual_cols || [];
    var hdr = cell("Concepto", { bold: true, color: GREEN, size: 1100, fill: HDR_FILL });
    var row = cell("Prima total\n(anual)", { bold: true, color: GREEN, size: 1200, fill: HDR_FILL });
    P.headers.forEach(function (h, i) {
      var c = cur.indexOf(i + 1) >= 0;
      hdr += cell(h[0] + "\n" + h[1], { bold: true, color: c ? WHITE : GREEN, size: n > 9 ? 900 : 1000, align: "ctr", fill: c ? CUR_FILL : HDR_FILL });
      row += cell(P.values[i], { bold: true, size: n > 9 ? 950 : 1100, align: "ctr", fill: c ? CUR_FILL : null });
    });
    var cols = [wl]; for (var i = 0; i < n; i++) cols.push(wc);
    addTable(deck, k, cols, [hdr, row], [0.75, 0.9], 2.4);
    return k;
  }

  function slideCompanias(deck, rows, fecha) {
    var k = newSlide(deck, "Compañías participantes", fecha);
    var body = [cell("Compañía", { bold: true, color: GREEN, size: 1200, fill: HDR_FILL }) + cell("Observaciones", { bold: true, color: GREEN, size: 1200, fill: HDR_FILL })];
    var h = rows.length > 13 ? 0.32 : 0.38, sz = rows.length > 13 ? 1050 : 1150;
    rows.forEach(function (r) { body.push(cell(r[0], { bold: true, size: sz + 50 }) + cell(r[1], { size: sz })); });
    var hs = [0.42]; rows.forEach(function () { hs.push(h); });
    addTable(deck, k, [2.6, 7.6], body, hs, 1.3);
    return k;
  }

  function rowHeight(r, labelW, colW, minH) {
    var lines = 1;
    r.forEach(function (c, j) {
      if (!c[0]) return;
      var cap = Math.floor((j === 0 ? labelW : colW) * 13.5);
      lines = Math.max(lines, String(c[0]).split("\n").reduce(function (a, l) { return a + Math.floor(l.length / cap) + 1; }, 0));
    });
    return Math.max(minH, 0.12 + 0.165 * lines);
  }

  function paginate(rows, labelW, colW) {
    var pages = [], cur = [], h = 0, MAXH = 5.3, MAXR = 11;
    rows.forEach(function (r) {
      var rh = rowHeight(r, labelW, colW, 0.3);
      if (cur.length && (h + rh > MAXH || cur.length >= MAXR)) { pages.push(cur); cur = []; h = 0; }
      cur.push(r); h += rh;
    });
    if (cur.length) pages.push(cur);
    // Evita una última página con 1-2 renglones si cabe repartir
    if (pages.length > 1 && pages[pages.length - 1].length <= 2) {
      var last = pages.pop(), prev = pages.pop(), all = prev.concat(last), half = Math.ceil(all.length / 2);
      pages.push(all.slice(0, half), all.slice(half));
    }
    return pages;
  }

  function slideTabla(deck, title, headers, rows, fecha, actualCol, labelW, colW, size) {
    var k = newSlide(deck, title, fecha), n = headers.length - 1;
    var hdr = cell(headers[0], { bold: true, color: GREEN, size: 1100, fill: HDR_FILL });
    for (var j = 1; j <= n; j++) hdr += cell(headers[j], { bold: true, color: j === actualCol ? WHITE : GREEN, size: 1100, align: "ctr", fill: j === actualCol ? CUR_FILL : HDR_FILL });
    var body = [hdr], heights = [0.5];
    rows.forEach(function (r) {
      var tr = "";
      r.forEach(function (c, j) {
        var st = style(c[1]), fill = j === actualCol ? CUR_FILL : (j === 0 ? HDR_FILL : null);
        tr += cell(c[0], { size: size, align: j === 0 ? "l" : "ctr", fill: fill, bold: st.bold != null ? st.bold : j === 0, color: st.color || WHITE, italic: !!st.italic });
      });
      body.push(tr); heights.push(rowHeight(r, labelW, colW, 0.3));
    });
    var cols = [labelW]; for (j = 0; j < n; j++) cols.push(colW);
    addTable(deck, k, cols, body, heights, 1.25);
    return k;
  }

  function cover(deck, cliente, vigencia) {
    var nombre = String(cliente || "").toUpperCase();
    deck.setShapeText(1, "cliente", [["body", nombre]]);
    if (nombre.length > 28) deck.scaleFont(1, "cliente", Math.max(0.55, 30 / nombre.length));
    var geo = function (name) { var m = /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(deck.shapeMatch(deck.xml(1), name).s); return { x: +m[1], y: +m[2], cx: +m[3], cy: +m[4] }; };
    var ySub = geo("subgrupo").y;
    deck.removeShape(1, "subgrupo");
    deck.removeShape(1, "tipo_poliza");
    if (vigencia) {
      deck.setShapeText(1, "vigencia", [["body", vigencia]]);
      var cg = geo("cliente");
      deck.moveShape(1, "vigencia", function (g) { g.x = cg.x; g.y = ySub; g.cx = cg.cx; });
      var x = deck.xml(1), sm = deck.shapeMatch(x, "vigencia");
      var s2 = sm.s.replace(/(<a:pPr[^>]*?)algn="\w+"/g, '$1algn="ctr"');
      deck.setXml(1, x.slice(0, sm.start) + s2 + x.slice(sm.end));
    } else deck.removeShape(1, "vigencia");
  }

  /* C = { cliente, vigencia, fecha, datos:[[l,v]], primas:{headers:[[aseg,opc]], values, actual_cols}, companias:[[c,o]],
          coberturas:{headers, rows, actual_col}, deducibles:{headers, rows, actual_col} } */
  function build(deck, C) {
    cover(deck, C.cliente, C.vigencia);
    var list = [1, 2, 3, 4], sub = C.fecha ? "Cotización · " + C.fecha : null;
    if (C.datos && C.datos.length) list.push(slideDatos(deck, C.datos, sub));
    if (C.primas && C.primas.headers.length) list.push(slidePrimas(deck, C.primas, sub));
    if (C.companias && C.companias.length) list.push(slideCompanias(deck, C.companias, sub));
    [["coberturas", "Comparativo de coberturas"], ["deducibles", "Comparativo de deducibles"]].forEach(function (t) {
      var T = C[t[0]]; if (!T || !T.rows || !T.rows.length) return;
      var n = T.headers.length - 1, labelW = 3.6, colW = Math.min(2.9, (12.4 - labelW) / n), size = n >= 5 ? 900 : 1000;
      var pages = paginate(T.rows, labelW, colW);
      pages.forEach(function (rows, i) {
        list.push(slideTabla(deck, t[1] + (pages.length > 1 ? " (" + (i + 1) + "/" + pages.length + ")" : ""), T.headers, rows, sub, T.actual_col, labelW, colW, size));
      });
    });
    OtraEngine.order(deck, list);
    return { usedMedia: OtraEngine.usedMedia(deck), laminas: list.length };
  }

  /* Convierte la respuesta de Claude (JSON) al formato del motor */
  function fromPlan(P) {
    var txt = function (c) { return c == null ? "" : String(typeof c === "object" ? (c.texto != null ? c.texto : "") : c); };
    var fmtOf = function (c, base) {
      var f = (base || []).slice(), t = c && typeof c === "object" ? c.tipo : null;
      if (t === "no_incluida" || t === "excluida") f.push("red");
      if (t === "sublimite") f.push("red", "i");
      return f;
    };
    var aseg = (P.columnas || []).map(function (a) { return String(a).toUpperCase(); });
    var hasActual = !!(P.poliza_actual && P.poliza_actual.aseguradora);
    var C = { cliente: P.cliente, vigencia: P.vigencia_corta, fecha: P.fecha };
    C.datos = (P.datos || []).filter(function (d) { return d && d.valor; }).map(function (d) { return [d.concepto, d.valor]; });
    var pr = (P.primas || []).filter(function (p) { return p && p.prima_total; });
    C.primas = { headers: pr.map(function (p) { return [String(p.aseguradora || "").toUpperCase(), String(p.opcion || "").toUpperCase()]; }), values: pr.map(function (p) { return p.prima_total; }), actual_cols: [] };
    pr.forEach(function (p, i) { if (/ACTUAL|VIGENTE/i.test(p.opcion || "")) C.primas.actual_cols.push(i + 1); });
    C.companias = (P.companias || []).map(function (c) { return [c.compania, c.observaciones || ""]; });
    function table(rows, withActual) {
      return (rows || []).map(function (r) {
        var base = r.destacado ? ["hl"] : [];
        var out = [[r.cobertura, base.slice(), null]];
        if (withActual) out.push([txt(r.actual), fmtOf(r.actual, base), null]);
        aseg.forEach(function (_, i) { var c = (r.valores || [])[i]; out.push([txt(c), fmtOf(c, r.destacado ? ["hl"] : []), null]); });
        return out;
      });
    }
    var head = ["Sección / Cobertura"];
    if (hasActual) head.push("PÓLIZA ACTUAL\n" + String(P.poliza_actual.aseguradora).toUpperCase());
    C.coberturas = { headers: head.concat(aseg), rows: table(P.coberturas, hasActual), actual_col: hasActual ? 1 : null };
    var dActual = hasActual && (P.deducibles || []).some(function (r) { return r.actual; });
    var dhead = ["Sección / Cobertura"]; if (dActual) dhead.push(head[1]);
    C.deducibles = { headers: dhead.concat(aseg), rows: table(P.deducibles, dActual), actual_col: dActual ? 1 : null };
    return C;
  }

  return { build: build, fromPlan: fromPlan, paginate: paginate };
})();
if (typeof module !== "undefined") module.exports = DanosEngine;
