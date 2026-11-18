// Découpe le cadre des fenêtres (src/ui/frame/window.png) en 8 morceaux pour le CSS.
// L'image peut être agrandie (×6, ×8…) : la taille réelle du pixel-art est détectée.
// Usage : npm run frame      (après avoir remplacé src/ui/frame/window.png)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { crc32, deflateSync, inflateSync } from 'node:zlib';

/** Lignes de découpe, en pixels de l'image réelle (210×196 aujourd'hui). */
const SLICE = {
  top: 40, // barre de titre + séparateur + haut du cadre (fixe)
  bottom: 20, // bas du cadre (fixe)
  left: 50, // début de la barre de titre (fixe)
  right: 58, // boutons vert / jaune / rouge (fixe)
};

const DIR = 'src/ui/frame';

function readPng(path) {
  const buf = readFileSync(path);
  if (buf.toString('latin1', 1, 4) !== 'PNG') throw new Error(`${path} n'est pas un PNG`);
  let pos = 8;
  let width = 0;
  let height = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('latin1', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      if (body[8] !== 8 || body[9] !== 6 || body[12] !== 0) throw new Error('PNG RGBA 8 bits non entrelacé attendu');
    } else if (type === 'IDAT') idat.push(body);
    pos += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? out[y * stride + x - 4] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= 4 && y > 0 ? out[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c;
      const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c) : 0;
      out[y * stride + x] = (line[x] + pred) & 255;
    }
  }
  return { width, height, at: (x, y) => out.readUInt32BE((y * width + x) * 4) };
}

function writePng(path, w, h, pixel) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.writeUInt32BE(pixel(x, y) >>> 0, y * (w * 4 + 1) + 1 + x * 4);
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'latin1'), body])));
    return Buffer.concat([len, Buffer.from(type, 'latin1'), body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  writeFileSync(path, Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'latin1'), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}

// Taille d'un « pixel » du dessin = PGCD des longueurs de plages de couleur.
const src = readPng(`${DIR}/window.png`);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
let block = 0;
for (let y = 0; y < src.height; y += 17) {
  let n = 1;
  for (let x = 1; x < src.width; x++) {
    if (src.at(x, y) === src.at(x - 1, y)) n++;
    else {
      block = gcd(block, n);
      n = 1;
    }
  }
}
const W = Math.round(src.width / block);
const H = Math.round(src.height / block);
const px = (x, y) => src.at(x * block + (block >> 1), y * block + (block >> 1));
console.log(`Image ${src.width}×${src.height}, pixel ×${block} → taille réelle ${W}×${H}`);

const { top, bottom, left, right } = SLICE;
const midX = left + 1; // une colonne de la partie qui se répète (rayures)
const midY = top + 1; // une ligne de la partie qui se répète (corps)
mkdirSync(DIR, { recursive: true });
const pieces = {
  tl: [left, top, (x, y) => px(x, y)],
  tr: [right, top, (x, y) => px(W - right + x, y)],
  bl: [left, bottom, (x, y) => px(x, H - bottom + y)],
  br: [right, bottom, (x, y) => px(W - right + x, H - bottom + y)],
  t: [1, top, (_, y) => px(midX, y)],
  b: [1, bottom, (_, y) => px(midX, H - bottom + y)],
  l: [left, 1, (x) => px(x, midY)],
  r: [right, 1, (x) => px(W - right + x, midY)],
};
for (const [name, [w, h, fn]] of Object.entries(pieces)) writePng(`${DIR}/${name}.png`, w, h, fn);
const c = px(midX, midY);
console.log(`8 morceaux écrits dans ${DIR}/ ; couleur du centre : #${(c >>> 8).toString(16).padStart(6, '0')}`);
