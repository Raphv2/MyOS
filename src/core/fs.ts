import type { FileRow, FolderRow, TreeData } from '../types';

/** Application qui ouvre un fichier, déduite de la colonne `extension`. */
export type AppKind =
  | 'image'
  | 'pdf'
  | 'model3d'
  | 'text'
  | 'markdown'
  | 'audio'
  | 'video'
  | 'shader'
  | 'code'
  | 'shortcut'
  | 'project'
  | 'link'
  | 'unknown';

export interface FsFolder {
  kind: 'folder';
  id: number;
  name: string;
  parentId: number | null;
}

export interface FsFile {
  kind: 'file';
  id: number;
  name: string;
  /** Colonne `extension`, en minuscules. */
  ext: string;
  folderId: number | null;
  size: number;
  /** URL publique (dérivée de `path`), ou null si inconnue. */
  url: string | null;
  app: AppKind;
  row: FileRow;
}

export type FsNode = FsFolder | FsFile;

const KINDS: Record<string, AppKind> = {};
const register = (kind: AppKind, exts: string) => exts.split(' ').forEach((e) => (KINDS[e] = kind));
register('image', 'png jpg jpeg gif webp bmp avif');
register('pdf', 'pdf');
register('model3d', 'blend glb gltf');
register('text', 'txt log');
register('markdown', 'md');
register('audio', 'mp3 wav ogg m4a flac');
register('video', 'mp4 webm mov m4v');
register('shader', 'glsl frag vert');
register(
  'code',
  'ts tsx js jsx mjs cjs py php html htm css scss sass less json c h cpp hpp cc cs java kt go rs sql sh bash bat ps1 yml yaml xml lua rb swift vue svelte dart toml ini',
);
register('shortcut', 'shortcut');
register('project', 'project');
register('link', 'github linkedin exe link url');

/** Extensions dont le contenu est du texte qu'on peut afficher dans l'IDE. */
export const TEXT_KINDS: ReadonlySet<AppKind> = new Set(['code', 'text', 'markdown', 'shader']);

/** Extension finale d'un nom de fichier (`RG_cv.pdf` → `pdf`). */
export function nameExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** Nom sans extension (`RG_cv.pdf` → `RG_cv`). */
export function baseName(name: string): string {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
}

export function appKindOf(row: Pick<FileRow, 'name' | 'extension'>): AppKind {
  const ext = (row.extension || '').toLowerCase();
  const byExt = KINDS[ext];
  if (byExt) return byExt;
  // L'admin stocke parfois une extension « métier » (github, linkedin) : on retombe sur le nom.
  return KINDS[nameExtension(row.name)] ?? 'unknown';
}

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');

/**
 * URL publique d'un fichier à partir de la colonne `path`.
 * `domains/raphaelgosset.fr/public_html/img/3d/Blob.glb` → `/img/3d/Blob.glb`.
 * Si `path` est vide, on applique les anciennes conventions du site.
 */
