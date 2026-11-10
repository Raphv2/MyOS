import { h, img } from '../core/dom';
import { ICON } from '../core/icons';
import type { WindowManager } from '../os/window-manager';

let count = 0;

/** Petite boîte d'erreur façon OS rétro. */
export function openError(wm: WindowManager, title: string, message: string): void {
  count++;
  const { win } = wm.open({ key: `error:${count}`, title, icon: ICON.error, width: '30%', height: '24%', className: 'win-error' });
  const ok = h('button', { class: 'os-btn os-btn-wide', text: 'OK', attrs: { type: 'button' } });
  ok.addEventListener('click', () => win.close(), { signal: win.signal });
  win.body.append(
    h('div', { class: 'content error-box' }, img(ICON.error, 'error-icon'), h('p', { text: message }), ok),
  );
  ok.focus();
}
