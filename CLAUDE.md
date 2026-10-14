# foro_chan

Imageboard estilo chan, 100% anónimo, para confesiones y discusión sobre Dross. Permite abrir hilos, responder y seguir "casos" (hilos con estado y fuentes). Estética perturbadora: creepypasta, VHS, glitch, scanlines.

## Tecnologías
- Backend: Node.js + Express (`server.js`)
- Persistencia: archivos JSON en `data/` (sin base de datos, sin cuentas de usuario)
- Frontend: HTML + CSS + JavaScript vanilla servido como estático desde `public/`

## Estructura
- `server.js`: punto de entrada; monta la API y sirve `public/`.
- `src/`: lógica del backend (rutas, almacenamiento JSON, moderación, rate limit).
- `data/`: archivos JSON con hilos, respuestas y reportes. **No se sube a git** (solo `data/.gitkeep`).
- `public/`: frontend completo (HTML, CSS, JS, fuentes, imágenes, sonidos).
- `public/mock/`: respuestas falsas de la API para desarrollar el frontend sin backend.
- `docs/api.md`: contrato de la API entre backend y frontend.
- `docs/ia/`: coordinación entre IAs.

## Comandos
- Instalar: `npm install`
- Ejecutar: `node server.js` (o `npm start`) → http://localhost:3000
- Desarrollo: `npm run dev` (node --watch)
- Tests: `npm test`

## Reglas de contenido (aplican al código de moderación y a la UI)
- Prohibido publicar datos personales de víctimas o de cualquier persona privada (doxxing).
- Los hilos del tablero **Casos** deben incluir al menos un link de fuente.
- Todo post se puede reportar; un admin puede borrarlo.
- Sin cuentas: el anonimato se mantiene con un ID por hilo derivado de hash(IP + hilo + sal). Nunca se guarda la IP en claro.

## Colaboración entre IAs (OBLIGATORIO)

Este proyecto lo desarrollan dos personas, cada una con su propio Claude Code.
Al iniciar **cualquier** sesión de trabajo:

1. `git checkout main && git pull`
2. Lee `docs/ia/COORDINACION.md` completo, sobre todo la sección **ACUERDO** y los mensajes recientes.
3. Averigua quién eres (IA-A o IA-B) preguntándole a tu humano si no lo sabes. IA-A = aninayuwoki, IA-B = mobbu.
4. Respeta estas reglas:
   - **Nunca** hagas commit directo a `main`. La única excepción es `docs/ia/COORDINACION.md` (ver su PROTOCOLO).
   - Trabaja solo en tu rama: `<alias>/<tarea>` (ej. `aninayuwoki/api-hilos`, `mobbu/estetica`).
   - Toca **solo** los archivos de tu zona, según el ACUERDO. Si necesitas cambiar algo de la zona de la otra IA, pídelo con un mensaje en `COORDINACION.md` y no lo hagas tú.
   - Commits pequeños, con mensajes claros en español.
   - Haz push de tu rama cada vez que termines una pieza (máximo cada ~30 min de trabajo), aunque la tarea no esté terminada.

## Flujo rápido (aprobado por ambos humanos el 2026-10-14)

**Regla 1. Auto-merge en tu zona.** Un PR que toca **solo archivos de tu zona** lo fusiona su propia IA, sin esperar revisión humana:
```bash
git fetch origin && git merge origin/main
npm test                                  # tiene que pasar
git push
gh pr create --fill --base main
gh pr merge --squash --delete-branch
```
La revisión del otro es posterior y opcional; si ve un problema, lo pide con SOLICITUD_CAMBIO.

**Regla 2. Archivos compartidos.** Un PR que toca `package.json`, `package-lock.json`, `.gitignore`, `README.md`, `CLAUDE.md` o `docs/api.md` necesita un mensaje **ACEPTO** de la otra IA en la coordinación; con eso el autor fusiona solo. Basta un AVISO (sin ACEPTO) para:
- agregar una dependencia nueva sin quitar ni cambiar versiones de otras;
- corregir redacción en `README.md` o `docs/api.md` sin cambiar el contrato.

Cambiar el contrato de la API (campos, rutas, status, límites) siempre necesita ACEPTO.

**Regla 7. `main` siempre funciona.** Nadie fusiona con `npm test` fallando. Si `main` se rompe, quien lo rompió lo arregla primero o hace `git revert` del merge, y avisa con AVISO.

Las reglas 3 a 6 (coordinación, turnos, auto-pull y lectura del trabajo del otro) están en el PROTOCOLO de `docs/ia/COORDINACION.md`.
