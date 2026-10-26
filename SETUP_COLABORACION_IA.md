# Instrucciones para Claude: configurar un repo para trabajar en equipo con otra IA

> **Para la IA que lee esto:** tu humano te dio este archivo para que configures su repositorio y otro desarrollador, con su propio Claude Code, pueda colaborar sin que choquen. Sigue los pasos **en orden**. Cuando un paso diga **PREGUNTA**, detente y pregúntale a tu humano. No inventes la respuesta.

En este documento:
- **IA-A** eres tú, la IA del dueño del repo, que hace la configuración.
- **IA-B** es la IA del amigo o colaborador.
- **Humano A** y **Humano B** son sus dueños.

---

## 0. Cómo funciona el sistema (léelo antes de empezar)

1. Todo el código vive en **GitHub**. Cada humano tiene su propio clon y nadie usa carpetas sincronizadas.
2. Cada IA trabaja **solo en su propia rama** y **solo en los archivos de su zona**. Las zonas se acuerdan antes de programar.
3. Las dos IAs se comunican **por turnos** escribiendo en `docs/ia/COORDINACION.md`, que está en el repo. Funciona como un chat por correo: escribes tu mensaje, pasas el turno, haces push y esperas.
4. Las IAs **no se despiertan solas**. Cada humano le dice a su IA: *"revisa la coordinación"*. La IA hace `git pull`, lee el archivo y responde solo si es su turno.
5. Primero **negocian** cómo dividir el trabajo. Cuando hay acuerdo y los dos humanos lo aprueban, empiezan a programar.

---

## 1. Verificar el repositorio

Ejecuta y revisa:

```bash
git status
git remote -v
git branch -a
```

- Si no es un repo de git, o si no tiene un remote de GitHub, **detente** y dile a tu humano que primero cree el repo en GitHub y lo conecte con `git remote add origin <url>`.
- Identifica la rama principal (`main` o `master`). Aquí la llamamos `main`; usa la que corresponda.
- Ejecuta `git checkout main && git pull` para partir de lo más reciente.

## 2. Preguntar a tu humano (PREGUNTA)

Haz estas preguntas en un solo mensaje y espera las respuestas:

1. ¿Cuál es el nombre del proyecto y qué debe hacer, en 2 o 3 frases?
2. ¿Qué tecnologías usa o quieres usar (lenguaje, framework, base de datos)?
3. ¿Cuál es tu nombre o alias y el de tu amigo? ¿Cuál es el usuario de GitHub de tu amigo?
4. **Tus condiciones**, que le explicaré a la otra IA:
   - ¿Cuántas horas por semana puedes dedicarle?
   - ¿En qué eres bueno o qué prefieres hacer (frontend, backend, diseño, base de datos…)?
   - ¿Hay algo que no quieras hacer o que no sepas hacer?
   - ¿Tienes alguna fecha límite?
5. ¿Hay alguna parte del proyecto que ya quieras reservar para ti o para tu amigo?

## 3. Analizar el proyecto

Lee la estructura del repo: carpetas, archivos principales, `package.json`, `requirements.txt` o equivalentes, y el README. Haz un resumen corto:
- qué existe ya,
- qué falta,
- qué **zonas** naturales tiene el proyecto. Una zona es un conjunto de carpetas o archivos que una sola persona puede tocar sin pisar a la otra; por ejemplo `src/frontend/`, `src/api/` o `db/`.

Si el repo está vacío, propón una estructura de carpetas que separe bien las zonas.

## 4. Crear o actualizar `CLAUDE.md` (reglas compartidas)

Claude Code lee `CLAUDE.md` automáticamente. Si ya existe, **no lo borres**: agrega la sección de colaboración al final. Si no existe, créalo con esta plantilla y completa lo que está entre `<...>`:

~~~~markdown
# <Nombre del proyecto>

<Descripción de 2 o 3 frases>

## Tecnologías
- <lenguaje / framework / BD>

## Estructura
- `<carpeta>/`: <para qué sirve>

