// Génère les icônes pixel-art des nouveaux types de fichiers (public/os-icons/*.svg).
// Chaque icône est une grille 16×16 : une lettre = une couleur, « . » = transparent.
// Usage : npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';

const PALETTE = {
  K: '#212121', // contour
  W: '#efefef', // blanc OS
  B: '#1f34d4', // bleu MyOS
  Y: '#f3ec8a', // jaune dossier
  O: '#ffcc00', // or
  R: '#e03030', // rouge
  G: '#00ff22', // vert
  D: '#868585', // gris
  N: '#1e1e1e', // fond IDE
};

const ICONS = {
  file: [
    '................',
    '...KKKKKKKK.....',
    '...KWWWWWWKK....',
    '...KWWWWWWKWK...',
    '...KWWWWWWKKKK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWKD.',
    '...KKKKKKKKKKKD.',
    '....DDDDDDDDDDD.',
  ],
  code: [
    '................',
    '...KKKKKKKK.....',
    '...KWWWWWWKK....',
    '...KWWWWWWKWK...',
    '...KWWWWWWKKKK..',
    '...KWBBBBWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWBBBBBBWK..',
    '...KWWWWWWWWWK..',
    '...KWWRRRWWWWK..',
    '...KWWWWWWWWWK..',
    '...KWBBBBBWWWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWKD.',
    '...KKKKKKKKKKKD.',
    '....DDDDDDDDDDD.',
  ],
  markdown: [
    '................',
    '...KKKKKKKK.....',
    '...KWWWWWWKK....',
    '...KWWWWWWKWK...',
    '...KWWWWWWKKKK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWK..',
    '...KBWWWBWWBWK..',
    '...KBBWBBWWBWK..',
    '...KBWBWBWWBWK..',
    '...KBWWWBWBBBK..',
    '...KBWWWBWWBWK..',
    '...KWWWWWWWWWK..',
    '...KWWWWWWWWWKD.',
    '...KKKKKKKKKKKD.',
    '....DDDDDDDDDDD.',
  ],
  video: [
    '................',
    '................',
    '.KKKKKKKKKKKKKK.',
    '.KWKWKWKWKWKWKK.',
    '.KKKKKKKKKKKKKK.',
    '.KBBBBBBBBBBBBK.',
    '.KBBBBWBBBBBBBK.',
    '.KBBBBWWBBBBBBK.',
    '.KBBBBWWWBBBBBK.',
    '.KBBBBWWBBBBBBK.',
    '.KBBBBWBBBBBBBK.',
    '.KBBBBBBBBBBBBK.',
    '.KKKKKKKKKKKKKK.',
    '.KWKWKWKWKWKWKK.',
    '.KKKKKKKKKKKKKK.',
    '................',
  ],
  project: [
    '................',
    '..KKKKK.........',
    '.KYYYYYK........',
    '.KYYYYYYKKKKKKK.',
    '.KYYYYYYYYYYYYK.',
    '.KYYYYYYYYYYYYK.',
    '.KYYYYYBYYYYYYK.',
    '.KYYYYBBBYYYYYK.',
    '.KYYBBBBBBBYYYK.',
    '.KYYYBBBBBYYYYK.',
    '.KYYYYBBBYYYYYK.',
    '.KYYYBBYBBYYYYK.',
    '.KYYYBYYYBYYYYK.',
    '.KYYYYYYYYYYYYK.',
    '.KKKKKKKKKKKKKK.',
    '................',
  ],
  link: [
    '................',
    '.....KKKKKK.....',
    '...KKBBWWBBKK...',
    '..KBBWBBBBWBBK..',
    '.KBBWBBBBBBWBBK.',
    '.KWWWWWWWWWWWWK.',
    'KBBWBBBBBBBBWBBK',
    'KBBWBBBBBBBBWBBK',
    'KWWWWWWWWWWWWWWK',
    'KBBWBBBBBBBBWBBK',
    '.KBBWBBBBBBWBBK.',
    '.KWWWWWWWWWWWWK.',
    '..KBBWBBBBWBBK..',
    '...KKBBWWBBKK...',
    '.....KKKKKK.....',
    '................',
  ],
  admin: [
    '................',
    '................',
    '................',
    '..KKKK..........',
    '.KOOOOK.........',
    'KOOKKOOK........',
    'KOK..KOKKKKKKKK.',
    'KOK..KOOOOOOOOOK',
    'KOOKKOOKKKKOKKOK',
    '.KOOOOK....K..K.',
    '..KKKK..........',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  error: [
    '................',
    '.....KKKKKK.....',
    '...KKRRRRRRKK...',
    '..KRRRRRRRRRRK..',
    '.KRRWWRRRRWWRRK.',
    '.KRRRWWRRWWRRRK.',
    'KRRRRRWWWWRRRRRK',
    'KRRRRRRWWRRRRRRK',
    'KRRRRRWWWWRRRRRK',
    '.KRRRWWRRWWRRRK.',
    '.KRRWWRRRRWWRRK.',
    '..KRRRRRRRRRRK..',
    '...KKRRRRRRKK...',
    '.....KKKKKK.....',
    '................',
    '................',
  ],
  ide: [
    '................',
    '.KKKKKKKKKKKKKK.',
    '.KBBBBBBBBBGORK.',
    '.KKKKKKKKKKKKKK.',
    '.KNNNNNNNNNNNNK.',
    '.KNOOONNNNNNNNK.',
    '.KNNBBBBNNNNNNK.',
    '.KNNBBNGGGNNNNK.',
    '.KNOONNNNNNNNNK.',
    '.KNNNWWWWNNNNNK.',
    '.KNNNNNNNNNNNNK.',
    '.KKKKKKKKKKKKKK.',
    '......KKKK......',
    '....KKKKKKKK....',
    '................',
    '................',
  ],
};

function toSvg(name, rows) {
  if (rows.length !== 16 || rows.some((r) => r.length !== 16)) {
    throw new Error(`${name} : la grille doit faire 16×16 (${rows.map((r) => r.length).join(',')})`);
  }
  const rects = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < 16) {
      const c = row[x];
      if (c === '.') {
        x++;
        continue;
      }
      let w = 1;
      while (x + w < 16 && row[x + w] === c) w++;
      const fill = PALETTE[c];
      if (!fill) throw new Error(`${name} : couleur inconnue « ${c} »`);
      rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${fill}"/>`);
      x += w;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="48" height="48" shape-rendering="crispEdges">${rects.join('')}</svg>\n`;
}

mkdirSync('public/os-icons', { recursive: true });
for (const [name, rows] of Object.entries(ICONS)) {
  writeFileSync(`public/os-icons/${name}.svg`, toSvg(name, rows));
}
console.log(`${Object.keys(ICONS).length} icônes générées dans public/os-icons/`);
