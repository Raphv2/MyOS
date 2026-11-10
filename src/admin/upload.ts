import { h } from '../core/dom';
import { nameExtension, type VirtualFS } from '../core/fs';
import { action, getLimits, upload } from './api';

export interface UploadItem {
  file: File | Blob;
  /** Nom final dans la base (ex. `logo.png`, `README.md`). */
  name: string;
  /** Sous-dossiers à créer sous la destination (import d'un dossier de code). */
  dirs: string[];
}

/** Dossiers jamais importés (dépendances, builds, git…). */
const IGNORED_DIRS = new Set(['node_modules', '.git', '.svn', 'dist', 'build', 'out', 'vendor', '.next', '.nuxt', '__pycache__', '.idea', '.vscode', 'coverage', '.cache']);
const MAX_CODE_FILE = 2 * 1024 * 1024;

/** Fichiers choisis avec `webkitdirectory` → items (le dossier racine choisi est retiré). */
export function itemsFromDirectoryInput(files: File[], keepRoot = false): UploadItem[] {
  return files.map((file) => {
    const parts = (file.webkitRelativePath || file.name).split('/').filter(Boolean);
    const name = parts.pop() ?? file.name;
    return { file, name, dirs: keepRoot ? parts : parts.slice(1) };
  });
}

/** Fichiers / dossiers lâchés sur la fenêtre (glisser-déposer), dossiers compris. */
export async function itemsFromDrop(dt: DataTransfer): Promise<UploadItem[]> {
  const out: UploadItem[] = [];
  const entries = [...dt.items].map((i) => i.webkitGetAsEntry?.()).filter((e): e is FileSystemEntry => !!e);
  if (!entries.length) return [...dt.files].map((file) => ({ file, name: file.name, dirs: [] }));

  const walk = async (entry: FileSystemEntry, dirs: string[]): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file, name: file.name, dirs });
    } else if (entry.isDirectory) {
      if (IGNORED_DIRS.has(entry.name)) return;
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const children: FileSystemEntry[] = [];
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        children.push(...batch);
      }
      for (const c of children) await walk(c, [...dirs, entry.name]);
    }
  };
  for (const e of entries) await walk(e, []);
  return out;
}

export interface UploadReport {
  ok: number;
  skipped: string[];
  failed: string[];
}

/** File d'envoi affichée en bas de l'admin : un fichier à la fois, avec progression. */
export class UploadQueue {
  constructor(private readonly el: HTMLElement) {}

  /** Trie ce qui sera envoyé ou ignoré (type non autorisé, trop lourd, dossier ignoré). */
  filter(items: UploadItem[]): { accepted: UploadItem[]; skipped: string[] } {
    const { maxFileMb, extensions } = getLimits() ?? { maxFileMb: 0, extensions: [] };
    const accepted: UploadItem[] = [];
    const skipped: string[] = [];
    for (const it of items) {
      const label = [...it.dirs, it.name].join('/');
      const ext = nameExtension(it.name);
      if (it.dirs.some((d) => IGNORED_DIRS.has(d)) || it.name.startsWith('.')) skipped.push(`${label} (ignoré)`);
      else if (!extensions.includes(ext)) skipped.push(`${label} (type .${ext || '?'} non autorisé)`);
      else if (maxFileMb && it.file.size > maxFileMb * 1048576) skipped.push(`${label} (trop lourd)`);
      else if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'glb', 'mp4', 'webm', 'mp3', 'wav', 'ogg'].includes(ext) && it.file.size > MAX_CODE_FILE)
        skipped.push(`${label} (fichier texte > 2 Mo)`);
      else accepted.push(it);
    }
    return { accepted, skipped };
  }

  async run(items: UploadItem[], targetId: number, fs: VirtualFS): Promise<UploadReport> {
    const { accepted, skipped } = this.filter(items);
    const report: UploadReport = { ok: 0, skipped, failed: [] };
    const folderIds = new Map<string, number>([['', targetId]]);

    const ensureDir = async (dirs: string[]): Promise<number> => {
      let key = '';
      let parent = targetId;
      for (const d of dirs) {
        key = key ? `${key}/${d}` : d;
        let id = folderIds.get(key);
        if (id === undefined) {
          id = fs.subfolders(parent).find((f) => f.name === d)?.id;
          if (id === undefined) id = (await action('createFolder', { name: d, parent_id: parent })).id!;
          folderIds.set(key, id);
        }
        parent = id;
      }
      return parent;
    };

    this.el.hidden = false;
    for (const it of accepted) {
      const label = [...it.dirs, it.name].join('/');
      const bar = h('span', { class: 'admin-progress-bar' });
      const state = h('span', { class: 'admin-progress-state', text: 'en attente' });
      const row = h('div', { class: 'admin-progress' }, h('span', { class: 'admin-progress-name', text: label }), h('span', { class: 'admin-progress-track' }, bar), state);
      this.el.appendChild(row);
      row.scrollIntoView({ block: 'nearest' });
      try {
        const folderId = await ensureDir(it.dirs);
        state.textContent = '0%';
        await upload(it.file, it.name, folderId, (r) => {
          bar.style.width = `${Math.round(r * 100)}%`;
          state.textContent = `${Math.round(r * 100)}%`;
        });
        bar.style.width = '100%';
        state.textContent = 'OK';
        row.classList.add('is-done');
        report.ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        state.textContent = msg;
        row.classList.add('is-error');
        report.failed.push(`${label} : ${msg}`);
      }
    }
    for (const s of skipped) this.el.appendChild(h('div', { class: 'admin-progress is-skipped' }, h('span', { class: 'admin-progress-name', text: s })));
    return report;
  }

  clear(): void {
    this.el.replaceChildren();
    this.el.hidden = true;
  }
}