export function resolveUrl(row: Pick<FileRow, 'name' | 'extension' | 'path'>): string | null {
  const path = (row.path ?? '').trim();
  if (/^https?:\/\//i.test(path)) return path;
  if (path) {
    const marker = 'public_html/';
    const i = path.indexOf(marker);
    const rel = i >= 0 ? path.slice(i + marker.length) : path.replace(/^\/+/, '');
    if (rel.startsWith('img/') || i >= 0) return '/' + encodePath(rel);
  }
  const base = baseName(row.name);
  switch ((row.extension || '').toLowerCase()) {
    case 'png':
      return `/img/illustrations/${encodePath(base)}.png`;
    case 'pdf':
      return `/img/pdf/${encodePath(base)}.pdf`;
    case 'blend':
      return `/img/3d/${encodePath(base)}.glb`;
    case 'txt':
      return `/img/txt/${encodePath(base)}.txt`;
    case 'glsl':
      return `/img/shader/${encodePath(base)}.frag`;
    default:
      return null;
  }
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : num(v));

/**
 * Arborescence en mémoire construite à partir des tables `folders` / `files`.
 * Toutes les recherches se font par id (l'ancien code cherchait par nom → collisions).
 */
export class VirtualFS {
  readonly folders = new Map<number, FsFolder>();
  readonly files = new Map<number, FsFile>();
  private readonly childFolders = new Map<number | null, FsFolder[]>();
  private readonly childFiles = new Map<number | null, FsFile[]>();

  constructor(data: TreeData) {
    for (const raw of data.folders) {
      const f: FsFolder = { kind: 'folder', id: num(raw.id), name: String(raw.name), parentId: numOrNull(raw.parent_id) };
      this.folders.set(f.id, f);
      push(this.childFolders, f.parentId, f);
    }
    for (const raw of data.files) {
      const row: FileRow = {
        ...raw,
        id: num(raw.id),
        folder_id: numOrNull(raw.folder_id),
        size: num(raw.size) || 0,
        name: String(raw.name),
        extension: String(raw.extension ?? ''),
      };
      const f: FsFile = {
        kind: 'file',
        id: row.id,
        name: row.name,
        ext: row.extension.toLowerCase(),
        folderId: row.folder_id,
        size: row.size,
        url: resolveUrl(row),
        app: appKindOf(row),
        row,
      };
      this.files.set(f.id, f);
      push(this.childFiles, f.folderId, f);
    }
    // Même ordre que la base (par id), comme l'ancien site.
    for (const list of this.childFolders.values()) list.sort((a, b) => a.id - b.id);
    for (const list of this.childFiles.values()) list.sort((a, b) => a.id - b.id);
  }

  folder(id: number | null | undefined): FsFolder | undefined {
    return id === null || id === undefined ? undefined : this.folders.get(id);
  }

  file(id: number): FsFile | undefined {
    return this.files.get(id);
  }

  subfolders(folderId: number | null): FsFolder[] {
    return this.childFolders.get(folderId) ?? [];
  }

  filesIn(folderId: number | null): FsFile[] {
    return this.childFiles.get(folderId) ?? [];
  }

  /** Premier dossier portant ce nom (même règle que l'ancien `folders.find(f => f.name === …)`). */
  findFolderByName(name: string): FsFolder | undefined {
    let best: FsFolder | undefined;
    for (const f of this.folders.values()) if (f.name === name && (!best || f.id < best.id)) best = f;
    return best;
  }

  /** Dossier pointé par un raccourci / projet (colonne `name` = nom du dossier cible). */
  targetFolder(file: FsFile): FsFolder | undefined {
    return this.findFolderByName(baseName(file.name)) ?? this.findFolderByName(file.name);
  }

  /** Chemin affiché dans la barre d'adresse : `C:/Users/Raphaël Gosset/Documents`. */
  pathOf(folder: FsFolder): string {
    const parts: string[] = [];
    const seen = new Set<number>();
    let cur: FsFolder | undefined = folder;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      parts.unshift(cur.name);
      cur = this.folder(cur.parentId);
    }
    return parts.join('/');
  }

  /** Tous les dossiers descendants (lui compris), en largeur. */
  descendantFolders(rootId: number): FsFolder[] {
    const root = this.folder(rootId);
    if (!root) return [];
    const out: FsFolder[] = [root];
    for (let i = 0; i < out.length; i++) out.push(...this.subfolders(out[i]!.id));
    return out;
  }

  /** Vrai si `folderId` est `ancestorId` ou l'un de ses descendants. */
  isInside(folderId: number | null, ancestorId: number): boolean {
    const seen = new Set<number>();
    let cur = this.folder(folderId);
    while (cur && !seen.has(cur.id)) {
      if (cur.id === ancestorId) return true;
      seen.add(cur.id);
      cur = this.folder(cur.parentId);
    }
    return false;
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
