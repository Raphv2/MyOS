import { describe, expect, it } from 'vitest';
import { blockedCells, cellAt, cellKey, fromFraction, makeGrid, nearestFree, placeIcons, toFraction } from '../src/os/icon-grid';

// Écran TV 1357×540 utile, cases visées 110×100 px → 12 colonnes × 5 lignes.
const g = makeGrid({ x: 16, y: 40, w: 1320, h: 540 }, 110, 100);

describe('makeGrid', () => {
  it('découpe en cases entières qui remplissent la zone', () => {
    expect(g.cols).toBe(12);
    expect(g.rows).toBe(5);
    expect(g.cellW * g.cols).toBeCloseTo(1320);
    expect(g.cellH * g.rows).toBeCloseTo(540);
  });
});

describe('blockedCells', () => {
  it('bloque les cases dont l’icône toucherait un widget', () => {
    // widget en haut à droite : colonnes 10-11, lignes 0-1
    const widget = { x: 16 + 10 * 110 + 10, y: 40 + 5, w: 200, h: 190 };
    const blocked = blockedCells(g, [widget], 100, 76);
    expect(blocked.has('10,0')).toBe(true);
    expect(blocked.has('11,1')).toBe(true);
    expect(blocked.has('0,0')).toBe(false);
    expect(blocked.has('8,0')).toBe(false);
  });
});

describe('placeIcons', () => {
  it('garde la place de chaque icône quand elle est libre', () => {
    const { cells } = placeIcons(g, [['a', { c: 0, r: 0 }], ['b', { c: 3, r: 2 }]], new Set());
    expect(cells.get('a')).toEqual({ c: 0, r: 0 });
    expect(cells.get('b')).toEqual({ c: 3, r: 2 });
  });

  it('écarte une icône recouverte par un widget vers la case libre la plus proche', () => {
    const { cells } = placeIcons(g, [['a', { c: 5, r: 2 }]], new Set(['5,2']));
    const cell = cells.get('a')!;
    expect(cellKey(cell)).not.toBe('5,2');
    expect(Math.abs(cell.c - 5) + Math.abs(cell.r - 2)).toBe(1);
  });

  it('une icône écartée ne prend pas la place d’une icône qui était déjà chez elle', () => {
    // 'a' est chassée de 5,2 ; 'b' est chez elle en 5,1 (la case la plus proche verticalement)
    const { cells } = placeIcons(g, [['a', { c: 5, r: 2 }], ['b', { c: 5, r: 1 }]], new Set(['5,2']));
    expect(cells.get('b')).toEqual({ c: 5, r: 1 });
    expect(cellKey(cells.get('a')!)).not.toBe('5,1');
  });

  it('retrouve sa place quand le widget s’en va (la place préférée ne change pas)', () => {
    const homes: Array<[string, { c: number; r: number }]> = [['a', { c: 5, r: 2 }]];
    expect(cellKey(placeIcons(g, homes, new Set(['5,2'])).cells.get('a')!)).not.toBe('5,2');
    expect(placeIcons(g, homes, new Set()).cells.get('a')).toEqual({ c: 5, r: 2 });
  });

  it('place les nouvelles icônes sur des cases libres, sans doublon ni widget', () => {
    const blocked = new Set(['0,0', '1,0']);
    const keys = Array.from({ length: 30 }, (_, i) => [`n${i}`, null] as [string, null]);
    const { cells, newHomes } = placeIcons(g, [['a', { c: 2, r: 0 }], ...keys], blocked, () => 0);
    const used = [...cells.values()].map((c) => cellKey(c!));
    expect(new Set(used).size).toBe(used.length);
    expect(used.some((k) => blocked.has(k))).toBe(false);
    expect(newHomes.size).toBe(30);
  });
});

describe('outils', () => {
  it('cellAt reste dans la grille', () => {
    expect(cellAt(g, -500, -500)).toEqual({ c: 0, r: 0 });
    expect(cellAt(g, 99999, 99999)).toEqual({ c: 11, r: 4 });
  });
  it('fraction ↔ case (survit au passage en plein écran)', () => {
    const cell = { c: 7, r: 3 };
    expect(fromFraction(g, toFraction(g, cell))).toEqual(cell);
    const big = makeGrid({ x: 0, y: 0, w: 1560, h: 700 }, 110, 100);
    const moved = fromFraction(big, toFraction(g, { c: 11, r: 4 }));
    expect(moved).toEqual({ c: big.cols - 1, r: big.rows - 1 });
  });
  it('nearestFree renvoie null quand tout est pris', () => {
    const tiny = makeGrid({ x: 0, y: 0, w: 100, h: 100 }, 100, 100);
    expect(nearestFree(tiny, { c: 0, r: 0 }, new Set(['0,0']))).toBeNull();
  });
});
