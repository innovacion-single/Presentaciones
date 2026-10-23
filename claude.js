// Función del servidor: recibe el texto de la página, lo manda a Claude con la clave
// de API del equipo (que vive solo en Vercel) y regresa la respuesta poco a poco.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  const clave = req.headers["x-clave-equipo"] || "";
  if (!process.env.CLAVE_EQUIPO || clave !== process.env.CLAVE_EQUIPO) return res.status(401).json({ code: "bad_key" });
  const { prompt, json } = req.body || {};
  if (!prompt || typeof prompt !== "string") return res.status(400).json({ code: "no_prompt" });
  if (Buffer.byteLength(prompt) > 262144) return res.status(413).json({ code: "prompt_too_large" });

  const system = "Eres un asistente de Single Broker que arma presentaciones para clientes. Usa solo la información de los documentos; nunca inventes datos." +
    (json ? " Responde únicamente con un objeto JSON válido, sin texto antes ni después y sin bloques de código." : "");

  const up = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5-5",
      max_tokens: Number(process.env.MAX_TOKENS || 32000),
      stream: true,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!up.ok) {
    const t = await up.text();
    const code = up.status === 429 || up.status === 529 ? "rate_limited" : up.status === 413 ? "prompt_too_large" : "upstream_error";
    return res.status(up.status === 429 ? 429 : 502).json({ code, detail: t.slice(0, 500) });
  }

  res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
  const reader = up.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      try {
        const ev = JSON.parse(line.slice(5));
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") res.write(ev.delta.text);
        if (ev.type === "error") res.write("\n[[ERROR:" + (ev.error && ev.error.type) + "]]");
      } catch (e) { /* línea incompleta */ }
    }
  }
  res.end();
}
