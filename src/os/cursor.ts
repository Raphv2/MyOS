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
        this.clipToScreen();
      });
    }
  };

  /**
   * Le curseur pixel vit dans l'écran de la TV : il est coupé net au bord de l'écran, comme
   * derrière la vitre. Dehors (cadre, boutons), c'est le curseur normal du système.
   * Les marges peuvent être négatives pour laisser dépasser l'étiquette au-dessus du curseur.
   */
  private clipToScreen(): void {
    const screen = document.querySelector('.screen, .screen_start');
    if (!screen) {
      this.el.style.clipPath = '';
      return;
    }
    const r = screen.getBoundingClientRect();
    const size = this.el.offsetWidth || 32;
    const top = r.top - this.y;
    const left = r.left - this.x;
    const right = this.x + size - r.right;
    const bottom = this.y + size - r.bottom;
    this.el.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px)`;
  }

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
