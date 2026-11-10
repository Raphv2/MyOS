import { launch } from '../apps/launcher';
import { openError } from '../apps/error';
import { openExplorer } from '../apps/explorer';
import { runLink } from '../apps/link';
import { projectLogoUrl } from '../apps/project-scan';
import { LINKS, OWNER } from '../config';
import { fetchTree } from '../core/api';
import { gridConfig, isMobile } from '../core/device';
import { delay, h, img } from '../core/dom';
import { VirtualFS } from '../core/fs';
import { ICON } from '../core/icons';
import { clockEl, fullscreenTab, osLogo, topSeparator } from './chrome';
import type { Os } from './context';
import { Cursor } from './cursor';
import { DesktopIcons } from './desktop-icons';
import { recents } from './recents';
import type { ScreenEnv } from './screens';
import { dropdown, startClock } from './ui';
import { bioParagraph, contactWidget, eyeWidget, profileWidget } from './widgets';
import { WindowManager } from './window-manager';

export interface DesktopEnv extends ScreenEnv {
  isFullscreen(): boolean;
}

/** Le bureau MyOS (ancienne vue `vueAccueil`). */
export function mountDesktop(root: HTMLElement, env: DesktopEnv): () => void {
  const ctrl = new AbortController();
  const { signal } = ctrl;
  const cursor = Cursor.get();

  // --- Barre des tâches (en bas, apparaît au survol)
  const homeIcon = h('div', { id: 'id_Home_icon', class: 'application', attrs: { role: 'button', 'aria-label': 'Home' } });
  const taskbar = h(
    'div',
    { class: 'rectangular-bar' },
    homeIcon,
    h('div', { class: 'additional-container bar-sep-1' }),
    h('div', { class: 'additional-container bar-sep-2' }),
  );

  // --- Barre du haut : logo, Start, profil, horloge
  const startMenu = h(
    'div',
    { id: 'start_menu', class: 'dropdown-content' },
    h('div', { class: 'recent_files' }),
    h('div', { id: 'admin_button', class: 'start-admin', title: 'Admin', attrs: { role: 'button', tabindex: 0 } }, img(ICON.admin, '', 'Admin')),
    h('div', { id: 'shutdown', title: 'Éteindre', attrs: { role: 'button', tabindex: 0 } }, img('/img/shutdown.png', '', 'Éteindre')),
  );
  const startBtn = h(
    'div',
    { class: 'name_container', id: 'name_container_button2' },
    h('div', { class: 'name', text: 'Start' }),
    h('div', { class: 'arrow_slide' }),
    startMenu,
  );
  const profileMenu = h(
    'div',
    { class: 'dropdown_menu', id: 'raph_dropdown' },
    h('div', { class: 'profile_image_dropdown' }),
    h('p', { class: 'raph_name', text: OWNER.name }),
    bioParagraph(),
  );
  const profileBtn = h(
    'div',
    { class: 'name_container', id: 'name_container_button' },
    h('div', { class: 'name', text: OWNER.name }),
    h('div', { class: 'arrow_slide' }),
    profileMenu,
  );
  const clock = clockEl();
  const topBar = h('div', { class: 'rectangular-bar-top' }, osLogo(), topSeparator(), profileBtn, startBtn, clock);

  const screen = h('div', { class: 'screen' });
  const wm = new WindowManager(screen, taskbar, cursor);

  // --- L'objet « OS » donné aux applications
  let fs = new VirtualFS({ folders: [], files: [] });
  const treeListeners = new Set<() => void>();
  const os: Os = {
    get fs() {
      return fs;
    },
    wm,
    screen,
    recents,
    mobile: isMobile,
    launch: (file) => launch(os, file),
    openFolder: (folder, key) => openExplorer(os, folder, key),
    openError: (title, message) => openError(wm, title, message),
    reloadTree: async () => {
      fs = new VirtualFS(await fetchTree());
      icons.render();
      treeListeners.forEach((fn) => fn());
    },
    onTreeChange: (fn, sig) => {
      treeListeners.add(fn);
      sig?.addEventListener('abort', () => treeListeners.delete(fn));
    },
    projectLogo: (file) => (file.app === 'project' ? projectLogoUrl(fs, file) : null),
  };

  const contact = () => {
    const l = LINKS.spirale!;
    runLink(os, 'link:spirale', 'Spirale.exe', '/img/spirale.png', isMobile && l.mobileUrl ? l.mobileUrl : l.url, 'spirale');
  };

  screen.append(
    fullscreenTab(env.exitFullscreen, signal),
    eyeWidget(signal),
    profileWidget(),
    contactWidget(contact, signal),
    taskbar,
    topBar,
  );
  root.appendChild(screen);

  const icons = new DesktopIcons(os, screen, () => gridConfig(env.isFullscreen()), signal);

  // --- Interactions de la barre du haut
  dropdown(profileBtn, profileMenu, signal);
  dropdown(startBtn, startMenu, signal);
  recents.bind(startMenu.querySelector('.recent_files'));
  const shutdown = startMenu.querySelector<HTMLElement>('#shutdown')!;
  shutdown.addEventListener('click', () => env.go('endoflight'), { signal });
  const adminBtn = startMenu.querySelector<HTMLElement>('#admin_button')!;
  const openAdmin = () => {
    startMenu.classList.remove('show');
    import('../admin/admin')
      .then((m) => m.openAdmin(os))
      .catch((err: unknown) => {
        console.error(err);
        os.openError('error', "Impossible de charger l'admin.");
      });
  };
  adminBtn.addEventListener('click', openAdmin, { signal });
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') openAdmin();
  }, { signal });

  // Icône « Home » de la barre des tâches : explorateur sur le dossier Home.
  homeIcon.addEventListener('click', () => {
    const home = fs.findFolderByName('Home');
    if (home) os.openFolder(home, 'explorer:Home');
  }, { signal });
  homeIcon.addEventListener('mouseenter', () => cursor?.showLabel('Home'), { signal });
  homeIcon.addEventListener('mouseleave', () => cursor?.hideLabel(), { signal });

  window.addEventListener('myos:layout', () => icons.relayout(), { signal });

  const stopClock = startClock(clock);

  // Comme avant : les icônes apparaissent ~1 s après le bureau (le temps des fondus).
  void Promise.all([fetchTree(), delay(1000)])
    .then(([data]) => {
      if (signal.aborted) return;
      fs = new VirtualFS(data);
      icons.render();
      treeListeners.forEach((fn) => fn());
    })
    .catch((err: unknown) => {
      console.error(err);
      if (!signal.aborted) os.openError('error', 'Impossible de charger le bureau. Réessaie dans un instant.');
    });

  return () => {
    stopClock();
    wm.closeAll();
    recents.bind(null);
    ctrl.abort();
  };
}
