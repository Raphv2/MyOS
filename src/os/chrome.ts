import { h, img } from '../core/dom';
import { dropdown } from './ui';

/**
 * Languette « Exit FullScreen » sur le bord gauche (visible uniquement en plein écran).
 */
export function fullscreenTab(onExit: () => void, signal: AbortSignal): HTMLDivElement {
  const exit = h('div', { id: 'exit_fullscreen', attrs: { role: 'button', 'aria-label': 'Quitter le plein écran' } });
  const menu = h(
    'div',
    { id: 'exit_menu', class: 'dropdown-content' },
    h('div', { class: 'exit_fullscreen_container' }, exit, h('div', { id: 'exit_fullscreen_name', text: 'Exit FullScreen' })),
  );
  const tab = h('div', { class: 'full_screen', id: 'full_screen_slider' }, menu);
  dropdown(tab, menu, signal);
  exit.addEventListener('click', (e) => {
    e.preventDefault();
    onExit();
  }, { signal });
  return tab;
}

/** Séparateur en relief de la barre du haut. */
export const topSeparator = () => h('div', { class: 'additional-container2' });

export const osLogo = () => {
  const el = img('/img/logo_start_menu_os.png', 'logo-os', 'MyOS');
  el.id = 'logo-os';
  return el;
};

export const clockEl = () => h('div', { class: 'datetime', id: 'datetime', attrs: { 'aria-live': 'off' } });
