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

## Documentación
- `docs/api.md`: contrato de la API.
- `CLAUDE.md`: reglas del proyecto.
- `docs/ia/COORDINACION.md`: coordinación entre los dos desarrolladores.
