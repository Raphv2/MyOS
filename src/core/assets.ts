import { h } from './dom';

/**
 * Icônes à dessiner et à déposer dans img/ (même style que les autres, 49×49).
 * Tant qu'un fichier manque, le site affiche à sa place un carré noir avec son nom :
 * il suffit de déposer le PNG dans img/, il est pris automatiquement.
 */
export const ASSET = {
  video: 'mp4.png',
  code: 'code.png',
  markdown: 'md.png',
  project: 'project.png',
  link: 'link.png',
  file: 'file.png',
  admin: 'admin.png',
  error: 'error.png',
  ide: 'ide.png',
  play: 'play.png',
  pause: 'pause.png',
  sound: 'sound.png',
  mute: 'mute.png',
  fullscreen: 'video_fullscreen.png',
} as const;

export type AssetName = (typeof ASSET)[keyof typeof ASSET];

const EXPECTED = new Set<string>(Object.values(ASSET));

export const assetUrl = (name: AssetName) => `/img/${name}`;

const escapeXml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Carré noir avec le nom du fichier attendu (image SVG en data URI). */
export function placeholderUri(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';
  const size = Math.min(12, 58 / (0.62 * Math.max(base.length, 4)));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<rect width="64" height="64" fill="#000"/>` +
    `<text x="32" y="${ext ? 31 : 36}" fill="#fff" font-family="monospace" font-size="${size.toFixed(1)}" text-anchor="middle">${escapeXml(base)}</text>` +
    (ext ? `<text x="32" y="${31 + size + 2}" fill="#9a9a9a" font-family="monospace" font-size="${Math.min(size, 9).toFixed(1)}" text-anchor="middle">${escapeXml(ext)}</text>` : '') +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Nom d'asset attendu pour une URL `/img/xxx.png`, sinon null. */
function expectedName(url: string): string | null {
  try {
    const { pathname } = new URL(url, location.href);
    if (!pathname.startsWith('/img/')) return null;
    const name = decodeURIComponent(pathname.slice(5));
    return EXPECTED.has(name) ? name : null;
  } catch {
    return null;
  }
}

/**
 * Remplace automatiquement toute image d'asset manquante par son carré noir.
 * Les icônes « en ligne » (boutons du lecteur) deviennent une petite étiquette noire lisible.
 */
export function installAssetFallback(): void {
  document.addEventListener(
    'error',
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLImageElement) || el.dataset.fallback) return;
      const name = expectedName(el.currentSrc || el.src);
      if (!name) return;
      el.dataset.fallback = '1';
      if (el.classList.contains('asset-inline')) {
        el.replaceWith(h('span', { class: 'asset-missing', text: name, title: `À fournir : img/${name}` }));
      } else {
        el.title ||= `À fournir : img/${name}`;
        el.src = placeholderUri(name);
      }
    },
    true,
  );
}

/** Petite icône d'asset pour un bouton (étiquette noire si le fichier manque). */
export function assetIcon(name: AssetName, cls = ''): HTMLImageElement {
  return h('img', { class: `asset-inline ${cls}`.trim(), attrs: { src: assetUrl(name), alt: name, draggable: 'false' } });
}

/** Image de fond (barre des tâches) avec repli sur le carré noir si l'asset manque. */
export function setBackgroundIcon(el: HTMLElement, url: string): void {
  el.style.backgroundImage = `url("${url}")`;
  const name = expectedName(url);
  if (!name) return;
  const probe = new Image();
  probe.onerror = () => (el.style.backgroundImage = `url("${placeholderUri(name)}")`);
  probe.src = url;
}
