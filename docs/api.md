# API de foro_chan

Contrato entre el backend (IA-A, aninayuwoki) y el frontend (IA-B, mobbu).
Archivo compartido: solo se cambia con aprobación de la otra IA. Todo cambio se avisa con un mensaje AVISO en `docs/ia/COORDINACION.md`.

Estado de implementación: la columna **Tarea** dice qué tarea del ACUERDO implementa cada endpoint. Hasta que esa tarea esté en `main`, el frontend usa los mocks de `public/mock/`.

## Convenciones

- Base: mismo origen que el frontend. Todas las rutas de API empiezan con `/api`.
- Las respuestas son JSON (`Content-Type: application/json`), excepto `/uploads/*`.
- Errores: status 4xx/5xx con cuerpo `{ "error": "mensaje legible en español" }`.
- Fechas: string ISO 8601 en UTC (`"2026-10-14T18:40:00.000Z"`).
- Sin cuentas ni cookies. El anonimato depende de `anonId` (ver abajo).

| Status | Cuándo |
|--------|--------|
| 400 | Datos inválidos: campo faltante, demasiado largo, JSON mal formado, imagen inválida |
| 401 | Falta `x-admin-token` o es incorrecto (o el servidor no tiene `ADMIN_TOKEN` configurado) |
| 403 | El tripcode está bloqueado por un admin |
| 404 | Tablero, hilo o post no existe |
| 413 | Imagen mayor a 4 MB |
| 429 | Rate limit excedido |
| 500 | Error interno |

## Tipos

```ts
type Board = {
  id: string;            // "qd" | "conf" | "casos" | "gen"  ("qd" = Querido Dross, el principal, siempre primero)
  name: string;
  description: string;
  threadCount: number;
};

type Image = {
  url: string;           // "/uploads/<id>.<ext>"
  thumbUrl: string;      // "/uploads/thumbs/<id>.webp" (lado mayor 250 px)
  width: number;
  height: number;
  size: number;          // bytes
  mime: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
};

type Post = {
  id: number;            // incremental global, compartido con los hilos (>>1234)
  threadId: number;
  anonId: string;        // 8 caracteres, estable dentro de un hilo
  name?: string;         // nombre opcional elegido por quien publica (escapado, ≤ 30)
  tripcode?: string;     // "!" + 10 caracteres, solo si escribió "nombre#clave"
  body: string;          // texto plano, HTML ya escapado por el backend
  createdAt: string;
  image?: Image;
  deleted?: true;        // si true: body === "" y no hay image
};

type Thread = {
  id: number;            // el id del hilo es el id de su post inicial (OP)
  board: string;
  title: string;
  anonId: string;
  name?: string;
  tripcode?: string;
  body: string;
  createdAt: string;
  bumpedAt: string;      // última respuesta; ordena el catálogo
  replyCount: number;
  image?: Image;
  status?: "abierto" | "en_revision" | "cerrado";  // solo tablero "casos"
  sources?: string[];    // URLs http(s) normalizadas (URL.href), sin duplicados; mínimo 1 en "casos".
                         // NO vienen escapadas como HTML: ponerlas con setAttribute('href', url) o equivalente.
  statusHistory?: { status: "abierto" | "en_revision" | "cerrado"; at: string }[];
                         // solo "casos", orden cronológico; el primero es "abierto" con at = createdAt
};

// Solo en hilos del tablero "qd" (creados por el sistema, uno por video):
//   system: true
//   video: { id: string; url: string; publishedAt?: string; thumbUrl?: string }
//   video.url NO viene escapada (va en href). thumbUrl es local: /uploads/yt/<id>.jpg
//   video.hearted?: { text: string; likes: number; at?: string }[]
//       comentarios de YouTube con corazón de Dross, de más a menos likes. text escapado como body.
//       Sin autor (no se guarda quién comentó). at es aproximada ("hace 1 mes" en YouTube).
//       Sin el campo = todavía no se revisó; [] = revisado, sin corazones.
//   video.heartedAt?: string   (última revisión)

type ThreadSummary = Thread;  // igual, pero body recortado a 300 caracteres

type Report = {
  id: number;
  postId: number;
  threadId: number;      // hilo del post reportado (para que el panel admin pueda abrirlo)
  reason: string;        // HTML escapado, igual que body
  createdAt: string;
};
```

