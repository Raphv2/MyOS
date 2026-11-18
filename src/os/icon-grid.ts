/**
 * Grille du bureau : calculs purs (pas de DOM), testés dans tests/icon-grid.test.ts.
 * Une icône occupe une case ; les cases recouvertes par un widget sont bloquées.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Grid {
  cols: number;
  rows: number;
  /** Coin haut-gauche de la zone utile, en px dans l'écran. */
  x0: number;
  y0: number;
  cellW: number;
  cellH: number;
}

export interface Cell {
  c: number;
  r: number;
}

export const cellKey = (cell: Cell) => `${cell.c},${cell.r}`;

/**
 * Découpe la zone utile en cases entières, aussi proches que possible de la taille visée,
 * puis étire les cases pour remplir toute la zone (pas de bande vide à droite).
 */
export function makeGrid(area: Rect, targetW: number, targetH: number): Grid {
  const cols = Math.max(1, Math.floor(area.w / Math.max(1, targetW)));
  const rows = Math.max(1, Math.floor(area.h / Math.max(1, targetH)));
  return { cols, rows, x0: area.x, y0: area.y, cellW: area.w / cols, cellH: area.h / rows };
}

/** Rectangle qu'occupe une icône (w × h) centrée dans une case. */
export function iconRect(g: Grid, cell: Cell, w: number, h: number): Rect {
  return {
    x: g.x0 + cell.c * g.cellW + (g.cellW - w) / 2,
    y: g.y0 + cell.r * g.cellH + (g.cellH - h) / 2,
    w,
    h,
  };
}

export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Cases dont l'icône toucherait un obstacle (widget), avec une marge en px. */
export function blockedCells(g: Grid, obstacles: Rect[], iconW: number, iconH: number, margin = 6): Set<string> {
  const out = new Set<string>();
  const grown = obstacles.map((o) => ({ x: o.x - margin, y: o.y - margin, w: o.w + margin * 2, h: o.h + margin * 2 }));
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const rect = iconRect(g, { c, r }, iconW, iconH);
      if (grown.some((o) => intersects(rect, o))) out.add(cellKey({ c, r }));
    }
  }
  return out;
}

/** Case de la grille la plus proche d'un point (px dans l'écran), bornée à la grille. */
export function cellAt(g: Grid, x: number, y: number): Cell {
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return {
    c: clamp(Math.floor((x - g.x0) / g.cellW), g.cols - 1),
    r: clamp(Math.floor((y - g.y0) / g.cellH), g.rows - 1),
  };
}

/** Fraction (0..1) ↔ case : la place d'une icône survit à un changement de taille de grille. */
export const toFraction = (g: Grid, cell: Cell): [number, number] => [
  g.cols > 1 ? cell.c / (g.cols - 1) : 0,
  g.rows > 1 ? cell.r / (g.rows - 1) : 0,
];
export const fromFraction = (g: Grid, f: [number, number]): Cell => ({
  c: Math.round(Math.min(Math.max(f[0], 0), 1) * (g.cols - 1)),
  r: Math.round(Math.min(Math.max(f[1], 0), 1) * (g.rows - 1)),
});

/** Case libre la plus proche (distance réelle à l'écran), ou null si tout est pris. */
export function nearestFree(g: Grid, from: Cell, taken: Set<string>): Cell | null {
  let best: Cell | null = null;
  let bestD = Infinity;
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      if (taken.has(cellKey({ c, r }))) continue;
      const d = ((c - from.c) * g.cellW) ** 2 + ((r - from.r) * g.cellH) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { c, r };
      }
    }
  }
  return best;
}

export interface Placement<K> {
  /** Case finale de chaque icône (null si la grille est pleine). */
  cells: Map<K, Cell | null>;
  /** Place « préférée » attribuée aux icônes qui n'en avaient pas encore. */
  newHomes: Map<K, Cell>;
}

/**
 * Place les icônes :
 *  1. celles dont la case préférée est libre la gardent ;
 *  2. celles dont la case est recouverte (widget) ou déjà prise vont à la case libre la plus proche,
 *     et retrouveront leur place dès qu'elle se libère ;
 *  3. les nouvelles icônes (sans place) prennent une case libre au hasard.
 */
export function placeIcons<K>(
  g: Grid,
  homes: Array<[K, Cell | null]>,
  blocked: Set<string>,
  random: () => number = Math.random,
): Placement<K> {
  const taken = new Set(blocked);
  const cells = new Map<K, Cell | null>();
  const newHomes = new Map<K, Cell>();
  const displaced: Array<[K, Cell]> = [];

  for (const [key, home] of homes) {
    if (!home) continue;
    const k = cellKey(home);
    if (!taken.has(k)) {
      taken.add(k);
      cells.set(key, home);
    } else displaced.push([key, home]);
  }
  for (const [key, home] of displaced) {
    const cell = nearestFree(g, home, taken);
    if (cell) taken.add(cellKey(cell));
    cells.set(key, cell);
  }
  for (const [key, home] of homes) {
    if (home) continue;
    const free: Cell[] = [];
    for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) if (!taken.has(cellKey({ c, r }))) free.push({ c, r });
    const cell = free.length ? free[Math.floor(random() * free.length)]! : null;
    if (cell) {
      taken.add(cellKey(cell));
      newHomes.set(key, cell);
    }
    cells.set(key, cell);
  }
  return { cells, newHomes };
}
