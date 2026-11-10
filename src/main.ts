import '@fontsource/press-start-2p/400.css';
import '@fontsource/jetbrains-mono/400.css';
import './styles/legacy.css';
import './styles/os.css';

import { getFullscreenPref, isMobile, setFullscreenPref } from './core/device';
import { qs } from './core/dom';
import { Cursor } from './os/cursor';
import { mountDesktop } from './os/desktop';
import { mountOff, mountStart } from './os/screens';

type Page = 'start' | 'accueil' | 'endoflight';

const app = qs('#app');
let current: Page = 'start';
let unmount: (() => void) | null = null;
let fullscreen = getFullscreenPref();

/** Anciennes URLs conservées : `?page=accueil`, `?page=endoflight`. */
function pageFromUrl(): Page {
  const p = new URLSearchParams(location.search).get('page');
  return p === 'accueil' || p === 'endoflight' ? p : 'start';
}

function urlFor(page: Page): string {
  return page === 'start' ? location.pathname : `${location.pathname}?page=${page}`;
}

function applyFullscreen(on: boolean): void {
  fullscreen = on;
  if (!isMobile) setFullscreenPref(on); // sur mobile c'est forcé : on ne le mémorise pas pour le PC
  document.body.classList.toggle('is-fullscreen', on);
  document.body.classList.toggle('is-mobile', isMobile);
  window.dispatchEvent(new Event('myos:layout'));
}

const env = {
  go: (page: Page) => go(page),
  exitFullscreen: () => applyFullscreen(false),
  isFullscreen: () => fullscreen,
};

function go(page: Page, push = true): void {
  unmount?.();
  unmount = null;
  app.replaceChildren();
  current = page;
  Cursor.get()?.setVisible(page !== 'endoflight');
  if (page === 'accueil') unmount = mountDesktop(app, env);
  else if (page === 'endoflight') unmount = mountOff(app, env);
  else unmount = mountStart(app, env);
  if (push && urlFor(page) !== location.pathname + location.search) history.pushState({ page }, '', urlFor(page));
}

// Bouton power : éteint / rallume la TV.
const power = qs('#power_button');
const togglePower = () => go(current === 'endoflight' ? 'start' : 'endoflight');
power.addEventListener('click', togglePower);
power.addEventListener('keydown', (e) => e.key === 'Enter' && togglePower());

// Bouton source (et post-it) : plein écran sans le cadre TV — désormais sans recharger la page.
const source = qs('#source_button');
source.addEventListener('click', () => applyFullscreen(!fullscreen));
source.addEventListener('keydown', (e) => e.key === 'Enter' && applyFullscreen(!fullscreen));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && fullscreen && !isMobile && !document.fullscreenElement) applyFullscreen(false);
});

window.addEventListener('popstate', () => go(pageFromUrl(), false));

applyFullscreen(fullscreen);
go(pageFromUrl(), false);
