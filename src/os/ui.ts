import { isMobile } from '../core/device';

/** Date façon barre de l'OS : `10 nove 2026 11:23` (ou juste l'heure sur mobile). */
export function formatClock(now: Date, mobile = isMobile): string {
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (mobile) return time;
  const parts = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).split(' ');
  return `${parts[0] ?? ''} ${(parts[1] ?? '').substring(0, 4)} ${parts[2] ?? ''} ${time}`;
}

/** Met à jour l'horloge chaque seconde. Retourne la fonction d'arrêt. */
export function startClock(el: HTMLElement): () => void {
  const tick = () => (el.textContent = formatClock(new Date()));
  tick();
  const id = window.setInterval(tick, 1000);
  return () => window.clearInterval(id);
}

/**
 * Menu déroulant : clic sur le bouton = ouvre/ferme, clic ailleurs ou sortie
 * de la souris = ferme (même comportement que l'ancien toggleDropdownMenu).
 */
export function dropdown(button: HTMLElement, menu: HTMLElement, signal: AbortSignal): void {
  button.addEventListener(
    'click',
    (e) => {
      if (menu.contains(e.target as Node) && menu !== button) return;
      menu.classList.toggle('show');
      e.stopPropagation();
    },
    { signal },
  );
  menu.addEventListener('click', (e) => e.stopPropagation(), { signal });
  document.addEventListener(
    'click',
    (e) => {
      if (!menu.contains(e.target as Node) && !button.contains(e.target as Node)) menu.classList.remove('show');
    },
    { signal },
  );
  menu.addEventListener('mouseleave', () => menu.classList.remove('show'), { signal });
}

/**
 * Double-clic sur PC, simple tap sur mobile (et pas de zoom au double-tap),
 * comme l'ancien openFiles().
 */
export function onOpen(
  root: HTMLElement,
  selector: string,
  handler: (el: HTMLElement, e: Event) => void,
  signal: AbortSignal,
): void {
  if (isMobile) {
    let last = 0;
    let moved = false;
    root.addEventListener(
      'touchstart',
      (e) => {
        const now = Date.now();
        if (now - last < 300) e.preventDefault();
        last = now;
        moved = false;
      },
      { passive: false, signal },
    );
    root.addEventListener('touchmove', () => (moved = true), { passive: true, signal });
    root.addEventListener(
      'touchend',
      (e) => {
        if (moved) return;
        const el = (e.target as Element | null)?.closest<HTMLElement>(selector);
        if (el && root.contains(el)) handler(el, e);
      },
      { passive: true, signal },
    );
  } else {
    root.addEventListener(
      'dblclick',
      (e) => {
        const el = (e.target as Element | null)?.closest<HTMLElement>(selector);
        if (el && root.contains(el)) handler(el, e);
      },
      { signal },
    );
  }
}
