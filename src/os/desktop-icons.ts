import type { IconCell } from '../config';
import { DESKTOP_FOLDER_ID } from '../config';
import { isMobile } from '../core/device';
import { h, img } from '../core/dom';
import { fileIcon, folderIcon } from '../core/icons';
import type { Os } from './context';
import {
  blockedCells,
  cellAt,
  cellKey,
  fromFraction,
  iconRect,
  makeGrid,
  nearestFree,
  placeIcons,
  toFraction,
  type Cell,
  type Grid,
  type Rect,
} from './icon-grid';
import type { DesktopLayout } from './layout-store';
import { onOpen } from './ui';

interface Item {
  key: string;
  el: HTMLDivElement;
  /** Place préférée (fraction de la grille), choisie au hasard la 1re fois puis par glisser-déposer. */
  home: [number, number] | null;
  /** Case affichée en ce moment (peut différer de `home` si un widget la recouvre). */
  cell: Cell | null;
}

/**
 * Icônes du bureau = contenu du dossier « Desktop » (id 8), rangées sur une grille :
 * une icône par case, jamais sous un widget. Quand on déplace un widget, les icônes
 * qu'il recouvre s'écartent, puis reviennent à leur place quand il s'en va.
 */
export class DesktopIcons {
  private readonly items = new Map<string, Item>();
  private grid: Grid | null = null;
  private blocked = new Set<string>();
  private size = { w: 0, h: 0 };
  private raf = 0;
  private readonly hint = h('div', { class: 'desktop-cell-hint', attrs: { hidden: true, 'aria-hidden': 'true' } });

  constructor(
    private readonly os: Os,
    private readonly screen: HTMLElement,
    private readonly cellSize: () => IconCell,
    private readonly layout: DesktopLayout,
    private readonly save: () => void,
    private readonly signal: AbortSignal,
  ) {
    screen.appendChild(this.hint);
    onOpen(screen, '.desktop-icon', (el) => this.open(el), signal);
    screen.addEventListener('keydown', (e) => {
      const el = (e.target as Element).closest<HTMLElement>('.desktop-icon');
      if (el && e.key === 'Enter') this.open(el);
    }, { signal });
    if (!isMobile) this.enableDrag();
    const ro = new ResizeObserver(() => this.relayout(false));
    ro.observe(screen);
    signal.addEventListener('abort', () => {
      ro.disconnect();
      cancelAnimationFrame(this.raf);
    });
  }

  private open(el: HTMLElement): void {
    const [kind, id] = (el.dataset.key ?? ':').split(':');
    if (kind === 'folder') {
      const folder = this.os.fs.folder(Number(id));
      if (folder) this.os.openFolder(folder, `explorer:${folder.name}`);
    } else {
      const file = this.os.fs.file(Number(id));
      if (file) this.os.launch(file);
    }
  }

  /** (Re)construit les icônes à partir de l'arborescence. Celles qui existaient gardent leur place. */
  render(): void {
    const fs = this.os.fs;
    const wanted = new Map<string, { name: string; icon: string }>();
    for (const f of fs.subfolders(DESKTOP_FOLDER_ID)) wanted.set(`folder:${f.id}`, { name: f.name, icon: folderIcon(f) });
    for (const f of fs.filesIn(DESKTOP_FOLDER_ID))
      wanted.set(`file:${f.id}`, { name: f.name, icon: fileIcon(f, { onDesktop: true, projectLogo: this.os.projectLogo(f) }) });

    for (const [key, item] of this.items) {
      if (!wanted.has(key)) {
        item.el.remove();
        this.items.delete(key);
      }
    }
    for (const [key, { name, icon }] of wanted) {
      const existing = this.items.get(key);
      if (existing) {
        existing.el.querySelector('img')!.src = icon;
        existing.el.querySelector('a')!.textContent = name;
        continue;
      }
      const el = h(
        'div',
        { class: 'menu_item desktop-icon', title: name, dataset: { key }, attrs: { tabindex: 0, role: 'button' } },
        img(icon),
        h('a', { class: 'menu_link', text: name }),
      );
      this.items.set(key, { key, el, home: this.layout.icons[key] ?? null, cell: null });
      this.screen.appendChild(el);
    }
    this.place(false);
  }

