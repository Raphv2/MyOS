import { isMobile } from '../core/device';
import { clamp, h } from '../core/dom';
import type { Cursor } from './cursor';

export interface WindowOptions {
  /** Identifiant unique : rouvrir la même clé remet la fenêtre existante au premier plan. */
  key: string;
  /** Texte de la barre de titre (`application_name`). */
  title: string;
  /** Icône dans la barre des tâches. */
  icon: string;
  /** Étiquette affichée au survol de l'icône (par défaut : le titre sans extension). */
  label?: string;
  width?: string;
  height?: string;
  /** Classe en plus sur la fenêtre (thème d'une appli). */
  className?: string;
}

/** Une fenêtre de l'OS (`.new-square`). Tout ce qu'une appli y branche est nettoyé à la fermeture. */
export class OSWindow {
  readonly el: HTMLDivElement;
  readonly body: HTMLDivElement;
  readonly taskIcon: HTMLDivElement;
  private readonly titleEl: HTMLDivElement;
  private readonly controller = new AbortController();
  private readonly disposers: Array<() => void> = [];
  minimized = false;
  maximized = false;
  private restoreBox: { left: string; top: string; width: string; height: string } | null = null;

  constructor(
    readonly key: string,
    readonly opts: WindowOptions,
    private readonly manager: WindowManager,
  ) {
    this.titleEl = h('div', { class: 'application_name', text: opts.title });
    const close = h('div', { class: 'close-btn', attrs: { role: 'button', 'aria-label': 'Fermer' } });
    const max = h('div', { class: 'full_screen_btn', attrs: { role: 'button', 'aria-label': 'Agrandir' } });
    const min = h('div', { class: 'minus_button', attrs: { role: 'button', 'aria-label': 'Réduire' } });
    this.body = h('div', { class: 'border-inner-contener' });
    this.el = h(
      'div',
      { class: `new-square${opts.className ? ' ' + opts.className : ''}`, attrs: { role: 'dialog', 'aria-label': opts.title } },
      h('div', { class: 'top_tab' }, close, max, min, this.titleEl),
      this.body,
      isMobile ? null : h('div', { class: 'win-resize', attrs: { 'aria-hidden': 'true' } }),
    );
    this.taskIcon = h('div', { class: 'application', style: { backgroundImage: `url("${opts.icon}")` } });

    const { signal } = this;
    close.addEventListener('click', () => this.close(), { signal });
    max.addEventListener('click', () => this.toggleMaximize(), { signal });
    min.addEventListener('click', () => this.minimize(), { signal });
  }

  get signal(): AbortSignal {
    return this.controller.signal;
  }

  /** Enregistre une fonction de nettoyage (arrêt d'un rendu 3D, d'une vidéo…). */
  onDispose(fn: () => void): void {
    this.disposers.push(fn);
  }

  setTitle(title: string): void {
    this.titleEl.textContent = title;
  }

  focus(): void {
    this.manager.focus(this);
  }

  minimize(): void {
    this.minimized = true;
    this.el.classList.add('is-minimized');
    this.manager.focusTop();
  }

  restore(): void {
    if (this.minimized) {
      this.minimized = false;
      this.el.classList.remove('is-minimized');
    }
    this.focus();
  }

  toggleMaximize(): void {
    const s = this.el.style;
    if (!this.maximized) {
      this.restoreBox = { left: s.left, top: s.top, width: s.width, height: s.height };
      Object.assign(s, { width: '100%', height: '92.5%', top: '3.20vh', left: '0' });
      this.maximized = true;
      this.el.classList.add('is-maximized');
    } else {
      if (this.restoreBox) Object.assign(s, this.restoreBox);
      this.maximized = false;
      this.el.classList.remove('is-maximized');
    }
    this.el.dispatchEvent(new Event('os:resize'));
  }

  close(): void {
    this.manager.close(this);
  }

  /** @internal appelé par le manager */
  dispose(): void {
    for (const fn of this.disposers.splice(0)) {
      try {
        fn();
      } catch (err) {
        console.error(err);
      }
    }
    this.controller.abort();
    this.el.remove();
    this.taskIcon.remove();
  }
}

/** Ouvre, place, déplace, redimensionne et empile les fenêtres dans l'écran. */
export class WindowManager {
  private readonly windows = new Map<string, OSWindow>();
  private cascade = { x: 20, y: 20 };
  private focused: OSWindow | null = null;

  constructor(
    private readonly screen: HTMLElement,
    private readonly taskbar: HTMLElement,
    private readonly cursor: Cursor | null,
  ) {}

  get(key: string): OSWindow | undefined {
    return this.windows.get(key);
  }

