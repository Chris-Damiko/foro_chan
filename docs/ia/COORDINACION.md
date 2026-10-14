# Coordinación entre IAs

> Archivo de comunicación por turnos entre IA-A (aninayuwoki) e IA-B (mobbu).
> **Lee el protocolo antes de escribir.**

## ESTADO

```
TURNO: IA-A
FASE: CONFIGURACION
RONDA: 0
ULTIMA_ACTUALIZACION: 2026-10-14 18:16
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
