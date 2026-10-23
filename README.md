# Presentaciones Single (Vercel)

Página para que los colaboradores suban los documentos de la póliza y descarguen la presentación de PowerPoint con el diseño de Single.
No necesitan cuenta de Claude: la página usa la clave de API de Single, guardada solo en Vercel, y pide una **clave del equipo** para que nadie de fuera la use.

## Qué hay aquí

| Archivo | Para qué sirve |
|---|---|
| `public/index.html` | La página (la misma del artifact). |
| `public/claude-shim.js` | Conecta la página con `/api/claude` en lugar de la cuenta de claude.ai. |
| `public/plantilla.json`, `public/logos.json` | Plantilla BPE y logos de las aseguradoras. |
| `api/claude.js` | Función del servidor: revisa la clave del equipo y llama a Claude con la clave de API. |
| `vercel.json` | Le da a la función hasta 5 minutos por consulta. |

## Variables de entorno (Vercel → Settings → Environment Variables)

| Nombre | Valor |
|---|---|
| `ANTHROPIC_API_KEY` | Clave de API de console.anthropic.com (empieza con `sk-ant-`). |
| `CLAVE_EQUIPO` | La contraseña que les darás a los colaboradores. |
| `CLAUDE_MODEL` | Opcional. Por defecto `claude-sonnet-5-5`. |

Después de agregar o cambiar una variable, haz **Redeploy**.
