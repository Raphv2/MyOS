import { baseName, type FsFile, type FsFolder, type VirtualFS } from '../core/fs';

/*
 * Détection du contenu d'un projet. Module léger (pas de pdf.js / three) :
 * le bureau l'utilise pour afficher le logo du projet comme icône.
 *
 * Convention (aucune modification du schéma) :
 *   - sur le bureau, une ligne `files` avec extension = `project` et name = nom du dossier du projet ;
 *   - dans ce dossier : `logo.png` (icône), `README.md` (présentation), PDF, mp4, images,
 *     et le code (dans un sous-dossier `src`/`code`, ou directement).
 */

const CODE_FOLDER_NAMES = new Set(['src', 'code', 'source', 'sources', 'dev']);

/** Ce qu'on trouve dans le dossier d'un projet (et ses sous-dossiers). */
export interface ProjectContent {
  folder: FsFolder;
  logo: FsFile | null;
  readme: FsFile | null;
  images: FsFile[];
  pdfs: FsFile[];
  videos: FsFile[];
  models: FsFile[];
  codeRoot: FsFolder | null;
  codeCount: number;
}

export function scanProject(fs: VirtualFS, folder: FsFolder): ProjectContent {
  const folders = fs.descendantFolders(folder.id);
  const files = folders.flatMap((f) => fs.filesIn(f.id));
  const isLogo = (f: FsFile) => f.app === 'image' && baseName(f.name).toLowerCase() === 'logo';
  const logo = fs.filesIn(folder.id).find(isLogo) ?? files.find(isLogo) ?? null;
  const mds = files.filter((f) => f.app === 'markdown');
  const readme = mds.find((f) => /^readme$/i.test(baseName(f.name))) ?? mds[0] ?? null;
  const code = files.filter((f) => f.app === 'code' || f.app === 'shader');
  const codeFolder = fs.subfolders(folder.id).find((f) => CODE_FOLDER_NAMES.has(f.name.toLowerCase())) ?? null;
  return {
    folder,
    logo,
    readme,
    images: files.filter((f) => f.app === 'image' && f !== logo),
    pdfs: files.filter((f) => f.app === 'pdf'),
    videos: files.filter((f) => f.app === 'video'),
    models: files.filter((f) => f.app === 'model3d'),
    codeRoot: codeFolder ?? (code.length ? folder : null),
    codeCount: code.length,
  };
}

/** Logo d'un projet (pour l'icône du bureau). */
export function projectLogoUrl(fs: VirtualFS, entry: FsFile): string | null {
  const folder = fs.targetFolder(entry);
  if (!folder) return null;
  return scanProject(fs, folder).logo?.url ?? null;
}