## Comandos
- Instalar: `<comando>`
- Ejecutar: `<comando>`
- Tests: `<comando>`

## Colaboración entre IAs (OBLIGATORIO)

Este proyecto lo desarrollan dos personas, cada una con su propio Claude Code.
Al iniciar **cualquier** sesión de trabajo:

1. `git checkout main && git pull`
2. Lee `docs/ia/COORDINACION.md` completo, sobre todo la sección **ACUERDO** y los mensajes recientes.
3. Averigua quién eres (IA-A o IA-B) preguntándole a tu humano si no lo sabes.
4. Respeta estas reglas:
   - **Nunca** hagas commit directo a `main`. La única excepción es `docs/ia/COORDINACION.md`, y solo cuando es tu turno.
   - Trabaja solo en tu rama: `<alias>/<tarea>` (ej. `christhian/login`).
   - Toca **solo** los archivos de tu zona, según el ACUERDO. Si necesitas cambiar algo de la zona de la otra IA, pídelo con un mensaje en `COORDINACION.md` y no lo hagas tú.
   - Los archivos compartidos (listados en el ACUERDO) solo se cambian si la otra IA lo aprobó en la coordinación.
   - Antes de abrir un Pull Request: `git fetch origin && git merge origin/main`, resuelve conflictos y verifica que el proyecto funciona.
   - Los cambios llegan a `main` solo por Pull Request, revisado por el otro humano.
   - Commits pequeños, con mensajes claros en español.
~~~~

## 5. Crear `docs/ia/COORDINACION.md` (el canal de comunicación)

Crea el archivo con esta plantilla exacta:

~~~~markdown
# Coordinación entre IAs

> Archivo de comunicación por turnos entre IA-A (<Humano A>) e IA-B (<Humano B>).
> **Lee el protocolo antes de escribir.**

## ESTADO

```
TURNO: IA-A
FASE: CONFIGURACION
RONDA: 0
ULTIMA_ACTUALIZACION: <fecha y hora>
```

- `TURNO`: quién puede escribir ahora (`IA-A`, `IA-B` o `HUMANOS` cuando se necesita una decisión humana).
- `FASE`: `CONFIGURACION` → `PRESENTACION` → `NEGOCIACION` → `ACUERDO_PENDIENTE` → `TRABAJANDO`.
- `RONDA`: cuántas propuestas y contrapropuestas van en la negociación.

## PROTOCOLO

1. **Siempre** haz `git checkout main && git pull` antes de leer este archivo.
2. Si `TURNO` no es tuyo, **no edites nada**. Dile a tu humano: "No es mi turno; esperando a <la otra IA>".
3. Si es tu turno:
   - Lee todos los mensajes nuevos de la otra IA.
   - Agrega **tu** mensaje al final de la sección MENSAJES con el formato de abajo.
   - **Nunca** edites ni borres mensajes de la otra IA.
   - Cambia `TURNO` a la otra IA (o a `HUMANOS` si hace falta que decidan ellos), actualiza `FASE`, `RONDA` y `ULTIMA_ACTUALIZACION`.
   - Commit y push **solo de este archivo**:
     ```bash
     git add docs/ia/COORDINACION.md
     git commit -m "coordinacion: mensaje de IA-X (ronda N)"
     git pull --rebase origin main
     git push origin main
     ```
   - Dile a tu humano que avise al otro humano: "ya respondí, le toca a tu IA".
4. Antes de aceptar o proponer algo que afecte a tu humano (horas, tareas, fechas), **pregúntale a tu humano**.
5. Si después de **3 rondas** de negociación no hay acuerdo, pon `TURNO: HUMANOS` y resume los puntos en desacuerdo para que ellos decidan.

### Formato de mensaje

```
### [IA-X] Ronda N · <fecha y hora> · <tipo>
**Tipo:** PRESENTACION | PROPUESTA | CONTRAPROPUESTA | ACEPTO | PREGUNTA | AVISO | SOLICITUD_CAMBIO | ESTADO

<contenido>

**Necesito de ti:** <qué esperas que responda la otra IA>
```

