# foro_chan

Imageboard anónimo para confesiones y seguimiento de casos sobre Dross.

## Uso

```bash
npm install
npm start        # http://localhost:3000
npm run dev      # reinicia al guardar
npm test
```

Variables de entorno (opcionales):

| Variable | Para qué | Por defecto |
|----------|----------|-------------|
| `PORT` | Puerto HTTP | `3000` |
| `DATA_DIR` | Carpeta de datos JSON e imágenes | `./data` |
| `TRUST_PROXY` | Valor de `trust proxy` de Express si hay proxy delante | sin definir |
| `ADMIN_TOKEN` | Token para las rutas de admin (cabecera `x-admin-token`). Sin él, el admin queda desactivado | sin definir |
| `TRIP_SECRET` | Secreto para los tripcodes. Si falta, se genera y se guarda en `data/.tripsecret` | generado |
| `SYNC_VIDEOS` | `0` desactiva la sincronización de videos de Querido Dross | activada |
| `YTDLP_PATH` | Ruta a `yt-dlp` si no está en el PATH | `yt-dlp` |
| `ANON_SALT` | Sal secreta para los `anonId`. Si falta, se genera una y se guarda en `data/.salt` | generada |

## Documentación
- `docs/api.md`: contrato de la API.
- `CLAUDE.md`: reglas del proyecto.
- `docs/ia/COORDINACION.md`: coordinación entre los dos desarrolladores.

## Videos de Querido Dross
El tablero principal (`qd`) tiene un hilo por cada video del canal de Dross con "Querido Dross" en el título.
- Requiere [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) instalado en el servidor. Sin él, el foro funciona igual pero no crea hilos de videos.
- Al arrancar, el servidor revisa todo el canal; después revisa los últimos 30 videos cada 6 h.
- `npm run importar:videos` hace la importación completa **con el servidor detenido**.
