import { MAX_RECENTS } from '../config';
import { h, img } from '../core/dom';

export interface RecentItem {
  key: string;
  label: string;
  icon: string;
  open: () => void;
}

/** Fichiers récents du menu Start (6 max, le plus récent en premier, sans doublon). */
export class Recents {
  private items: RecentItem[] = [];
  private container: HTMLElement | null = null;

  add(item: RecentItem): void {
    this.items = [item, ...this.items.filter((i) => i.key !== item.key)].slice(0, MAX_RECENTS);
    this.render();
  }

  /** Attache la liste à un conteneur `.recent_files` (à chaque montage du bureau). */
  bind(container: HTMLElement | null): void {
    this.container = container;
    this.render();
  }

  private render(): void {
    const c = this.container;
    if (!c) return;
    c.replaceChildren(
      ...this.items.map((item) => {
        const el = h(
          'div',
          { class: 'menu_item', title: item.label, attrs: { role: 'button', tabindex: 0 } },
          img(item.icon),
          h('a', { class: 'menu_link', text: item.label }),
        );
        el.addEventListener('click', () => item.open());
        el.addEventListener('keydown', (e) => e.key === 'Enter' && item.open());
        return el;
      }),
    );
  }
}

/** Une seule liste pour toute la session (elle survit au passage écran d'accueil → bureau). */
export const recents = new Recents();