### Texto
- `body` llega con HTML escapado (`<` → `&lt;`, etc.). El frontend puede insertarlo como HTML después de aplicar su formato.
- El frontend interpreta:
  - `>>1234`: cita a un post. Si el post tiene `deleted: true`, se pinta como borrado.
  - Línea que empieza con `>` (y no con `>>`): greentext. Ojo: llega escapada como `&gt;`.
- Saltos de línea: `\n`.

### name y tripcode (identidad sin cuentas)
- Al crear un hilo o una respuesta, el campo opcional `name` acepta `"nombre"`, `"nombre#clave"` o `"#clave"`.
- La respuesta trae `name` (la parte antes de `#`) y `tripcode` = `"!"` + `base64url(HMAC-SHA256(TRIP_SECRET, clave)).slice(0, 10)`. La misma clave siempre da el mismo tripcode; la clave nunca se guarda.
- Sin `name` (o vacío), el post no trae `name` ni `tripcode`; el frontend muestra "Anónimo".
- `name` pasa por el filtro anti-doxxing. Si el tripcode está bloqueado, la API responde `403` `"Esta firma está bloqueada"`.

### anonId
`anonId` = hash(IP + id del hilo + sal secreta), 8 caracteres. Es el mismo para una persona dentro de un hilo y distinto entre hilos. La IP nunca se guarda en claro.

## Anti-doxxing
Al crear un hilo o una respuesta, si `title` o `body` parecen tener un **email** o un **teléfono** (9 o más dígitos, sin contar fechas, horas ni links), la API responde `400` con `"Tu mensaje parece incluir un teléfono. No publiques datos personales de nadie."` (o `email`). El frontend debe mostrar ese `error` junto al formulario.

## Límites

| Campo | Límite |
|-------|--------|
| `title` | 1–100 caracteres, obligatorio al crear hilo |
| `body` | ≤ 4000 caracteres. Obligatorio en hilo. En respuesta: `body` o `image` |
| `reason` | 1–500 caracteres |
| `sources` | ≤ 10 URLs http(s). Mínimo 1 en el tablero `casos` |
| `image` | jpg, png, gif, webp; ≤ 4 MB; validada por magic bytes |
| Rate limit | por IP: 1 hilo cada 60 s, 1 respuesta cada 15 s, 1 reporte cada 10 s |

Al guardar una imagen, el backend borra EXIF/GPS y no guarda el nombre original.

## Endpoints

| Método | Ruta | Tarea |
|--------|------|-------|
| GET | `/api/health` | B1 |
| GET | `/api/boards` | B3 |
| GET | `/api/boards/:board/threads?page=1` | B3 |
| POST | `/api/boards/:board/threads` | B3 (+B6 casos, +B7 imagen) |
| GET | `/api/threads/:id` | B3 |
| POST | `/api/threads/:id/replies` | B3 (+B7 imagen) |
| POST | `/api/posts/:id/report` | B5 |
| PATCH | `/api/threads/:id/status` | B6 |
| GET | `/api/admin/reports` | B5 |
| DELETE | `/api/admin/posts/:id` | B5 |
| POST / DELETE | `/api/admin/tripcodes/:trip/ban` | B8 |
| PATCH | `/api/admin/threads/:id/status` (alias para la cookie) | B9 |
| POST | `/api/admin/login` | B9 |
| POST | `/api/admin/logout` | B9 |
| GET | `/uploads/<archivo>` | B1 (archivos desde B7) |

### GET /api/health
`200` → `{ "ok": true }`

### GET /api/boards
`200` → `Board[]`

```json
[
  { "id": "conf",  "name": "Confesiones", "description": "Lo que nunca dijiste.", "threadCount": 12 },
  { "id": "casos", "name": "Casos",       "description": "Seguimiento con fuentes.", "threadCount": 3 },
  { "id": "gen",   "name": "General",     "description": "Todo lo demás.", "threadCount": 40 }
]
```

### GET /api/boards/:board/threads?page=1
Catálogo ordenado por `bumpedAt` descendente. 20 hilos por página. `page` empieza en 1; si falta o no es un número válido se usa 1. Una página mayor que `totalPages` devuelve `threads: []`.

`200` → `{ "threads": ThreadSummary[], "page": 1, "totalPages": 3 }`
`404` si el tablero no existe.

### POST /api/boards/:board/threads
Crea un hilo. Dos formatos:

**JSON** (sin imagen):
```json
{ "title": "Título", "body": "Texto", "sources": ["https://..."], "name": "mobbu#clave" }
```

**multipart/form-data** (con imagen):
| Campo | Tipo |
|-------|------|
| `title` | texto |
| `body` | texto |
| `sources` | texto con JSON de un array, ej. `["https://a.com","https://b.com"]` |
| `name` | texto, opcional (`"nombre#clave"`) |
| `image` | archivo (opcional) |

En el tablero `qd` no se pueden crear hilos: `403` `"En Querido Dross los hilos los crea el sistema: uno por video"`. Sí se puede responder.

En el tablero `casos`, `sources` es obligatorio (mínimo 1) y el hilo nace con `status: "abierto"` y `statusHistory: [{ "status": "abierto", "at": createdAt }]`.

`201` → `Thread`
`400`, `404`, `413`, `429` según el caso.

### GET /api/threads/:id
`200` → `{ "thread": Thread, "replies": Post[] }` (respuestas en orden cronológico; incluye las borradas con `deleted: true`)
`404` si no existe o si el OP fue borrado.

### POST /api/threads/:id/replies
**JSON:** `{ "body": "Texto", "name": "mobbu#clave" }` (`name` opcional)
**multipart:** campos `body` (texto), `name` (opcional) e `image` (archivo). Al menos `body` o `image`.

`201` → `Post`. Hace bump del hilo.
`400`, `404`, `413`, `429` según el caso.

### POST /api/posts/:id/report
`{ "reason": "Doxxing: publica el teléfono de alguien" }`

`200` → `{ "ok": true }`. Sirve para hilos (id del OP) y respuestas.
`400`, `404` (también si la respuesta ya fue borrada), `429`.

### PATCH /api/threads/:id/status (admin)
Header `x-admin-token: <token>`. Body `{ "status": "en_revision" }`.
Solo hilos del tablero `casos`. Cambia `status` y agrega `{ status, at }` al final de `statusHistory`.

`200` → `Thread`
`400` (status inválido, el hilo no es de `casos` o ya estaba en ese estado), `401`, `404`.

### GET /api/admin/reports (admin)
Header `x-admin-token`. `200` → `Report[]`, el más nuevo primero. `401` sin token válido.

### DELETE /api/admin/posts/:id (admin)
Header `x-admin-token`.
- Si es una respuesta: queda con `deleted: true`, `body: ""` y sin `image`.
- Si es el OP: se borra el hilo entero con sus respuestas.
- Se borran también los reportes de lo que se borró.
- En ambos casos se borran del disco las imágenes y miniaturas.

`200` → `{ "ok": true }`. `401`, `404`.

### GET /uploads/&lt;archivo&gt;
Archivos estáticos de `data/uploads/`. Usa `image.url` e `image.thumbUrl` tal como vienen; no armes la ruta a mano.

### POST /api/admin/tripcodes/:trip/ban (admin)
Bloquea un tripcode: publicar con esa firma da `403`. `:trip` con o sin `!` (si lleva `!`, va codificado como `%21`).
`200` → `{ "ok": true }`. `400` (formato inválido), `401`.

### DELETE /api/admin/tripcodes/:trip/ban (admin)
Desbloquea. `200` → `{ "ok": true }`.

### Autenticación del admin
Las rutas de admin aceptan **una** de estas dos formas:
- Cookie de sesión `dd_admin` (la crea `/api/admin/login`). Es la que usa el frontend: el navegador la manda sola en las rutas `/api/admin/*`, porque es `HttpOnly`, `SameSite=Strict` y `Path=/api/admin`. Como la cookie solo viaja a `/api/admin/*`, el cambio de estado de un caso también existe como **`PATCH /api/admin/threads/:id/status`** (igual que `PATCH /api/threads/:id/status`). El panel admin debe usar la ruta `/api/admin/...`.
- Cabecera `x-admin-token: <ADMIN_TOKEN>` (tests y consola).

### POST /api/admin/login
`{ "password": "<ADMIN_TOKEN>" }` → `200 { "ok": true }` + cookie `dd_admin` (12 h). `401` si la contraseña no coincide. `429` si se repite antes de 3 s (frena la fuerza bruta).

### POST /api/admin/logout
Borra la sesión y la cookie. `200 { "ok": true }`.
