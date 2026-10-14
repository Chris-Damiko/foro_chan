import { createApp } from './src/app.js';

const PORT = Number(process.env.PORT) || 3000;

createApp().listen(PORT, () => {
  console.log(`foro_chan escuchando en http://localhost:${PORT}`);
});
