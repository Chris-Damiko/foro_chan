export const BOARDS = [
  { id: 'conf', name: 'Confesiones', description: 'Lo que nunca dijiste.' },
  { id: 'casos', name: 'Casos', description: 'Seguimiento de casos, siempre con fuentes.' },
  { id: 'gen', name: 'General', description: 'Todo lo demás.' },
];

export const BOARD_IDS = new Set(BOARDS.map((b) => b.id));
