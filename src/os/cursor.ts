import { isMobile } from '../core/device';
import { h } from '../core/dom';

/**
 * Curseur pixel (img/Cursor101.png) avec l'étiquette qui affiche le nom
 * de l'application survolée dans la barre des tâches.
 */
export class Cursor {
  private readonly el: HTMLDivElement;
  private readonly labelBox: HTMLDivElement;
  private readonly label: HTMLDivElement;
  private raf = 0;
  private x = -100;
  private y = -100;

  private constructor() {
    this.label = h('div', { class: 'view_name' });
    this.labelBox = h('div', { class: 'view_name_container', style: { display: 'none' } }, this.label);
    this.el = h('div', { class: 'custom_cursor', attrs: { 'aria-hidden': 'true' } }, this.labelBox);
    document.body.appendChild(this.el);
    document.addEventListener('pointermove', this.onMove, { passive: true });
  }

  private static instance: Cursor | null = null;

  /** Pas de curseur custom sur mobile (comme avant). */
  static get(): Cursor | null {
    if (isMobile) return null;
    return (Cursor.instance ??= new Cursor());
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    this.x = e.clientX;
    this.y = e.clientY;
    if (!this.raf) {
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.el.style.transform = `translate(${this.x}px, ${this.y}px)`;
      });
    }
  };

  setVisible(visible: boolean): void {
    this.el.style.display = visible ? '' : 'none';
  }

  showLabel(text: string): void {
    this.label.textContent = text;
    this.labelBox.style.display = 'inline-flex';
  }

  hideLabel(): void {
    this.label.textContent = '';
    this.labelBox.style.display = 'none';
  }
}