  /** Replace les icônes (widget déplacé, plein écran, redimensionnement), au plus une fois par image. */
  relayout(animate = true): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.place(animate);
    });
  }

  private computeGrid(): Grid {
    const sr = this.screen.getBoundingClientRect();
    const bar = this.screen.querySelector('.rectangular-bar-top')?.getBoundingClientRect();
    const top = (bar && bar.height ? bar.bottom - sr.top : sr.height * 0.04) + sr.height * 0.02;
    const bottom = sr.height * (isMobile ? 0.1 : 0.07); // la barre des tâches dépasse en bas
    const side = sr.width * 0.012;
    const { cellW, cellH } = this.cellSize();
    return makeGrid(
      { x: side, y: top, w: sr.width - side * 2, h: sr.height - top - bottom },
      (cellW * window.innerWidth) / 100,
      (cellH * window.innerHeight) / 100,
    );
  }

  /** Taille des icônes. PC : calculée depuis la case. Mobile : celle du CSS d'origine. */
  private applySizes(g: Grid): void {
    if (isMobile) {
      const first = this.items.values().next().value as Item | undefined;
      this.size = first ? { w: first.el.offsetWidth, h: first.el.offsetHeight } : { w: g.cellW, h: g.cellH };
      return;
    }
    const icon = Math.min(g.cellW * 0.48, g.cellH * 0.52);
    const font = Math.max(5.5, g.cellW * 0.062);
    const gap = window.innerHeight * 0.006;
    const w = g.cellW * 0.94;
    const hgt = icon + gap + font * 1.35 * 2 + 2;
    const s = this.screen.style;
    s.setProperty('--icon-w', `${w}px`);
    s.setProperty('--icon-h', `${hgt}px`);
    s.setProperty('--icon-img', `${icon}px`);
    s.setProperty('--icon-font', `${font}px`);
    s.setProperty('--icon-gap', `${gap}px`);
    this.size = { w, h: hgt };
  }

  /** Rectangles des widgets visibles, en px dans l'écran. */
  private obstacles(): Rect[] {
    const sr = this.screen.getBoundingClientRect();
    return [...this.screen.querySelectorAll<HTMLElement>('.widget')]
      .filter((w) => w.offsetParent !== null && !w.classList.contains('is-closing'))
      .map((w) => {
        const r = w.getBoundingClientRect();
        return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height };
      });
  }

  private place(animate: boolean): void {
    if (!this.items.size) return;
    const g = this.computeGrid();
    this.grid = g;
    this.applySizes(g);
    this.blocked = blockedCells(g, this.obstacles(), this.size.w, this.size.h);

    const list = [...this.items.values()];
    const { cells, newHomes } = placeIcons(
      g,
      list.map((it) => [it.key, it.home ? fromFraction(g, it.home) : null] as [string, Cell | null]),
      this.blocked,
    );
    for (const [key, cell] of newHomes) {
      const it = this.items.get(key)!;
      it.home = toFraction(g, cell);
      this.layout.icons[key] = it.home;
    }
    if (newHomes.size) this.save();

    const sr = this.screen.getBoundingClientRect();
    for (const it of list) {
      if (it.el.classList.contains('is-dragging')) continue;
      it.cell = cells.get(it.key) ?? it.cell;
      if (!it.cell) continue;
      const r = iconRect(g, it.cell, this.size.w, this.size.h);
      if (!animate) it.el.style.transition = 'none';
      it.el.style.left = `${(r.x / sr.width) * 100}%`;
      it.el.style.top = `${(r.y / sr.height) * 100}%`;
      if (!animate) {
        void it.el.offsetWidth; // applique la position sans animation
        it.el.style.transition = '';
      }
    }
  }

  /** Glisser-déposer d'une icône (PC) : elle s'aimante à une case ; si la case est prise, on échange. */
  private enableDrag(): void {
    this.screen.addEventListener(
      'pointerdown',
      (e) => {
        const el = (e.target as Element).closest<HTMLDivElement>('.desktop-icon');
        const item = el && this.items.get(el.dataset.key ?? '');
        if (!el || !item || e.button !== 0) return;
        const sr = this.screen.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        const shiftX = e.clientX - r.left;
        const shiftY = e.clientY - r.top;
        let moved = false;
        let target: Cell | null = null;

        const move = (ev: PointerEvent) => {
          const g = this.grid;
          if (!g) return;
          if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 4) return;
          if (!moved) {
            moved = true;
            el.classList.add('is-dragging');
            this.hint.hidden = false;
          }
          const x = ev.clientX - shiftX - sr.left;
          const y = ev.clientY - shiftY - sr.top;
          el.style.left = `${(x / sr.width) * 100}%`;
          el.style.top = `${(y / sr.height) * 100}%`;
          target = cellAt(g, x + r.width / 2, y + r.height / 2);
          const hr = iconRect(g, target, this.size.w, this.size.h);
          Object.assign(this.hint.style, {
            left: `${(hr.x / sr.width) * 100}%`,
            top: `${(hr.y / sr.height) * 100}%`,
            width: `${(hr.w / sr.width) * 100}%`,
            height: `${(hr.h / sr.height) * 100}%`,
          });
          this.hint.classList.toggle('is-blocked', this.blocked.has(cellKey(target)));
        };

        const up = () => {
          document.removeEventListener('pointermove', move);
          this.hint.hidden = true;
          el.classList.remove('is-dragging');
          const g = this.grid;
          if (!moved || !g || !target) return;
          let dest: Cell | null = target;
          if (this.blocked.has(cellKey(dest))) {
            const taken = new Set(this.blocked);
            for (const other of this.items.values()) if (other !== item && other.cell) taken.add(cellKey(other.cell));
            dest = nearestFree(g, dest, taken);
          }
          if (dest) {
            const d = dest;
            const other = [...this.items.values()].find((o) => o !== item && o.cell && cellKey(o.cell) === cellKey(d));
            if (other && item.cell) {
              other.home = toFraction(g, item.cell); // échange de places
              this.layout.icons[other.key] = other.home;
            }
            item.home = toFraction(g, d);
            this.layout.icons[item.key] = item.home;
            this.save();
          }
          this.place(true);
        };

        document.addEventListener('pointermove', move, { signal: this.signal });
        document.addEventListener('pointerup', up, { once: true, signal: this.signal });
        el.ondragstart = () => false;
      },
      { signal: this.signal },
    );
  }
}
