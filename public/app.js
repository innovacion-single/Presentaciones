/* ===== Página: carga, lectura, análisis con Claude y armado ===== */
(function () {
  var SLOTS = [
    { id: "caratula", name: "Carátula de la póliza", help: "PDF de la póliza o carátula. Puede incluir anexos y endosos.", req: true, multi: false, accept: ".pdf,application/pdf" },
    { id: "cg", name: "Condiciones generales", help: "PDF de condiciones generales (y particulares, si vienen aparte).", req: true, multi: true, accept: ".pdf,application/pdf" },
    { id: "endosos", name: "Endosos especiales", help: "Si vienen en otro PDF. Si ya están dentro de la póliza, no hace falta.", req: false, multi: true, accept: ".pdf,application/pdf" },
    { id: "consent", name: "Consentimiento o certificado", help: "Para la lámina 15. Se usa la primera página y se tapan los datos personales.", req: false, multi: false, accept: ".pdf,application/pdf" }
  ];
  var SLOTS_DANOS = [
    { id: "cotizaciones", name: "Póliza actual y cotizaciones", help: "Sube todos los PDF (puedes elegir varios a la vez): la póliza vigente, si la hay, y la cotización de cada aseguradora y opción. Los PDF escaneados también se leen.", req: true, multi: true, accept: ".pdf,application/pdf" },
    { id: "companias", name: "Compañías participantes", help: "PDF o Excel con las aseguradoras que participaron y las que no, con sus observaciones.", req: true, multi: false, accept: ".pdf,application/pdf,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  ];
  var state = { files: {}, result: null, ctl: null };
  SLOTS.concat(SLOTS_DANOS).forEach(function (s) { state.files[s.id] = []; });
  function curSlots() { return state.tipo === "danos" ? SLOTS_DANOS : SLOTS; }
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Carga de archivos ---------- */
  function renderSlots() {
    var wrap = $("slots"); wrap.textContent = "";
    curSlots().forEach(function (s) {
      var el = document.createElement("div"); el.className = "slot" + (state.files[s.id].length ? " has" : "");
      var top = document.createElement("div"); top.className = "slot-top";
      var nm = document.createElement("span"); nm.className = "slot-name"; nm.textContent = s.name;
      var tg = document.createElement("span"); tg.className = "tag" + (s.req ? " req" : ""); tg.textContent = s.req ? "Obligatorio" : "Opcional";
      top.append(nm, tg);
      var hp = document.createElement("p"); hp.className = "slot-help"; hp.textContent = s.help;
      var ul = document.createElement("ul"); ul.className = "slot-files";
      state.files[s.id].forEach(function (f, i) {
        var li = document.createElement("li"); var sp = document.createElement("span"); sp.textContent = f.name;
        var x = document.createElement("button"); x.className = "x"; x.type = "button"; x.textContent = "Quitar"; x.setAttribute("aria-label", "Quitar " + f.name);
        x.onclick = function () { state.files[s.id].splice(i, 1); renderSlots(); renderCheck(); };
        li.append(sp, x); ul.append(li);
      });
      var inp = document.createElement("input"); inp.type = "file"; inp.id = "f-" + s.id; inp.accept = s.accept; inp.multiple = s.multi;
      inp.onchange = function () { addFiles(s, inp.files); inp.value = ""; };
      var lb = document.createElement("button"); lb.type = "button"; lb.className = "pick";
      lb.textContent = state.files[s.id].length ? (s.multi ? "Agregar otro archivo" : "Cambiar archivo") : "Elegir archivo";
      lb.onclick = function () { inp.click(); };
      el.append(top, hp, ul, lb, inp);
      el.addEventListener("dragover", function (e) { e.preventDefault(); el.classList.add("drag"); });
      el.addEventListener("dragleave", function () { el.classList.remove("drag"); });
      el.addEventListener("drop", function (e) { e.preventDefault(); el.classList.remove("drag"); addFiles(s, e.dataTransfer.files); });
      wrap.append(el);
    });
  }
  function addFiles(s, list) {
    var arr = Array.prototype.slice.call(list || []);
    if (!arr.length) return;
    if (s.multi) state.files[s.id] = state.files[s.id].concat(arr); else state.files[s.id] = [arr[0]];
    renderSlots(); renderCheck();
  }
  function renderCheck() {
    var ul = $("checklist"); ul.textContent = "";
    var items = [];
    if (state.tipo === "danos") return renderCheckDanos(ul);
    var hasC = state.files.caratula.length, hasG = state.files.cg.length;
    items.push([hasC ? "ok" : "err", hasC ? "Carátula cargada." : "Falta la carátula de la póliza. Es obligatoria."]);
    var esOtra = state.tipo === "otra";
    if (esOtra) items.push([hasG ? "ok" : "warn", hasG ? "Condiciones generales cargadas." : "Sin condiciones generales: solo se usará lo que venga en los demás documentos."]);
    else items.push([hasG ? "ok" : "err", hasG ? "Condiciones generales cargadas." : "Faltan las condiciones generales. Son obligatorias."]);
    items.push([state.files.endosos.length ? "ok" : "warn", state.files.endosos.length ? "Endosos cargados." : "Sin PDF de endosos. Si los endosos no vienen dentro de la póliza, las coberturas especiales no aparecerán."]);
    if (!esOtra) items.push([state.files.consent.length ? "ok" : "warn", state.files.consent.length ? "Consentimiento cargado." : "Sin consentimiento: la lámina 15 saldrá sin la imagen del certificado."]);
    items.forEach(function (it) {
      var li = document.createElement("li"); var d = document.createElement("span"); d.className = "dot " + it[0];
      var t = document.createElement("span"); t.textContent = it[1]; li.append(d, t); ul.append(li);
    });
    var tipoOk = state.tipo === "empresariales" || esOtra, docsOk = hasC && (hasG || esOtra);
    var tn = $("tipo-note");
    if (!state.tipo) tn.textContent = "Elige el tipo antes de armar la presentación.";
    else if (state.tipo === "empresariales") tn.textContent = "Se usará la plantilla de Empresariales (Vida Grupo).";
    else if (esOtra) tn.textContent = "Se usará el diseño de Single con el contenido de los documentos que subas.";
    $("go").disabled = !docsOk || !!state.ctl || !!state.noClaude || !tipoOk;
    var note = $("go-note");
    if (state.noClaude) note.textContent = state.noClaude;
    else if (!state.tipo) note.textContent = "El botón se activa cuando elijas el tipo de presentación y cargues la carátula y las condiciones generales.";
    else if (!tipoOk) note.textContent = "Este tipo de presentación todavía no está disponible.";
    else if (!docsOk) note.textContent = esOtra ? "El botón se activa cuando cargues la carátula o póliza." : "El botón se activa cuando cargues la carátula y las condiciones generales.";
    else note.textContent = "Tarda de 2 a 5 minutos. No cierres esta página mientras trabaja.";
  }

  function renderCheckDanos(ul) {
    var nc = state.files.cotizaciones.length, hasL = state.files.companias.length;
    var items = [[nc ? "ok" : "err", nc ? nc + (nc === 1 ? " PDF cargado." : " PDF cargados.") + " Claude reconoce la aseguradora, la póliza actual y las opciones de cada uno." : "Faltan los PDF de la póliza actual y de las cotizaciones."],
      [hasL ? "ok" : "err", hasL ? "Lista de compañías participantes cargada." : "Falta la lista de compañías participantes (PDF o Excel)."]];
    if (nc === 1) items.push(["warn", "Solo hay un PDF: el comparativo necesita las cotizaciones de cada aseguradora."]);
    items.forEach(function (it) {
      var li = document.createElement("li"); var d = document.createElement("span"); d.className = "dot " + it[0];
      var t = document.createElement("span"); t.textContent = it[1]; li.append(d, t); ul.append(li);
    });
    $("tipo-note").textContent = "Se armará el comparativo de Daños con el diseño de Single.";
    var ok = nc && hasL;
    $("go").disabled = !ok || !!state.ctl || !!state.noClaude;
    $("go-note").textContent = state.noClaude || (ok ? "Tarda de 3 a 8 minutos según cuántos PDF subas. No cierres esta página mientras trabaja." : "El botón se activa cuando cargues los PDF y la lista de compañías.");
  }

  /* ---------- Lectura de PDF ---------- */
  var pdfReady = null;
  function pdfLib() {
    if (!pdfReady) pdfReady = new Promise(function (res, rej) {
      var t0 = Date.now();
      (function wait() { if (window.pdfjsLib) res(window.pdfjsLib); else if (Date.now() - t0 > 15000) rej(new Error("No se pudo cargar el lector de PDF.")); else setTimeout(wait, 100); })();
    });
    return pdfReady;
  }
  async function openPdf(file) { var lib = await pdfLib(); var buf = await file.arrayBuffer(); return lib.getDocument({ data: buf, isEvalSupported: false }).promise; }
  async function pdfText(file, maxPages) {
    var doc = await openPdf(file), n = Math.min(doc.numPages, maxPages || doc.numPages), out = [];
    for (var p = 1; p <= n; p++) {
      var page = await doc.getPage(p), tc = await page.getTextContent(), lines = [], cur = null, lastY = null;
      tc.items.forEach(function (it) {
        if (!it.str) return;
        var y = Math.round(it.transform[5]);
        if (lastY === null || Math.abs(y - lastY) > 2) { if (cur) lines.push(cur); cur = it.str; lastY = y; }
        else cur += (it.hasEOL ? "" : " ") + it.str;
      });
      if (cur) lines.push(cur);
      out.push("[Página " + p + "]\n" + lines.join("\n"));
    }
    return { text: compact(out.join("\n")), pages: doc.numPages, read: n };
  }
  function compact(t) {
    var lines = t.split("\n").map(function (l) { return l.replace(/\s+/g, " ").trim(); }).filter(Boolean);
    var count = {}; lines.forEach(function (l) { if (l.length > 12) count[l] = (count[l] || 0) + 1; });
    var seen = {};
    return lines.filter(function (l) {
      if (/^\[Página \d+\]$/.test(l)) return true;
      if (count[l] >= 4) { if (seen[l]) return false; seen[l] = 1; }
      return true;
    }).join("\n");
  }
  var enc = new TextEncoder(); function bytes(s) { return enc.encode(s).length; }

  /* ---------- Instrucciones para Claude ---------- */
  var RULES = [
    "Eres el asistente de Single Broker (broker de seguros en México) que llena la presentación para cliente de una póliza de Vida Grupo.",
    "REGLA PRINCIPAL, por encima de todo: usa SOLO información que venga en los documentos de abajo. Nunca uses conocimiento general, de otras pólizas o de otras aseguradoras. Nunca inventes datos ni cifras (sumas, porcentajes, topes, plazos, teléfonos, nombres, fechas, coberturas, exclusiones, servicios). No conviertas valores con datos externos (por ejemplo, no conviertas UMA a pesos). Si un dato no está, deja el campo en null o la lista vacía y agrégalo a \"faltantes\".",
    "Cada texto debe poder señalarse en un documento. Si dudas, no lo pongas y avísalo en \"confirmar\".",
    "Si la carátula y las condiciones no coinciden, usa la carátula y avísalo en \"confirmar\".",
    "Usa los nombres y siglas de coberturas como los usa la aseguradora (por ejemplo BIT/BAIT, SAIT, MAPO).",
    "Las sumas aseguradas van por asegurado. Si la carátula solo trae el total del grupo, toma la suma del certificado o la regla de suma asegurada; si divides el total entre los asegurados, avísalo en \"confirmar\". Si la suma es una regla (p. ej. 24 meses de sueldo), escribe la regla.",
    "Formato: montos con signo y separadores ($2,000,000.00, sin espacio después de $); porcentajes con %; fechas largas como \"12 de agosto 2026 al 12 de agosto 2027\"; vigencia corta como \"2026 - 2027\".",
    "Español de México. Resume coberturas y exclusiones de las condiciones generales sin cambiar su sentido. Redacción en tercera persona (\"el asegurado\"); segunda persona solo en indicaciones (\"llama\", \"revisa\").",
    "Respeta los límites de caracteres indicados: son para que el texto quepa en la lámina.",
    "Cada elemento de \"faltantes\" y \"confirmar\" es {\"dato\": qué falta o qué confirmar, \"lamina\": número de lámina, \"como_resolver\": qué documento o acción lo resuelve}."
  ].join("\n");

  function promptA(src) {
    return RULES + "\n\nTAREA A: llena la portada, la lámina 'Mi póliza', las coberturas y la tabla de pérdidas orgánicas.\n" +
      "Responde SOLO con un objeto JSON con esta forma:\n" +
      JSON.stringify({
        es_vida_grupo: "true si los documentos son de una póliza de Vida Grupo",
        aseguradora: "nombre corto de la aseguradora, p. ej. 'Zurich' o 'Insignia Life'",
        cliente: "contratante sin 'SA de CV' ni similares (máx. 45 caracteres)",
        subgrupo: "subgrupo o categoría asegurada tal como viene, o null (máx. 35)",
        tipo_poliza: "p. ej. 'Póliza de Vida Grupo' (máx. 40)",
        vigencia_corta: "p. ej. '2025 - 2026'",
        poliza_numero: "número de póliza tal como viene",
        vigencia_larga: "p. ej. '15 de octubre 2025 al 15 de octubre 2026'",
        filas_poliza: [{ concepto: "nombre de la cobertura (máx. 50; usa \\n para partir en 2 renglones si es largo)", monto: "suma por asegurado, regla, porcentaje con tope, o 'Incluida' (máx. 26)" }],
        coberturas: [{ titulo: "nombre de la cobertura o endoso (máx. 60)", texto: "qué cubre y condiciones clave, 1-2 oraciones (máx. 300)" }],
        perdidas_organicas: { escala: "letra o nombre de la escala que aplica (p. ej. 'A'), o null si es la tabla general", texto: "explicación de la cobertura de pérdidas orgánicas (máx. 330)", filas: [["tipo de pérdida (máx. 70)", "porcentaje"]] },
        faltantes: [], confirmar: []
      }, null, 1) +
      "\nNotas: filas_poliza en el orden: fallecimiento, accidente/pérdidas orgánicas, invalidez, exención de primas, anticipos, asistencias; máximo 7 y solo las que tenga la póliza. coberturas: máximo 8, en el mismo orden, e incluye endosos que amplían la cobertura básica (p. ej. suicidio sin periodo de espera) solo si vienen en los documentos. perdidas_organicas: copia exactamente la tabla de la escala contratada; null si la póliza no tiene esa cobertura." +
      "\n\nDOCUMENTOS:\n" + src;
  }
  function promptB(src, a) {
    var ctx = { aseguradora: a.aseguradora, coberturas: (a.coberturas || []).map(function (c) { return c.titulo; }), filas_poliza: a.filas_poliza };
    return RULES + "\n\nTAREA B: llena exclusiones, asistencia funeraria, documentos de siniestro, consentimiento y aviso.\n" +
      "Contexto ya extraído de la misma póliza: " + JSON.stringify(ctx) + "\n" +
      "Responde SOLO con un objeto JSON con esta forma:\n" +
      JSON.stringify({
        exclusiones_accidente: { titulo: "p. ej. 'Exclusiones para la Cobertura de Muerte Accidental o PO:' (máx. 60)", items: ["exclusión resumida (máx. 200); si un endoso la cubre, agrega '(ver endoso de ...)'"], nota_endosos: "empieza con 'Endosos de esta póliza:' y resume lo que los endosos sí cubren de accidente, con topes y condiciones (máx. 750), o null" },
        exclusiones_invalidez: { titulo: "p. ej. 'Exclusiones para los Beneficios de Invalidez (BIT y BAIT):' con las siglas de esta aseguradora (máx. 60)", items: ["(máx. 200 c/u)"], nota_endosos: "empieza con 'Por endoso de esta póliza' (máx. 480), o null" },
        funeraria: { intro: "una oración (máx. 130)", secciones: [{ titulo: "p. ej. 'Para inhumación' (máx. 45)", items: ["servicio (máx. 100)"] }], nota: "p. ej. 'En ambos casos: ...' (máx. 220) o null", como_usar: "cómo pedir el servicio; incluye el teléfono solo si viene en los documentos; puede terminar con 'o a tu ejecutivo de Single.' (máx. 110)" },
        documentos: { fallecimiento: ["documento (máx. 160)"], invalidez_titulo: "p. ej. 'Invalidez total y permanente (BIT / BAIT)'", invalidez: ["documento (máx. 160)"] },
        consentimiento: { pago: "plazo en que la aseguradora paga tras recibir la documentación completa (máx. 120)", intro: "frase de introducción (máx. 180)", items: [{ titulo: "p. ej. 'Consentimiento' (máx. 40)", texto: "(máx. 180)" }] },
        accidente: { grupos: [{ titulo: "p. ej. 'Fallecimiento o pérdida orgánica por accidente:' (máx. 90)", items: ["documento adicional (máx. 100)"] }] },
        aviso: "plazo y forma de avisar un siniestro (máx. 330)",
        datos_personales_consentimiento: ["textos EXACTOS del consentimiento que identifican al asegurado: nombre, RFC, CURP, fecha de nacimiento, edad, beneficiarios"],
        faltantes: [], confirmar: []
      }, null, 1) +
      "\nNotas: exclusiones_accidente máximo 16 items; exclusiones_invalidez máximo 13; funeraria máximo 2 secciones de hasta 8 items, null si no hay asistencia funeraria; documentos fallecimiento máximo 8 e invalidez máximo 6 (null o vacío si no hay invalidez); consentimiento.items máximo 2 (documentos válidos para pago, aceptación de consentimientos de otras aseguradoras, etc.); accidente máximo 2 grupos de 4 items; usa null en lo que la póliza no tenga." +
      "\n\nDOCUMENTOS:\n" + src;
  }
  function promptOtra(src) {
    return RULES.replace("que llena la presentación para cliente de una póliza de Vida Grupo", "que arma una presentación para cliente con el diseño de Single") +
      "\n\nTAREA: arma el plan de láminas de la presentación con el contenido de los documentos (cualquier ramo que no sea Empresariales ni Daños). Usa solo lo que traen los documentos; no agregues láminas de temas que no vienen." +
      "\nResponde SOLO con un objeto JSON con esta forma:\n" +
      JSON.stringify({
        aseguradora: "nombre de la aseguradora o null",
        portada: { cliente: "contratante sin 'SA de CV' (máx. 45)", subtitulo: "ramo o producto (máx. 35)", tipo: "tipo de póliza (máx. 40) o null", vigencia: "p. ej. '2026 - 2027' o null" },
        laminas: [
          { tipo: "datos", titulo: "p. ej. 'MI POLIZA GNP' (máx. 35)", subtitulo: ["número de póliza (máx. 55)", "vigencia larga (máx. 70)"], filas: [{ concepto: "máx. 50", valor: "máx. 26" }] },
          { tipo: "puntos", titulo: "máx. 30", puntos: [{ titulo: "máx. 60", texto: "máx. 300" }] },
          { tipo: "lista", titulo: "máx. 60", items: ["máx. 200"], nota: "máx. 480 o null" },
          { tipo: "tabla", titulo: "máx. 38", texto: "máx. 330 o null", encabezados: ["máx. 40", "máx. 25"], filas: [["máx. 80", "máx. 35"]] },
          { tipo: "secciones", titulo: "máx. 30", subtitulo: "máx. 35 o null", grupos: [{ titulo: "máx. 70", items: ["máx. 160"] }] }
        ],
        faltantes: [], confirmar: []
      }, null, 1) +
      "\nNotas: 'laminas' es una lista en el orden de la presentación; cada tipo se puede repetir o no usar. Límites por lámina: datos hasta 7 filas; puntos hasta 3; lista hasta 14 items; tabla hasta 20 filas; secciones hasta 2 grupos de 8 items. Entre 3 y 12 láminas según lo que traigan los documentos. En 'lamina' de faltantes/confirmar usa el tema (p. ej. 'Coberturas')." +
      "\n\nDOCUMENTOS:\n" + src;
  }
  function promptCondense(chunk, i, n) {
    return RULES + "\n\nEste es el fragmento " + i + " de " + n + " de las condiciones generales de una póliza de Vida Grupo. Copia TEXTUALMENTE (sin resumir ni cambiar cifras) solo los pasajes útiles para la presentación: descripción de cada cobertura, tablas de indemnizaciones por pérdidas orgánicas, periodos de espera, exclusiones de cada cobertura, suicidio, documentos para reclamar, aviso de siniestro y plazo de pago. Omite todo lo demás. Pon el nombre de la sección antes de cada pasaje. Máximo 28,000 caracteres. Si no hay nada útil, responde 'SIN PASAJES'.\n\nFRAGMENTO:\n" + chunk;
  }

  /* ---------- Avance ---------- */
  var STEPS_VIDA = [["read", "Leer los documentos"], ["a", "Analizar la póliza y sus coberturas"], ["b", "Analizar exclusiones, asistencias y siniestros"], ["build", "Armar el PowerPoint"]];
  var STEPS_DANOS = [["read", "Leer los PDF y la lista de compañías"], ["a", "Extraer los datos de cada documento"], ["b", "Armar el comparativo con Claude"], ["build", "Armar el PowerPoint"]];
  var STEPS = STEPS_VIDA;
  function renderSteps() {
    var ol = $("steps"); ol.textContent = "";
    STEPS = state.tipo === "danos" ? STEPS_DANOS : STEPS_VIDA;
    STEPS.forEach(function (s) { var li = document.createElement("li"); li.className = "step"; li.id = "st-" + s[0]; li.innerHTML = "<i></i><div><span></span><small></small></div>"; li.querySelector("span").textContent = s[1]; ol.append(li); });
  }
  function step(id, cls, msg) { var li = $("st-" + id); if (!li) return; li.className = "step " + (cls || ""); if (msg != null) li.querySelector("small").textContent = msg; }
  function fail(msg) { $("prog").hidden = false; var e = $("error"); e.hidden = false; e.textContent = msg; e.scrollIntoView({ behavior: "smooth", block: "center" }); }

  var SAMPLE_MSG = {
    not_granted: "No se dio permiso para que esta página use Claude. Vuelve a cargar la página y acepta el permiso cuando lo pida.",
    sampling_disabled: "Tu cuenta no tiene Claude disponible para esta página. Entra con una cuenta de Claude e inténtalo de nuevo.",
    rate_limited: "Claude está saturado o se llegó al límite de la cuenta del equipo. Espera unos minutos y vuelve a intentarlo.",
    bad_key: "La clave del equipo no es correcta. Vuelve a cargar la página y escríbela de nuevo.",
    session_expired: "Tu sesión de Claude expiró. Vuelve a entrar y repite.",
    prompt_too_large: "Los documentos son demasiado largos para analizarlos de una vez. Quita páginas que no sean de la póliza (recibos, folletos) e intenta otra vez.",
    invalid_json: "Claude respondió en un formato que no se pudo leer. Intenta otra vez.",
    refused: "Claude no pudo procesar estos documentos. Revisa que sean de una póliza de Vida Grupo.",
    upstream_error: "Hubo una falla de conexión con Claude. Intenta otra vez.",
    cancelled: "Se detuvo el proceso."
  };
  function sampleErr(e) { return SAMPLE_MSG[e && e.code] || ("Algo falló al consultar a Claude" + (e && e.message ? ": " + e.message : ".")); }

  /* ---------- Logo con el formato de la lámina 3 ---------- */
  var LOGO_ALIASES = [["gnp", ["gnp", "grupo nacional provincial"]], ["insignia_life", ["insignia"]], ["inbursa", ["inbursa"]], ["axa", ["axa"]], ["seguros_atlas", ["atlas"]], ["qualitas", ["qualitas"]], ["mapfre", ["mapfre"]], ["sura", ["sura"]], ["gmx", ["gmx", "grupo mexicano de seguros"]], ["bupa", ["bupa"]], ["chubb", ["chubb"]], ["zurich", ["zurich"]], ["red_seguros", ["red seguros"]], ["banorte", ["banorte"]], ["aig", ["aig"]], ["metlife", ["metlife", "met life"]], ["berkley", ["berkley"]], ["afirme", ["afirme"]], ["dentegra", ["dentegra"]], ["allianz", ["allianz"]], ["qbe", ["qbe"]], ["el_potosi", ["potosi"]], ["hdi", ["hdi"]], ["seguros_monterrey", ["monterrey", "new york life"]], ["ana_seguros", ["ana seguros", "ana compania"]]];
  function matchLogo(name) {
    var n = " " + norm(name).replace(/[.,]/g, " ").replace(/\s+/g, " ") + " ";
    for (var i = 0; i < LOGO_ALIASES.length; i++) for (var j = 0; j < LOGO_ALIASES[i][1].length; j++) if (n.indexOf(" " + LOGO_ALIASES[i][1][j] + " ") >= 0) return LOGO_ALIASES[i][0];
    return null;
  }

  /* ---------- Imágenes ---------- */
  function loadImg(blob) { return new Promise(function (res, rej) { var u = URL.createObjectURL(blob), im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { rej(new Error("No se pudo abrir la imagen del logo.")); }; im.src = u; }); }
  function toBlob(c) { return new Promise(function (res) { c.toBlob(res, "image/png"); }); }
  async function logoPng(file) {
    var im = await loadImg(file), W = 820, H = 804, c = document.createElement("canvas"); c.width = W; c.height = H;
    var g = c.getContext("2d"); g.fillStyle = "rgb(14,29,62)"; g.fillRect(0, 0, W, H);
    var pad = 0.06, mw = W * (1 - 2 * pad), mh = H * (1 - 2 * pad), s = Math.min(mw / im.width, mh / im.height);
    var w = im.width * s, h = im.height * s; g.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
    return toBlob(c);
  }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim(); }
  async function consentPng(file, personal) {
    var lib = await pdfLib(), doc = await openPdf(file), page = await doc.getPage(1);
    var vp = page.getViewport({ scale: 2 }), c = document.createElement("canvas"); c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: g, viewport: vp }).promise;
    var tc = await page.getTextContent(), keys = (personal || []).map(norm).filter(function (k) { return k.length >= 3; }), masked = 0;
    tc.items.forEach(function (it) {
      var s = norm(it.str); if (s.length < 3) return;
      var hit = keys.some(function (k) { return k.indexOf(s) >= 0 && s.length >= 4 || s.indexOf(k) >= 0; });
      if (!hit) return;
      var t = lib.Util.transform(vp.transform, it.transform), fh = Math.hypot(t[2], t[3]), w = it.width * vp.scale;
      g.fillStyle = "rgb(200,200,200)"; g.fillRect(t[4] - 3, t[5] - fh - 2, w + 6, fh * 1.35 + 4); masked++;
    });
    return { blob: await toBlob(c), w: c.width, h: c.height, masked: masked };
  }

  /* ---------- Proceso completo ---------- */
  async function run() {
    if (!window.claude) { fail("Abre esta página desde claude.ai con tu sesión iniciada."); $("prog").hidden = false; return; }
    var sample = await claude.use("sample"), downloads = await claude.use("downloads");
    if (!sample) { fail("Esta página necesita permiso para usar Claude con tu cuenta. Ábrela desde claude.ai con tu sesión iniciada."); return; }
    state.ctl = new AbortController(); var signal = state.ctl.signal;
    $("go").disabled = true; $("stop").hidden = false; $("prog").hidden = false; $("out").hidden = true; $("error").hidden = true;
    renderSteps();
    var missing = [], confirm = [];
    try {
      if (state.tipo === "danos") { await runDanos(sample, downloads, signal); return; }
      // 1. Leer
      step("read", "run", "Abriendo los PDF…");
      var parts = [], cgText = "";
      for (var i = 0; i < state.files.caratula.length; i++) { var r = await pdfText(state.files.caratula[i]); parts.push("=== CARÁTULA / PÓLIZA: " + state.files.caratula[i].name + " ===\n" + r.text); if (r.text.replace(/\[Página \d+\]/g, "").trim().length < 200) missing.push({ dato: "La carátula parece escaneada (sin texto legible)", lamina: "1 y 5", como_resolver: "Sube el PDF original de la aseguradora, no un escaneo." }); }
      for (i = 0; i < state.files.endosos.length; i++) { r = await pdfText(state.files.endosos[i]); parts.push("=== ENDOSOS: " + state.files.endosos[i].name + " ===\n" + r.text); }
      if (state.files.consent.length) { r = await pdfText(state.files.consent[0], 4); parts.push("=== CONSENTIMIENTO (primeras páginas): " + state.files.consent[0].name + " ===\n" + r.text); }
      for (i = 0; i < state.files.cg.length; i++) { r = await pdfText(state.files.cg[i]); cgText += "=== CONDICIONES GENERALES: " + state.files.cg[i].name + " ===\n" + r.text + "\n"; }
      var base = parts.join("\n\n");
      var limits = await sample.limits().catch(function () { return null; });
      var maxB = (limits && limits.maxPromptBytes) || 262144, room = maxB - 14000;
      step("read", "done", Math.round((bytes(base) + bytes(cgText)) / 1024) + " KB de texto");

      if (bytes(base) + bytes(cgText) > room) {
        step("read", "run", "Las condiciones generales son largas; Claude va a extraer solo los pasajes útiles…");
        var chunkSize = room - bytes(base) > 60000 ? Math.min(room - 20000, 200000) : 150000, chunks = [], cur = "";
        cgText.split("\n").forEach(function (l) { if (bytes(cur) + bytes(l) > chunkSize) { chunks.push(cur); cur = ""; } cur += l + "\n"; });
        if (cur) chunks.push(cur);
        var condensed = [];
        for (var c = 0; c < chunks.length; c++) {
          step("read", "run", "Extrayendo pasajes útiles " + (c + 1) + " de " + chunks.length + "…");
          var res = await sample(promptCondense(chunks[c], c + 1, chunks.length), { modelTier: "default", signal: signal });
          if (!/SIN PASAJES/.test(res.text)) condensed.push(res.text);
        }
        cgText = "=== CONDICIONES GENERALES (pasajes copiados textualmente por Claude) ===\n" + condensed.join("\n");
        if (bytes(base) + bytes(cgText) > room) {
          var keep = room - bytes(base); cgText = cgText.slice(0, Math.max(0, Math.floor(keep / 1.1)));
          confirm.push({ dato: "Las condiciones generales se recortaron para que cupieran; revisa exclusiones y documentos", lamina: "10 a 16", como_resolver: "Compara contra las condiciones generales." });
        }
        step("read", "done", "Pasajes útiles listos");
      }
      var src = base + "\n\n" + cgText;
      if (state.tipo === "otra") { await runOtra(sample, downloads, src, missing, confirm, signal); return; }

      // 2. Análisis A
      step("a", "run", "Esperando a Claude… (puede pedirte permiso la primera vez)");
      var A = await sample.json(promptA(src), { modelTier: "default", signal: signal, onText: function (o) { step("a", "run", "Escribiendo… " + o.text.length + " caracteres"); } });
      if (!A || typeof A !== "object") throw { code: "invalid_json" };
      if (A.es_vida_grupo === false || A.es_vida_grupo === "false") throw new Error("Los documentos no parecen ser de una póliza de Vida Grupo. Esta herramienta es solo para Vida Grupo.");
      step("a", "done", (A.aseguradora || "Aseguradora") + " · póliza " + (A.poliza_numero || "sin número"));

      // 3. Análisis B
      step("b", "run", "Esperando a Claude…");
      var B = await sample.json(promptB(src, A), { modelTier: "default", signal: signal, onText: function (o) { step("b", "run", "Escribiendo… " + o.text.length + " caracteres"); } });
      if (!B || typeof B !== "object") throw { code: "invalid_json" };
      step("b", "done", "Listo");

      // 4. Armar
      step("build", "run", "Cargando la plantilla…");
      var tpl = await (await fetch("plantilla.json")).json();
      var zip = await JSZip.loadAsync(tpl.base64, { base64: true });
      var files = {}, names = Object.keys(zip.files).filter(function (n) { return /\.(xml|rels)$/.test(n); });
      for (i = 0; i < names.length; i++) files[names[i]] = await zip.file(names[i]).async("string");
      var deck = new VidaEngine.Deck(files);
      var opts = { logo: false, consentImage: false };

      var logoKey = matchLogo(A.aseguradora || "");
      if (logoKey) {
        try { var lg = await (await fetch("logos.json")).json(); zip.file("ppt/media/image6.png", lg[logoKey], { base64: true }); opts.logo = true; }
        catch (e) { logoKey = null; }
      }
      if (!logoKey) missing.push({ dato: "Logo de " + (A.aseguradora || "la aseguradora") + ": no está entre las aseguradoras de la lámina 3, así que se quitó", lamina: "5 a 16", como_resolver: "Pide que se agregue su recuadro a la lámina 3 de la plantilla." });
      if (state.files.consent.length) {
        step("build", "run", "Preparando el consentimiento…");
        try {
          var cimg = await consentPng(state.files.consent[0], B.datos_personales_consentimiento);
          zip.file("ppt/media/image10.png", cimg.blob); opts.consentImage = true;
          deck.setConsentGeometry(15, "image10.png", cimg.w, cimg.h);
          confirm.push({ dato: cimg.masked ? "Revisa que el nombre y los datos personales del consentimiento estén tapados" : "No se encontraron datos personales que tapar en el consentimiento; revísalo", lamina: "15", como_resolver: "Mira la imagen de la lámina 15 antes de enviar." });
        } catch (e) { missing.push({ dato: "No se pudo leer el consentimiento", lamina: "15", como_resolver: "Sube el consentimiento en PDF." }); }
      } else {
        missing.push({ dato: "Imagen del consentimiento o certificado", lamina: "15", como_resolver: "Sube el consentimiento en PDF." });
      }

      step("build", "run", "Llenando las láminas…");
      var info = VidaEngine.fill(deck, A, B, opts);
      Object.keys(deck.f).forEach(function (n) { zip.file(n, deck.f[n]); });
      names.forEach(function (n) { if (!(n in deck.f)) zip.remove(n); });
      var blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", compression: "DEFLATE" });
      var fname = ("Presentacion_Vida_" + (A.cliente || "cliente").replace(/[^\wÁÉÍÓÚÑáéíóúñ]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) + "_" + (A.vigencia_corta || "").replace(/\s/g, "") + ".pptx").replace(/_\.pptx$/, ".pptx");
      step("build", "done", fname);

      var all = [].concat(missing, A.faltantes || [], B.faltantes || []).map(function (m) { return ["Falta", m]; })
        .concat([].concat(confirm, A.confirmar || [], B.confirmar || []).map(function (m) { return ["Confirmar", m]; }))
        .concat(deck.warnings.map(function (w) { return ["Revisar", { dato: w }]; }));
      state.result = { blob: blob, name: fname };
      showResult(all, info.borradas, downloads);
    } catch (e) {
      var msg = e && e.code ? sampleErr(e) : (e && e.message ? e.message : "Algo falló.");
      STEPS.forEach(function (s) { var li = $("st-" + s[0]); if (li && /run/.test(li.className)) step(s[0], "fail"); });
      if (!(e && e.code === "cancelled")) fail(msg); else fail(SAMPLE_MSG.cancelled);
    } finally {
      state.ctl = null; $("stop").hidden = true; renderCheck();
    }
  }

  async function runOtra(sample, downloads, src, missing, confirm, signal) {
    step("a", "run", "Esperando a Claude… (puede pedirte permiso la primera vez)");
    var P = await sample.json(promptOtra(src), { modelTier: "default", signal: signal, onText: function (o) { step("a", "run", "Escribiendo… " + o.text.length + " caracteres"); } });
    if (!P || typeof P !== "object" || !Array.isArray(P.laminas)) throw { code: "invalid_json" };
    step("a", "done", (P.aseguradora || "Sin aseguradora") + " · " + P.laminas.length + " láminas de contenido");
    step("b", "done", "No aplica para este tipo");
    step("build", "run", "Cargando el diseño de Single…");
    var tpl = await (await fetch("plantilla.json")).json();
    var zip = await JSZip.loadAsync(tpl.base64, { base64: true });
    var files = {}, names = Object.keys(zip.files).filter(function (n) { return /\.(xml|rels)$/.test(n); });
    for (var i = 0; i < names.length; i++) files[names[i]] = await zip.file(names[i]).async("string");
    var deck = new VidaEngine.Deck(files), opts = { logo: false };
    var logoKey = P.aseguradora ? matchLogo(P.aseguradora) : null;
    if (logoKey) { try { var lg = await (await fetch("logos.json")).json(); zip.file("ppt/media/image6.png", lg[logoKey], { base64: true }); opts.logo = true; } catch (e) { logoKey = null; } }
    if (P.aseguradora && !logoKey) missing.push({ dato: "Logo de " + P.aseguradora + ": no está entre las aseguradoras de la lámina 3, así que se quitó", lamina: "todas", como_resolver: "Pide que se agregue su recuadro a la lámina 3." });
    step("build", "run", "Armando las láminas…");
    var info = OtraEngine.build(deck, P, opts);
    Object.keys(deck.f).forEach(function (n) { zip.file(n, deck.f[n]); });
    Object.keys(zip.files).forEach(function (n) {
      if (/\.(xml|rels)$/.test(n) && !(n in deck.f)) zip.remove(n);
      else if (/^ppt\/media\//.test(n) && !info.usedMedia[n.split("/").pop()]) zip.remove(n);
    });
    var blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", compression: "DEFLATE" });
    var cli = ((P.portada && P.portada.cliente) || "cliente").replace(/[^\wÁÉÍÓÚÑáéíóúñ]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
    var fname = "Presentacion_" + cli + "_" + (((P.portada && P.portada.vigencia) || "").replace(/\s/g, "")) + ".pptx";
    fname = fname.replace(/_\.pptx$/, ".pptx");
    step("build", "done", fname);
    var all = [].concat(missing, P.faltantes || []).map(function (m) { return ["Falta", m]; })
      .concat([].concat(confirm, P.confirmar || []).map(function (m) { return ["Confirmar", m]; }))
      .concat([["Revisar", { dato: "Las láminas 2, 3, 4 y la de cierre son las fijas de Single (incluido el cierre con Brenda, Gricelda y Lupita)" }]]);
    state.result = { blob: blob, name: fname };
    showResult(all, info.laminas, downloads);
  }

  /* ---------- Daños ---------- */
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  function fechaHoy() { var d = new Date(); return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()] + " " + d.getFullYear(); }

  async function xlsxText(file) {
    var zip = await JSZip.loadAsync(await file.arrayBuffer()), ss = [], out = [];
    var sst = zip.file("xl/sharedStrings.xml");
    if (sst) { var x = await sst.async("string"), m, re = /<si>([\s\S]*?)<\/si>/g; while ((m = re.exec(x))) ss.push((m[1].match(/<t[^>]*>([^<]*)<\/t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ""); }).join("")); }
    var sheets = Object.keys(zip.files).filter(function (n) { return /^xl\/worksheets\/sheet\d+\.xml$/.test(n); }).sort();
    for (var i = 0; i < sheets.length; i++) {
      var sx = await zip.file(sheets[i]).async("string"), rm, rre = /<row[^>]*>([\s\S]*?)<\/row>/g;
      out.push("[Hoja " + (i + 1) + "]");
      while ((rm = rre.exec(sx))) {
        var cells = [], cm, cre = /<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        while ((cm = cre.exec(rm[1]))) {
          var attrs = cm[1], inner = cm[2] || "", v = /<v>([^<]*)<\/v>/.exec(inner), it = /<t[^>]*>([^<]*)<\/t>/.exec(inner);
          var val = /t="s"/.test(attrs) && v ? ss[+v[1]] : (it ? it[1] : (v ? v[1] : ""));
          if (val !== "" && val != null) cells.push(val);
        }
        if (cells.length) out.push(cells.join(" | "));
      }
    }
    return out.join("\n").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
  }

  async function pageImages(file, from, to) {
    var doc = await openPdf(file), imgs = [];
    for (var p = from; p <= Math.min(to, doc.numPages); p++) {
      var page = await doc.getPage(p), vp = page.getViewport({ scale: 1.4 }), c = document.createElement("canvas");
      c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
      var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      imgs.push(c.toDataURL("image/jpeg", 0.7).split(",")[1]);
    }
    return imgs;
  }

  async function pool(tasks, n) {
    var out = new Array(tasks.length), i = 0;
    async function worker() { while (i < tasks.length) { var k = i++; out[k] = await tasks[k](); } }
    var ws = []; for (var w = 0; w < Math.min(n, tasks.length); w++) ws.push(worker());
    await Promise.all(ws);
    return out;
  }

  var RULES_DANOS = [
    "Eres el asistente de Single Broker (broker de seguros en México) que arma el comparativo de seguros de Daños para un cliente.",
    "REGLA PRINCIPAL, por encima de todo: usa SOLO información que venga en los documentos. Nunca inventes datos ni cifras (sumas, sublímites, deducibles, coaseguros, primas, nombres, fechas, RFC). No calcules montos que el documento no trae (por ejemplo, no conviertas un porcentaje de sublímite a pesos ni UMA a pesos). Si un dato no está, déjalo fuera o márcalo como no incluido, y avísalo en \"faltantes\" o \"confirmar\".",
    "Si algo no cuadra entre documentos (vigencias, sumas, nombres), usa lo que diga cada documento y avísalo en \"confirmar\".",
    "Cada elemento de \"faltantes\" y \"confirmar\" es {\"dato\": qué falta o qué confirmar, \"lamina\": tema (p. ej. 'Coberturas', 'Primas'), \"como_resolver\": qué documento o acción lo resuelve}.",
    "Formato: montos con signo y separadores ($87,406,018.00); porcentajes con %; abreviaturas como en el ramo (S/SA, S/P, S/R, S/VR, UMA, Coas.). Español de México."
  ].join("\n");

  function promptTranscribe(name, from, to) {
    return RULES_DANOS + "\n\nLas imágenes son las páginas " + from + " a " + to + " del documento \"" + name + "\" (PDF escaneado). Transcribe TEXTUALMENTE, sin resumir ni cambiar cifras, solo lo útil para un comparativo de Daños: aseguradora, número de póliza o cotización, fecha, vigencia, asegurado, RFC, domicilio, giro, moneda, forma de pago, cada sección con sus coberturas, sumas aseguradas, límites, sublímites, deducibles y coaseguros (escribe cada tabla renglón por renglón con ' | ' entre columnas), coberturas amparadas, excluidas o no cotizadas, y primas (neta, derechos, recargos, IVA, total). Omite medidas de seguridad, textos legales y exclusiones largas. Pon \"[Página n]\" antes de cada página. Si una página no tiene nada útil, escribe \"[Página n] sin datos útiles\".";
  }
  function promptCondenseDanos(name, chunk, i, n) {
    return RULES_DANOS + "\n\nEste es el fragmento " + i + " de " + n + " del documento \"" + name + "\". Copia TEXTUALMENTE (sin resumir ni cambiar cifras) solo lo útil para un comparativo de Daños: aseguradora, número de póliza o cotización, vigencia, asegurado, RFC, domicilio, giro, moneda, forma de pago, cada sección con sus coberturas, sumas aseguradas, límites, sublímites, deducibles y coaseguros, coberturas amparadas, excluidas o no cotizadas, y primas (neta, derechos, recargos, IVA, total). Omite condiciones generales, definiciones, procedimientos, medidas de seguridad, avisos legales y exclusiones largas. Máximo 25,000 caracteres. Si no hay nada útil, responde 'SIN PASAJES'.\n\nFRAGMENTO:\n" + chunk;
  }
  function promptDanos(src, fecha) {
    var cell = "texto de la celda, o {\"texto\": \"...\", \"tipo\": \"sublimite\" | \"no_incluida\" | \"excluida\"}";
    return RULES_DANOS + "\n\nTAREA: arma el comparativo de Daños con los documentos de abajo. Te van a llegar varios PDF independientes: la póliza vigente (si la hay) y las cotizaciones de cada aseguradora, a veces con varias opciones (01, 02...) en archivos separados o en el mismo archivo. Reconoce tú qué aseguradora es cada documento, si es la póliza actual o una cotización, y cuántas opciones cotizó cada aseguradora. También viene la lista de compañías participantes." +
      "\nResponde SOLO con un objeto JSON con esta forma:\n" +
      JSON.stringify({
        es_danos: "true si los documentos son de un seguro de Daños (paquete empresarial, multirriesgo, incendio, RC, etc.)",
        cliente: "nombre COMPLETO del asegurado tal como viene, con su tipo de sociedad, en mayúsculas (p. ej. 'FENIX ENVASES S.A. DE C.V.')",
        vigencia_corta: "vigencia del programa que se cotiza, p. ej. '2026 - 2027'",
        documentos: [{ archivo: "nombre del archivo", aseguradora: "nombre corto en mayúsculas", tipo: "poliza_actual | cotizacion | lista_companias | otro", opciones: ["01", "02"] }],
        datos: [{ concepto: "Nombre del Asegurado | RFC | Domicilio del Riesgo | Vigencia del Programa | Tipo de Moneda | Forma de Pago", valor: "tal como viene" }],
        primas: [{ aseguradora: "nombre corto en mayúsculas", opcion: "PÓLIZA ACTUAL | OPCIÓN 01 | OPCIÓN 02 ...", prima_total: "$000,000.00" }],
        companias: [{ compania: "como viene en la lista", observaciones: "como viene en la lista" }],
        poliza_actual: { aseguradora: "nombre corto en mayúsculas, o null si no hay póliza actual" },
        columnas: ["aseguradoras (nombre corto en mayúsculas) que van en las tablas de coberturas y deducibles, una columna por aseguradora"],
        coberturas: [{ cobertura: "nombre del renglón", destacado: "true solo en renglones de suma asegurada o límite general de una sección", actual: cell + " (póliza actual; omítelo si no hay)", valores: [cell + " (uno por cada aseguradora de 'columnas', en el mismo orden)"] }],
        deducibles: [{ cobertura: "nombre del renglón", valores: [cell] }],
        faltantes: [], confirmar: []
      }, null, 1) +
      "\nReglas del comparativo:" +
      "\n- datos: solo los conceptos que vengan en los documentos; omite los que no encuentres y avísalo en faltantes." +
      "\n- primas: prima total anual de cada opción. Orden: primero la PÓLIZA ACTUAL; luego la OPCIÓN 01 de cada aseguradora; luego la OPCIÓN 02 de cada una, y así. Usa el mismo orden de aseguradoras en todo el comparativo. Si una aseguradora cotizó una sola opción, ponla como OPCIÓN 01." +
      "\n- companias: copia la lista de compañías participantes tal como viene, en el mismo orden." +
      "\n- columnas: una por aseguradora con cotización (no una por opción). Si la lista de compañías dice que una aseguradora solo dio un indicativo de prima, va solo en primas y no en columnas; avísalo en confirmar." +
      "\n- Cuando un valor cambie entre opciones de la misma aseguradora, ponlos en la misma celda, uno por renglón: \"$50,000,000.00 OPCIÓN 01\\n$75,000,000.00 OPCIÓN 02\"." +
      "\n- Celdas: 'Amparada' si el documento la ampara sin monto propio; el monto si trae suma o límite propio; tipo 'sublimite' cuando sea un sublímite (escribe el monto o el texto tal como viene, p. ej. 'Hasta 10% de los valores', seguido de \"\\n(Sublímite)\"); tipo 'no_incluida' con texto 'No incluida' cuando el documento de esa aseguradora no la menciona o dice 'no cotizada'; tipo 'excluida' con texto 'Excluida' solo cuando el documento la excluye expresamente." +
      "\n- Renglones de coberturas, como base (agrega los de otras secciones que traigan los documentos, como robo, dinero y valores, anuncios luminosos o pérdidas consecuenciales, y quita los que ninguna trae): Contenidos/Edificio - Valores Totales Declarados (destacado); Incendio, Rayo y Explosión; Todo Riesgo / Otros Riesgos; Riesgos Hidrometeorológicos; Terremoto y Erupción Volcánica; Huelgas, Vandalismo y Alborotos Populares; Remoción de Escombros (Sublímite); Gastos Extraordinarios (Sublímite); Derrame de Equipos de Protección; Responsabilidad Civil - Límite General (destacado); RC Actividades e Inmuebles; RC Arrendatario; RC Productos; R.C. Carga y Descarga; R.C. Asumida; R.C. Cruzada; R.C. Contratista Independiente; Rotura de Cristales; Equipo Electrónico - Suma Asegurada (destacado); Equipo Electrónico - Daño Material; Equipo Electrónico - Robo con Violencia; Equipo Electrónico - Equipos Móviles y Portátiles; Rotura de Maquinaria - Suma Asegurada (destacado); Rotura de Maquinaria - Explosión Física; Rotura de Maquinaria - Explosión en Motores de Combustión Interna." +
      "\n- Deducibles: los mismos renglones (sin los de suma asegurada ni el límite general de RC), con deducible y coaseguro de cada aseguradora, p. ej. '1% S/SA, Máx. 750 UMA', '2% S/SA (Coas. 10%)', 'Sin deducible'. Usa 'Sin deducible' solo si el documento lo dice o no trae deducible para esa cobertura amparada; si no la ampara, 'No incluida'. Los deducibles no llevan columna de póliza actual." +
      "\n- Si un documento de la póliza actual no trae algún renglón, deja su celda como 'No incluida' y avísalo." +
      "\n- La fecha de hoy es " + fecha + "; no la uses como vigencia." +
      "\n\nDOCUMENTOS:\n" + src;
  }

  async function runDanos(sample, downloads, signal) {
    var missing = [], confirm = [], fecha = fechaHoy();
    var limits = await sample.limits().catch(function () { return null; });
    var maxB = (limits && limits.maxPromptBytes) || 262144, room = maxB - 16000;
    var docs = [], work = [];
    step("read", "run", "Abriendo los archivos…");
    var all = state.files.cotizaciones.map(function (f) { return { f: f, kind: "doc" }; }).concat(state.files.companias.map(function (f) { return { f: f, kind: "lista" }; }));
    for (var i = 0; i < all.length; i++) {
      var f = all[i].f, label = all[i].kind === "lista" ? "LISTA DE COMPAÑÍAS PARTICIPANTES" : "DOCUMENTO";
      step("read", "run", "Leyendo " + (i + 1) + " de " + all.length + ": " + f.name);
      try {
        if (/\.xlsx$/i.test(f.name)) { docs.push({ name: f.name, label: label, text: await xlsxText(f) }); continue; }
        var r = await pdfText(f);
      } catch (e) {
        missing.push({ dato: "No se pudo abrir \"" + f.name + "\" (" + (e && e.message || "archivo dañado") + "); no se usó en el comparativo", lamina: "Comparativo", como_resolver: "Vuelve a descargar el PDF de la aseguradora y súbelo otra vez." });
        continue;
      }
      var chars = r.text.replace(/\[Página \d+\]/g, "").replace(/\s/g, "").length;
      if (chars / Math.max(1, r.pages) < 120) docs.push({ name: f.name, label: label, scanned: true, pages: r.pages, file: f });
      else docs.push({ name: f.name, label: label, text: r.text });
    }
    step("read", "done", all.length + " archivos leídos");

    // Extraer: PDF escaneados (como imagen) y documentos largos (solo lo útil)
    step("a", "run", "Preparando…");
    var done = 0, total = 0, tasks = [];
    docs.forEach(function (d) {
      if (d.scanned) {
        var parts = [];
        for (var p = 1; p <= d.pages; p += 6) (function (from, to) {
          total++;
          parts.push(async function () {
            var imgs = await pageImages(d.file, from, to);
            var res = await sample(promptTranscribe(d.name, from, to), { signal: signal, images: imgs });
            step("a", "run", "Extrayendo datos… " + (++done) + " de " + total);
            return res.text;
          });
        })(p, Math.min(p + 5, d.pages));
        d.parts = parts;
      } else if (bytes(d.text) > 40000) {
        var chunks = [], cur = "";
        d.text.split("\n").forEach(function (l) { if (bytes(cur) + bytes(l) > 110000) { chunks.push(cur); cur = ""; } cur += l + "\n"; });
        if (cur) chunks.push(cur);
        d.parts = chunks.map(function (ch, ci) {
          total++;
          return async function () {
            var res = await sample(promptCondenseDanos(d.name, ch, ci + 1, chunks.length), { signal: signal });
            step("a", "run", "Extrayendo datos… " + (++done) + " de " + total);
            return /SIN PASAJES/.test(res.text) ? "" : res.text;
          };
        });
      }
      if (d.parts) d.parts.forEach(function (t) { tasks.push({ d: d, t: t }); });
    });
    if (tasks.length) {
      step("a", "run", "Extrayendo datos… 0 de " + total);
      var outs = await pool(tasks.map(function (x) { return x.t; }), 3);
      docs.forEach(function (d) { if (d.parts) { d.text = tasks.map(function (x, k) { return x.d === d ? outs[k] : null; }).filter(function (t) { return t != null; }).join("\n"); d.how = d.scanned ? "escaneado; texto leído de las imágenes por Claude" : "extracto de lo útil, copiado textualmente por Claude"; } });
      docs.filter(function (d) { return d.scanned; }).forEach(function (d) { confirm.push({ dato: "\"" + d.name + "\" venía escaneado y se leyó como imagen; revisa sus cifras", lamina: "Comparativo", como_resolver: "Compáralo contra el PDF." }); });
    }
    var src = docs.map(function (d, k) { return "=== " + d.label + " " + (k + 1) + ": " + d.name + (d.how ? " (" + d.how + ")" : "") + " ===\n" + d.text; }).join("\n\n");
    if (bytes(src) > room) {
      src = src.slice(0, Math.floor(room / 1.15));
      confirm.push({ dato: "Los documentos eran demasiado largos y se recortó el final del texto", lamina: "Comparativo", como_resolver: "Revisa que estén todas las aseguradoras y opciones; si falta alguna, sube menos páginas por archivo (sin condiciones generales)." });
    }
    step("a", "done", Math.round(bytes(src) / 1024) + " KB de datos de " + docs.length + " archivos");

    step("b", "run", "Esperando a Claude…");
    var P = await sample.json(promptDanos(src, fecha), { signal: signal, onText: function (o) { step("b", "run", "Escribiendo… " + o.text.length + " caracteres"); } });
    if (!P || typeof P !== "object" || !Array.isArray(P.coberturas)) throw { code: "invalid_json" };
    if (P.es_danos === false || P.es_danos === "false") throw new Error("Los documentos no parecen ser de un seguro de Daños.");
    P.fecha = fecha;
    var opcs = (P.primas || []).length;
    step("b", "done", (P.columnas || []).length + " aseguradoras en las tablas · " + opcs + " primas");

    step("build", "run", "Cargando el diseño de Single…");
    var tpl = await (await fetch("plantilla.json")).json();
    var zip = await JSZip.loadAsync(tpl.base64, { base64: true });
    var files = {}, names = Object.keys(zip.files).filter(function (n) { return /\.(xml|rels)$/.test(n); });
    for (i = 0; i < names.length; i++) files[names[i]] = await zip.file(names[i]).async("string");
    var deck = new VidaEngine.Deck(files);
    step("build", "run", "Armando las láminas…");
    var info = DanosEngine.build(deck, DanosEngine.fromPlan(P));
    Object.keys(deck.f).forEach(function (n) { zip.file(n, deck.f[n]); });
    Object.keys(zip.files).forEach(function (n) {
      if (/\.(xml|rels)$/.test(n) && !(n in deck.f)) zip.remove(n);
      else if (/^ppt\/media\//.test(n) && !info.usedMedia[n.split("/").pop()]) zip.remove(n);
    });
    var blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", compression: "DEFLATE" });
    var cli = String(P.cliente || "cliente").replace(/,?\s+S\.?\s?A\.?(\s?P\.?\s?I\.?)?(\s|$)[\s\S]*$/i, "").replace(/[^\wÁÉÍÓÚÑáéíóúñ]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
    var fname = ("Comparativo_Danos_" + cli + "_" + String(P.vigencia_corta || "").replace(/\s/g, "") + ".pptx").replace(/_\.pptx$/, ".pptx");
    step("build", "done", fname);
    var list = [].concat(missing, P.faltantes || []).map(function (m) { return ["Falta", m]; })
      .concat([].concat(confirm, P.confirmar || []).map(function (m) { return ["Confirmar", m]; }))
      .concat((P.documentos || []).map(function (d) { return ["Leído", { dato: d.archivo + ": " + [d.aseguradora, d.tipo === "poliza_actual" ? "póliza actual" : d.tipo === "cotizacion" ? "cotización" : d.tipo === "lista_companias" ? "lista de compañías" : d.tipo, (d.opciones || []).length ? "opciones " + d.opciones.join(", ") : ""].filter(Boolean).join(" · ") }]; }));
    state.result = { blob: blob, name: fname };
    showResult(list, info.laminas, downloads);
  }

  function showResult(all, borradas, downloads) {
    $("out").hidden = false; $("out-name").textContent = state.result.name;
    var ul = $("missing"); ul.textContent = "";
    var seen = {};
    all.forEach(function (it) {
      var m = it[1] || {}; var key = norm(m.dato); if (!m.dato || seen[key]) return; seen[key] = 1;
      var li = document.createElement("li"); var b = document.createElement("b"); b.textContent = it[0] + (m.lamina ? " · lámina " + m.lamina : "") + ": ";
      li.append(b, document.createTextNode(m.dato + (m.como_resolver ? ". " + m.como_resolver : "")));
      ul.append(li);
    });
    if (!ul.children.length) { var li = document.createElement("li"); li.textContent = "Todo lo de la plantilla se encontró en los documentos."; ul.append(li); }
    var sl = $("slidelist"); sl.textContent = "";
    if (typeof borradas === "number") { for (var q = 1; q <= borradas; q++) { var sq = document.createElement("span"); sq.textContent = q; sl.append(sq); } }
    else for (var n = 1; n <= 17; n++) { var sp = document.createElement("span"); sp.textContent = n; if (borradas.indexOf(n) >= 0) { sp.className = "off"; sp.title = "Se quitó: la póliza no tiene esa información"; } sl.append(sp); }
    $("dl").disabled = !downloads;
    $("dl").onclick = async function () {
      if (!downloads) return;
      try { await downloads.save({ filename: state.result.name, data: state.result.blob }); }
      catch (e) { if (e && e.code !== "declined") fail(e.code === "rate_limited" ? "Ya hay una descarga abierta; termínala e intenta de nuevo." : "No se pudo descargar el archivo en esta vista."); }
    };
    $("out").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("go").onclick = function () { if (!state.ctl) run().catch(function (e) { state.ctl = null; $("stop").hidden = true; renderCheck(); fail("Algo falló al iniciar: " + (e && (e.message || e.code) || "error desconocido") + ". Recarga la página e inténtalo de nuevo."); }); };
  $("stop").onclick = function () { if (state.ctl) state.ctl.abort(); };
  $("again").onclick = function () { state.tipo = null; Array.prototype.forEach.call(document.querySelectorAll('input[name="tipo"]'), function (r) { r.checked = false; }); SLOTS.concat(SLOTS_DANOS).forEach(function (s) { state.files[s.id] = []; }); state.result = null; $("out").hidden = true; $("prog").hidden = true; renderSlots(); renderCheck(); window.scrollTo({ top: 0, behavior: "smooth" }); };
  Array.prototype.forEach.call(document.querySelectorAll('input[name="tipo"]'), function (r) { r.addEventListener("change", function () { state.tipo = r.value; renderSlots(); renderCheck(); }); });
  renderSlots(); renderCheck();
  // Revisa al abrir si esta vista puede usar Claude (no pide permiso, solo pregunta si está disponible)
  (async function () {
    var msg = "Esta vista no puede usar Claude. Inicia sesión en claude.ai con tu cuenta y abre el enlace desde ahí (no en una ventana privada ni sin sesión).";
    if (!window.claude || !window.claude.use) { state.noClaude = msg; renderCheck(); return; }
    var s = await window.claude.use("sample").catch(function () { return null; });
    if (!s) { state.noClaude = msg; renderCheck(); }
  })();
})();
