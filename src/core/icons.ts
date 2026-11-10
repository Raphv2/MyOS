import type { FsFile, FsFolder } from './fs';

/** Icônes pixel-art d'origine présentes dans /img (49×49). */
const LEGACY_FILE_ICONS = new Set(['blend', 'github', 'glsl', 'linkedin', 'mp3', 'pdf', 'png', 'txt', 'shortcut']);
/** Dossiers qui ont leur propre icône (img/Documents.png, …). */
const SPECIAL_FOLDERS = new Set(['Documents', 'Home', 'Bin', 'Downloads', 'Images', 'Musics', 'Desktop']);

export const ICON = {
  directory: '/img/directory.png',
  shortcut: '/img/shortcut.png',
  video: '/os-icons/video.svg',
  code: '/os-icons/code.svg',
  markdown: '/os-icons/markdown.svg',
  project: '/os-icons/project.svg',
  link: '/os-icons/link.svg',
  file: '/os-icons/file.svg',
  admin: '/os-icons/admin.svg',
  error: '/os-icons/error.svg',
  ide: '/os-icons/ide.svg',
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
