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
| 401 | Falta `x-admin-token` o es incorrecto |
| 404 | Tablero, hilo o post no existe |
| 413 | Imagen mayor a 4 MB |
| 429 | Rate limit excedido |
| 500 | Error interno |

## Tipos

```ts
type Board = {
  id: string;            // "conf" | "casos" | "gen"
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
  body: string;
  createdAt: string;
  bumpedAt: string;      // última respuesta; ordena el catálogo
  replyCount: number;
  image?: Image;
  status?: "abierto" | "en_revision" | "cerrado";  // solo tablero "casos"
  sources?: string[];    // URLs http(s); mínimo 1 en "casos"
};

type ThreadSummary = Thread;  // igual, pero body recortado a 300 caracteres

type Report = {
  id: number;
  postId: number;
  reason: string;
  createdAt: string;
};
```

### Texto
- `body` llega con HTML escapado (`<` → `&lt;`, etc.). El frontend puede insertarlo como HTML después de aplicar su formato.
- El frontend interpreta:
  - `>>1234`: cita a un post. Si el post tiene `deleted: true`, se pinta como borrado.
  - Línea que empieza con `>` (y no con `>>`): greentext. Ojo: llega escapada como `&gt;`.
- Saltos de línea: `\n`.

### anonId
`anonId` = hash(IP + id del hilo + sal secreta), 8 caracteres. Es el mismo para una persona dentro de un hilo y distinto entre hilos. La IP nunca se guarda en claro.

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
Catálogo ordenado por `bumpedAt` descendente. 20 hilos por página. `page` empieza en 1.

`200` → `{ "threads": ThreadSummary[], "page": 1, "totalPages": 3 }`
`404` si el tablero no existe.

### POST /api/boards/:board/threads
Crea un hilo. Dos formatos:

**JSON** (sin imagen):
```json
{ "title": "Título", "body": "Texto", "sources": ["https://..."] }
```

**multipart/form-data** (con imagen):
| Campo | Tipo |
|-------|------|
| `title` | texto |
| `body` | texto |
| `sources` | texto con JSON de un array, ej. `["https://a.com","https://b.com"]` |
| `image` | archivo (opcional) |

En el tablero `casos`, `sources` es obligatorio (mínimo 1) y el hilo nace con `status: "abierto"`.

`201` → `Thread`
`400`, `404`, `413`, `429` según el caso.

### GET /api/threads/:id
`200` → `{ "thread": Thread, "replies": Post[] }` (respuestas en orden cronológico; incluye las borradas con `deleted: true`)
`404` si no existe o si el OP fue borrado.

### POST /api/threads/:id/replies
**JSON:** `{ "body": "Texto" }`
**multipart:** campos `body` (texto) e `image` (archivo). Al menos uno de los dos.

`201` → `Post`. Hace bump del hilo.
`400`, `404`, `413`, `429` según el caso.

### POST /api/posts/:id/report
`{ "reason": "Doxxing: publica el teléfono de alguien" }`

`200` → `{ "ok": true }`. Sirve para hilos (id del OP) y respuestas.
`400`, `404`, `429`.

### PATCH /api/threads/:id/status (admin)
Header `x-admin-token: <token>`. Body `{ "status": "en_revision" }`.
Solo hilos del tablero `casos`.

`200` → `Thread`
`400` (status inválido o el hilo no es de `casos`), `401`, `404`.

### GET /api/admin/reports (admin)
Header `x-admin-token`. `200` → `Report[]`, el más nuevo primero. `401` sin token válido.

### DELETE /api/admin/posts/:id (admin)
Header `x-admin-token`.
- Si es una respuesta: queda con `deleted: true`, `body: ""` y sin `image`.
- Si es el OP: se borra el hilo entero con sus respuestas.
- En ambos casos se borran del disco las imágenes y miniaturas.

`200` → `{ "ok": true }`. `401`, `404`.

### GET /uploads/&lt;archivo&gt;
Archivos estáticos de `data/uploads/`. Usa `image.url` e `image.thumbUrl` tal como vienen; no armes la ruta a mano.
