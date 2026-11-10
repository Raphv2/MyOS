import type { GridConfig } from '../config';
import { DESKTOP_FOLDER_ID } from '../config';
import { isMobile } from '../core/device';
import { h, img } from '../core/dom';
import { fileIcon, folderIcon } from '../core/icons';
import type { Os } from './context';
import { onOpen } from './ui';

const WIDGET_IDS = ['eye_widget', 'contact_us', 'profile_widget'];

export function randomStep(min: number, max: number, step: number): number {
  return Math.round((Math.random() * (max - min) + min) / step) * step;
}

/**
 * Icônes du bureau = contenu du dossier « Desktop » (id 8).
 * Placement aléatoire sur une grille qui évite les widgets, glisser-déposer
 * avec aimantation (PC), ouverture au double-clic (PC) ou au tap (mobile).
 */
export class DesktopIcons {
  private readonly items = new Map<string, HTMLDivElement>();

  constructor(
    private readonly os: Os,
    private readonly screen: HTMLElement,
    private readonly grid: () => GridConfig,
    private readonly signal: AbortSignal,
  ) {
    onOpen(screen, '.desktop-icon', (el) => this.open(el), signal);
    screen.addEventListener('keydown', (e) => {
      const el = (e.target as Element).closest<HTMLElement>('.desktop-icon');
      if (el && e.key === 'Enter') this.open(el);
    }, { signal });
    if (!isMobile) this.enableDrag();
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

  /** (Re)construit les icônes. Celles qui existaient gardent leur place. */
  render(): void {
    const fs = this.os.fs;
    const wanted = new Map<string, { name: string; icon: string }>();
    for (const f of fs.subfolders(DESKTOP_FOLDER_ID)) wanted.set(`folder:${f.id}`, { name: f.name, icon: folderIcon(f) });
    for (const f of fs.filesIn(DESKTOP_FOLDER_ID))
      wanted.set(`file:${f.id}`, { name: f.name, icon: fileIcon(f, { onDesktop: true, projectLogo: this.os.projectLogo(f) }) });

    for (const [key, el] of this.items) {
      if (!wanted.has(key)) {
        el.remove();
        this.items.delete(key);
      }
    }
    const fresh: HTMLDivElement[] = [];
    for (const [key, { name, icon }] of wanted) {
      const existing = this.items.get(key);
      if (existing) {
        existing.querySelector('img')!.src = icon;
        existing.querySelector('a')!.textContent = name;
        continue;
      }
      const el = h(
        'div',
        { class: 'menu_item desktop-icon', title: name, dataset: { key }, attrs: { tabindex: 0, role: 'button' } },
        img(icon),
        h('a', { class: 'menu_link', text: name }),
      );
      this.items.set(key, el);
      this.screen.appendChild(el);
      fresh.push(el);
    }
    this.place(fresh);
  }

  /** Replace toutes les icônes (changement de mode plein écran). */
  relayout(): void {
    this.place([...this.items.values()]);
  }

  private zones() {
    const sr = this.screen.getBoundingClientRect();
    const vw = window.innerWidth / 100;
    const vh = window.innerHeight / 100;
    return WIDGET_IDS.map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el && el.offsetParent !== null)
      .map((el) => {
        const r = el.getBoundingClientRect();
        const left = (r.left - sr.left) / vw;
        const top = (r.top - sr.top) / vh;
        const width = r.width / vw;
        const height = r.height / vh;
        return { left, top, right: left + width, bottom: top + height, height };
      });
  }

  private place(els: HTMLDivElement[]): void {
    const g = this.grid();
    const zones = this.zones();
    const used = new Set(
      [...this.items.values()].filter((el) => !els.includes(el)).map((el) => `${parseFloat(el.style.left)}:${parseFloat(el.style.top)}`),
    );
    for (const el of els) {
      let left = 0;
      let top = 0;
      for (let tries = 0; tries <= 100; tries++) {
        left = randomStep(g.minWidth, g.maxWidth, g.stepWidth);
        top = randomStep(g.minHeight, g.maxHeight, g.stepHeight);
        const blocked = zones.some(
          (z) =>
            left > z.left - 10 &&
            left < z.right + 10 &&
            top > z.top - z.height * 0.5 - 5 &&
            top < z.bottom + z.height * 0.5 + 5,
        );
        if (!blocked && !used.has(`${left}:${top}`)) break;
      }
      used.add(`${left}:${top}`);
      el.style.left = `${left}vw`;
      el.style.top = `${top}vh`;
    }
  }

  private enableDrag(): void {
    this.screen.addEventListener(
      'pointerdown',
      (e) => {
        const item = (e.target as Element).closest<HTMLElement>('.desktop-icon');
        if (!item || e.button !== 0) return;
        const r = item.getBoundingClientRect();
        const sr = this.screen.getBoundingClientRect();
        const shiftX = e.clientX - r.left;
        const shiftY = e.clientY - r.top;
        let moved = false;
        const move = (ev: PointerEvent) => {
          if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 3) return;
          moved = true;
          item.style.left = `${((ev.clientX - shiftX - sr.left) / window.innerWidth) * 100}vw`;
          item.style.top = `${((ev.clientY - shiftY - sr.top) / window.innerHeight) * 100}vh`;
        };
        const up = () => {
          document.removeEventListener('pointermove', move);
          if (!moved) return;
          const g = this.grid();
          const snap = (v: number, step: number, min: number, max: number) => Math.min(Math.max(Math.round(v / step) * step, min), max);
          item.style.left = `${snap(parseFloat(item.style.left), g.stepWidth, g.minWidth, g.maxWidth)}vw`;
          item.style.top = `${snap(parseFloat(item.style.top), g.stepHeight, g.minHeight, g.maxHeight)}vh`;
        };
        document.addEventListener('pointermove', move, { signal: this.signal });
        document.addEventListener('pointerup', up, { once: true, signal: this.signal });
        item.ondragstart = () => false;
      },
      { signal: this.signal },
    );
  }
}