  /**
   * Ouvre une fenêtre. Si elle existe déjà, elle est simplement remise devant
   * (`created: false`) — l'ancien site refusait aussi les doublons.
   */
  open(opts: WindowOptions): { win: OSWindow; created: boolean } {
    const existing = this.windows.get(opts.key);
    if (existing) {
      existing.restore();
      return { win: existing, created: false };
    }
    const win = new OSWindow(opts.key, opts, this);
    const s = win.el.style;
    s.position = 'absolute';
    if (isMobile) {
      Object.assign(s, { width: '100%', height: '88%', top: '3.5%', left: '0' });
    } else {
      Object.assign(s, { width: opts.width ?? '50%', height: opts.height ?? '50%' });
      s.left = `${this.cascade.x + 3}vw`;
      s.top = `${this.cascade.y + 3}vh`;
      this.cascade.x += 1;
      this.cascade.y += 2;
      if (this.cascade.x > 28) this.cascade.x = 21;
      if (this.cascade.y > 28) this.cascade.y = 20;
    }
    this.windows.set(opts.key, win);
    this.screen.appendChild(win.el);
    this.taskbar.appendChild(win.taskIcon);
    if (!isMobile) this.keepInside(win.el);
    this.wire(win);
    this.focus(win);
    return { win, created: true };
  }

  focus(win: OSWindow): void {
    for (const w of this.windows.values()) w.el.style.zIndex = '1';
    win.el.style.zIndex = '10';
    this.focused = win;
  }

  /** Remet au premier plan la dernière fenêtre visible (après une réduction). */
  focusTop(): void {
    const visible = [...this.windows.values()].filter((w) => !w.minimized);
    const top = visible[visible.length - 1];
    if (top) this.focus(top);
  }

  close(win: OSWindow): void {
    if (!this.windows.has(win.key)) return;
    this.windows.delete(win.key);
    win.dispose();
    if (this.focused === win) this.focused = null;
    this.cascade = { x: 30, y: 30 };
    this.cursor?.hideLabel();
  }

  /** Une grande fenêtre ne doit pas déborder sous la barre des tâches ni hors de l'écran. */
  private keepInside(el: HTMLElement): void {
    const sr = this.screen.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (!sr.height || !sr.width) return;
    const topMin = sr.height * 0.05;
    if (r.bottom > sr.bottom - sr.height * 0.04) {
      const top = Math.max(topMin, sr.height * 0.96 - r.height);
      el.style.top = `${(top / sr.height) * 100}%`;
    }
    if (r.right > sr.right - sr.width * 0.01) {
      const left = Math.max(sr.width * 0.01, sr.width * 0.99 - r.width);
      el.style.left = `${(left / sr.width) * 100}%`;
    }
  }

  closeAll(): void {
    for (const w of [...this.windows.values()]) this.close(w);
  }

  private wire(win: OSWindow): void {
    const { el, taskIcon, signal } = win;
    const label = win.opts.label ?? win.opts.title.replace(/\.[a-z0-9]+$/i, '');

    el.addEventListener('pointerdown', () => this.focus(win), { signal, capture: true });

    taskIcon.addEventListener(
      'click',
      () => {
        if (win.minimized) win.restore();
        else this.focus(win);
      },
      { signal },
    );
    taskIcon.addEventListener('mouseenter', () => this.cursor?.showLabel(label), { signal });
    taskIcon.addEventListener('mouseleave', () => this.cursor?.hideLabel(), { signal });

    if (isMobile) return;

    // Déplacement : on attrape la barre de titre (elle laisse passer le clic) ou le cadre.
    el.addEventListener(
      'pointerdown',
      (e) => {
        if (e.target !== el || e.button !== 0 || win.maximized) return;
        const r = el.getBoundingClientRect();
        const sr = this.screen.getBoundingClientRect();
        const shiftX = e.clientX - r.left;
        const shiftY = e.clientY - r.top;
        el.setPointerCapture(e.pointerId);
        let raf = 0;
        const move = (ev: PointerEvent) => {
          if (raf) return;
          raf = requestAnimationFrame(() => {
            raf = 0;
            const left = ((ev.clientX - shiftX - sr.left) / sr.width) * 100;
            const top = ((ev.clientY - shiftY - sr.top) / sr.height) * 100;
            el.style.left = `${clamp(left, -80, 95)}%`;
            el.style.top = `${clamp(top, 0, 95)}%`;
          });
        };
        const up = () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerup', up);
          el.removeEventListener('pointercancel', up);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        e.preventDefault();
      },
      { signal },
    );

    // Redimensionnement (coin bas-droit).
    const grip = el.querySelector<HTMLElement>('.win-resize');
    grip?.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0 || win.maximized) return;
        e.stopPropagation();
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const sr = this.screen.getBoundingClientRect();
        grip.setPointerCapture(e.pointerId);
        const move = (ev: PointerEvent) => {
          const w = ((r.width + ev.clientX - e.clientX) / sr.width) * 100;
          const hgt = ((r.height + ev.clientY - e.clientY) / sr.height) * 100;
          el.style.width = `${clamp(w, 18, 100)}%`;
          el.style.height = `${clamp(hgt, 18, 100)}%`;
          el.dispatchEvent(new Event('os:resize'));
        };
        const up = () => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', up);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
      },
      { signal },
    );
  }
}
