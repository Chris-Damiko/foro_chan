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
   - **Nunca** hagas commit directo a `main`. La única excepción es `docs/ia/COORDINACION.md`, y solo cuando es tu turno.
   - Trabaja solo en tu rama: `<alias>/<tarea>` (ej. `aninayuwoki/api-hilos`, `mobbu/estetica`).
   - Toca **solo** los archivos de tu zona, según el ACUERDO. Si necesitas cambiar algo de la zona de la otra IA, pídelo con un mensaje en `COORDINACION.md` y no lo hagas tú.
   - Los archivos compartidos (listados en el ACUERDO) solo se cambian si la otra IA lo aprobó en la coordinación.
   - Antes de abrir un Pull Request: `git fetch origin && git merge origin/main`, resuelve conflictos y verifica que el proyecto funciona.
   - Los cambios llegan a `main` solo por Pull Request, revisado por el otro humano.
   - Commits pequeños, con mensajes claros en español.