## ACUERDO

> Se llena cuando ambas IAs aceptaron y **ambos humanos** confirmaron. Hasta entonces dice "Sin acuerdo todavía".

Sin acuerdo todavía.

<!-- Plantilla del acuerdo:
### Zonas
| Zona | Dueño | Carpetas / archivos |
|------|-------|---------------------|

### Archivos compartidos (cambiar solo con aprobación de la otra IA)
- ...

### Tareas
| # | Tarea | Dueño | Rama | Depende de | Estado |
|---|-------|-------|------|------------|--------|

### Contratos / interfaces entre zonas
(ej.: endpoints de la API, formato de datos, nombres de funciones que una zona usa de la otra)

### Aprobaciones
- [ ] Humano A aprueba
- [ ] Humano B aprueba
-->

## MENSAJES

<!-- Los mensajes van aquí abajo, el más nuevo al final -->
~~~~

## 6. Generar el archivo para la otra IA: `docs/ia/INSTRUCCIONES_IA_B.md`

Este es el **archivo final** que el Humano B le pasa a su Claude. Créalo con esta plantilla y completa los datos reales: nombres, URL del repo, rama principal y comandos.

~~~~markdown
# Instrucciones para la IA de <Humano B> (IA-B)

> **Para la IA que lee esto:** tu humano, <Humano B>, va a colaborar en el proyecto **<nombre>** con <Humano A>, que también usa Claude Code (IA-A). Ya está todo configurado. Tu trabajo es unirte, presentarte y negociar con IA-A cómo dividir el trabajo, comunicándote por turnos en un archivo del repo.

## Datos del proyecto
- Repositorio: <URL de GitHub>
- Rama principal: `main`
- Tú eres: **IA-B**. Tu humano es **<Humano B>**.
- La otra IA es: **IA-A**. Su humano es **<Humano A>**.

## Paso 1: Obtener el repo
Si tu humano todavía no tiene el repo:
```bash
git clone <URL>
cd <carpeta>
```
Si GitHub rechaza el acceso, tu humano debe aceptar la invitación de colaborador en su correo o en github.com/notifications.

Después:
```bash
git checkout main && git pull
```

## Paso 2: Leer las reglas
Lee completos, en este orden:
1. `CLAUDE.md`: reglas del proyecto y de colaboración.
2. `docs/ia/COORDINACION.md`: el protocolo de turnos y los mensajes de IA-A.

Cumple el PROTOCOLO de `COORDINACION.md` al pie de la letra.

## Paso 3: Preguntar a tu humano
Antes de escribir nada, pregúntale a <Humano B>, en un solo mensaje:
1. ¿Cuántas horas por semana puedes dedicarle al proyecto?
2. ¿En qué eres bueno o qué prefieres hacer?
3. ¿Hay algo que no quieras o no sepas hacer?
4. ¿Tienes alguna fecha límite o semanas en las que no puedas trabajar?
5. Leí la propuesta de IA-A: <resúmela>. ¿Qué opinas? ¿Algo que cambiar?

## Paso 4: Responder en la coordinación
Si `TURNO: IA-B`, escribe un mensaje tipo **PRESENTACION** con las condiciones de tu humano. Además, **ACEPTA** la propuesta de IA-A o haz una **CONTRAPROPUESTA** concreta (tabla de zonas y tareas). Pasa el turno a IA-A, haz commit y push como dice el protocolo.

Si no es tu turno, dile a tu humano que espere a que IA-A responda.

## Paso 5: Seguir el ciclo
Cada vez que tu humano te diga *"revisa la coordinación"*: `git pull`, lee los mensajes nuevos y, si es tu turno, responde.
Cuando haya acuerdo y ambos humanos lo aprueben (`FASE: TRABAJANDO`), crea tu rama `<alias-B>/<tarea>` y trabaja solo en tu zona.
~~~~

## 7. Commit y push de la configuración

Estos tres archivos de configuración son la **única** vez que se permite subir directo a `main`:

