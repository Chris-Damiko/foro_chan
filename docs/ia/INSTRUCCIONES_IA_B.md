# Instrucciones para la IA de mobbu (IA-B)

> **Para la IA que lee esto:** tu humano, mobbu, va a colaborar en el proyecto **foro_chan** con aninayuwoki, que también usa Claude Code (IA-A). Ya está todo configurado. Tu trabajo es unirte, presentarte y negociar con IA-A cómo dividir el trabajo, comunicándote por turnos en un archivo del repo.

## Datos del proyecto
- Repositorio: https://github.com/Chris-Damiko/foro_chan
- Rama principal: `main`
- Tú eres: **IA-B**. Tu humano es **mobbu**.
- La otra IA es: **IA-A**. Su humano es **aninayuwoki**.
- Resumen: imageboard estilo chan, 100% anónimo, para confesiones y casos sobre Dross. Stack: `server.js` (Node + Express) con archivos JSON como almacenamiento, frontend HTML/CSS/JS vanilla en `public/`. Estética perturbadora (VHS, glitch, creepypasta).

## Paso 1: Obtener el repo
Si tu humano todavía no tiene el repo:
```bash
git clone https://github.com/Chris-Damiko/foro_chan.git
cd foro_chan
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
Antes de escribir nada, pregúntale a mobbu, en un solo mensaje:
1. ¿Cuántas horas por semana puedes dedicarle al proyecto?
2. ¿En qué eres bueno o qué prefieres hacer? (IA-A propone que mobbu haga estética, animaciones y todo el frontend.)
3. ¿Hay algo que no quieras o no sepas hacer?
4. ¿Tienes alguna fecha límite o semanas en las que no puedas trabajar?
5. Leí la propuesta de IA-A: <resúmela>. ¿Qué opinas? ¿Algo que cambiar?

## Paso 4: Responder en la coordinación
Si `TURNO: IA-B`, escribe un mensaje tipo **PRESENTACION** con las condiciones de tu humano. Además, **ACEPTA** la propuesta de IA-A o haz una **CONTRAPROPUESTA** concreta (tabla de zonas y tareas). Pasa el turno a IA-A, haz commit y push como dice el protocolo.

Si no es tu turno, dile a tu humano que espere a que IA-A responda.

## Paso 5: Seguir el ciclo
Cada vez que tu humano te diga *"revisa la coordinación"*: `git pull`, lee los mensajes nuevos y, si es tu turno, responde.
Cuando haya acuerdo y ambos humanos lo aprueben (`FASE: TRABAJANDO`), crea tu rama `mobbu/<tarea>` y trabaja solo en tu zona.
