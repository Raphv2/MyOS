import { ASSET, assetUrl } from './assets';
import type { FsFile, FsFolder } from './fs';

/** Icônes pixel-art d'origine présentes dans /img (49×49). */
const LEGACY_FILE_ICONS = new Set(['blend', 'github', 'glsl', 'linkedin', 'mp3', 'pdf', 'png', 'txt', 'shortcut']);
/** Dossiers qui ont leur propre icône (img/Documents.png, …). */
const SPECIAL_FOLDERS = new Set(['Documents', 'Home', 'Bin', 'Downloads', 'Images', 'Musics', 'Desktop']);

/**
 * Icônes du site. Celles qui n'existent pas encore dans img/ s'affichent en carré noir
 * avec le nom du fichier à fournir (voir core/assets.ts).
 */
export const ICON = {
  directory: '/img/directory.png',
  shortcut: '/img/shortcut.png',
  video: assetUrl(ASSET.video),
  code: assetUrl(ASSET.code),
  markdown: assetUrl(ASSET.markdown),
  project: assetUrl(ASSET.project),
  link: assetUrl(ASSET.link),
  file: assetUrl(ASSET.file),
  admin: assetUrl(ASSET.admin),
  error: assetUrl(ASSET.error),
  ide: assetUrl(ASSET.ide),
} as const;

export function folderIcon(folder: Pick<FsFolder, 'name'>): string {
  return SPECIAL_FOLDERS.has(folder.name) ? `/img/${folder.name}.png` : ICON.directory;
}

/**
 * Icône d'un fichier. `onDesktop` : sur le bureau, un raccourci a l'icône dossier
 * (comportement de l'ancien desktopHandler), dans l'explorateur il a l'icône raccourci.
 * `projectLogo` : logo du projet s'il existe.
 */
export function fileIcon(file: FsFile, opts: { onDesktop?: boolean; projectLogo?: string | null } = {}): string {
  if (file.app === 'shortcut') return opts.onDesktop ? ICON.directory : ICON.shortcut;
  if (file.app === 'project') return opts.projectLogo ?? ICON.project;
  if (LEGACY_FILE_ICONS.has(file.ext)) return `/img/${file.ext}.png`;
  switch (file.app) {
    case 'image':
      return '/img/png.png';
    case 'model3d':
      return '/img/blend.png';
    case 'text':
      return '/img/txt.png';
    case 'audio':
      return '/img/mp3.png';
    case 'shader':
      return '/img/glsl.png';
    case 'video':
      return ICON.video;
    case 'code':
      return ICON.code;
    case 'markdown':
      return ICON.markdown;
    case 'link':
      return ICON.link;
    default:
      return ICON.file;
  }
}