```bash
git add CLAUDE.md docs/ia/COORDINACION.md docs/ia/INSTRUCCIONES_IA_B.md
git commit -m "Configurar colaboración entre IAs (CLAUDE.md y coordinación)"
git push origin main
```

Si el push falla por permisos o porque `main` está protegida, crea la rama `setup/colaboracion-ia`, súbela y pídele a tu humano que la fusione con un Pull Request.

## 8. Escribir tu primer mensaje (PRESENTACION + PROPUESTA)

En `docs/ia/COORDINACION.md`:

1. Agrega un mensaje `[IA-A] Ronda 1` de tipo **PRESENTACION** que incluya:
   - Resumen del proyecto: qué es, qué existe y qué falta (del paso 3).
   - Las **condiciones de tu humano** (del paso 2).
   - Una **propuesta inicial** de división con:
     - tabla de **zonas** (dueño + carpetas),
     - lista de **archivos compartidos**,
     - tabla de **tareas** (tarea, dueño, rama, dependencias),
     - **contratos** entre zonas (ej.: cómo se comunican el frontend y la API).
   - En **"Necesito de ti"**: las condiciones de su humano y si acepta o qué cambiaría.
2. Cambia el estado: `TURNO: IA-B`, `FASE: PRESENTACION`, `RONDA: 1`.
3. Commit y push siguiendo el protocolo.

Reparte de forma **justa**: según las horas y habilidades de cada uno, con tareas que se puedan hacer en paralelo y que dependan lo menos posible una de otra.

## 9. Informar a tu humano

Termina con un mensaje para tu humano que diga:

1. ✅ Lo que se creó: `CLAUDE.md`, `docs/ia/COORDINACION.md`, `docs/ia/INSTRUCCIONES_IA_B.md`.
2. 👉 **Lo que debe hacer él o ella:**
   - Agregar a su amigo como colaborador: GitHub → repo → **Settings → Collaborators → Add people** → `<usuario del amigo>`.
   - (Recomendado) Proteger `main`: **Settings → Branches → Add rule** → `main` → *Require a pull request before merging*. Si lo activa, avísale que la coordinación también tendrá que ir por PR, o deja que solo los administradores puedan hacer push directo.
   - Enviarle a su amigo el archivo `docs/ia/INSTRUCCIONES_IA_B.md` (o el link al archivo en GitHub) y decirle: *"pásale esto a tu Claude"*.
3. 🔁 Cómo seguir: cuando el amigo avise que su IA respondió, decirte *"revisa la coordinación"*.

---

## Reglas para ti (IA-A) durante la negociación y el trabajo

- Cada vez que tu humano diga *"revisa la coordinación"*: `git checkout main && git pull`, lee el ESTADO y responde solo si es tu turno.
- Si IA-B **acepta**, escribe el plan final en la sección **ACUERDO**, pon `FASE: ACUERDO_PENDIENTE` y `TURNO: HUMANOS`, y pide a tu humano que marque su aprobación. Cuando los dos humanos hayan marcado `[x]`, pon `FASE: TRABAJANDO`.
- Si IA-B hace una **contrapropuesta**, evalúala con tu humano y responde con ACEPTO o con otra CONTRAPROPUESTA (aumenta `RONDA`).
- Durante `TRABAJANDO`, usa la coordinación para:
  - **ESTADO**: "terminé la tarea #3, PR abierto".
  - **SOLICITUD_CAMBIO**: "necesito que agregues el campo X en tu API".
  - **AVISO**: "cambié el contrato Y" (solo después de que la otra IA lo aceptó).
  - Mantener actualizada la columna **Estado** de la tabla de tareas.
- Nunca toques archivos fuera de tu zona sin aprobación escrita en la coordinación.
- Sé honesto: si algo de la propuesta de la otra IA es injusto o técnicamente malo, dilo con razones.

## Opcional: revisión automática

En lugar de esperar el aviso del humano, la IA puede revisar sola cada cierto tiempo con:

```
/loop 10m revisa docs/ia/COORDINACION.md y responde si es tu turno
```

Si no hay cambios, no hace nada.
