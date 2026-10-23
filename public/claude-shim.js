/* Reemplaza window.claude (que solo existe dentro de claude.ai) por llamadas a /api/claude,
   que usa la clave de API del equipo guardada en Vercel. */
(function () {
  var KEY = "single_clave_equipo";
  function getClave(force) {
    var c = null;
    try { c = force ? null : localStorage.getItem(KEY); } catch (e) {}
    if (!c) {
      c = window.prompt("Escribe la clave del equipo para usar la herramienta:") || "";
      try { localStorage.setItem(KEY, c); } catch (e) {}
    }
    return c;
  }
  async function call(prompt, opts, json) {
    opts = opts || {};
    var r;
    for (var intento = 0; intento < 2; intento++) {
      try {
        r = await fetch("/api/claude", {
          method: "POST",
          headers: { "content-type": "application/json", "x-clave-equipo": getClave(intento > 0) },
          body: JSON.stringify({ prompt: prompt, json: !!json }),
          signal: opts.signal
        });
      } catch (e) {
        if (e && e.name === "AbortError") throw { code: "cancelled" };
        throw { code: "upstream_error", message: e && e.message };
      }
      if (r.status !== 401) break;
    }
    if (r.status === 401) throw { code: "bad_key", message: "La clave del equipo no es correcta." };
    if (!r.ok) { var j = await r.json().catch(function () { return {}; }); throw { code: j.code || "upstream_error", message: j.detail }; }
    var reader = r.body.getReader(), dec = new TextDecoder(), text = "";
    try {
      for (;;) {
        var x = await reader.read();
        if (x.done) break;
        text += dec.decode(x.value, { stream: true });
        if (opts.onText) opts.onText({ text: text });
      }
    } catch (e) {
      if (e && e.name === "AbortError") throw { code: "cancelled" };
      throw { code: "upstream_error", message: e && e.message };
    }
    if (/\[\[ERROR:/.test(text)) throw { code: /overloaded|rate/.test(text) ? "rate_limited" : "upstream_error" };
    return { text: text };
  }
  function parseJson(t) {
    t = String(t || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try { return JSON.parse(t); } catch (e) {}
    var a = t.indexOf("{"), b = t.lastIndexOf("}");
    if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
    throw { code: "invalid_json" };
  }
  var sample = function (prompt, opts) { return call(prompt, opts, false); };
  sample.json = async function (prompt, opts) { var r = await call(prompt, opts, true); return parseJson(r.text); };
  sample.limits = async function () { return { maxPromptBytes: 262144 }; };
  var downloads = {
    save: async function (o) {
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename || "presentacion.pptx";
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    }
  };
  window.claude = { use: async function (n) { return n === "sample" ? sample : n === "downloads" ? downloads : null; } };
})();
