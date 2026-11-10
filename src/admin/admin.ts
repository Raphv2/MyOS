import { DESKTOP_FOLDER_ID } from '../config';
import { formatSize, h, img } from '../core/dom';
import { nameExtension, type FsFile, type FsFolder } from '../core/fs';
import { fileIcon, folderIcon, ICON } from '../core/icons';
import type { Os } from '../os/context';
import type { OSWindow } from '../os/window-manager';
import { action, ApiError, getLimits, isProtected, login, logout, status } from './api';
import { confirmBox, dialog } from './dialog';
import { itemsFromDirectoryInput, itemsFromDrop, UploadQueue, type UploadItem } from './upload';

/** Point d'entrée : connexion si besoin, puis le gestionnaire. */
export async function openAdmin(os: Os): Promise<void> {
  const existing = os.wm.get('admin');
  if (existing) return existing.restore();
  try {
    const s = await status();
    if (s.authenticated) openPanel(os);
    else openLogin(os, s.configured);
  } catch (err) {
    console.error(err);
    os.openError('Admin', "L'API admin ne répond pas (le site tourne-t-il bien sur le serveur PHP ?).");
  }
}

function openLogin(os: Os, configured: boolean): void {
  const { win, created } = os.wm.open({ key: 'admin-login', title: 'Admin.exe — connexion', icon: ICON.admin, label: 'Admin', width: '30%', height: '40%', className: 'win-admin-login' });
  if (!created) return;

  if (!configured) {
    win.body.append(
      h(
        'div',
        { class: 'content admin-login' },
        img(ICON.admin, 'admin-login-icon'),
        h('p', { text: "L'admin n'est pas encore configuré sur ce serveur." }),
        h('p', { class: 'admin-note', text: 'Lance « npm run admin:password » et colle la ligne ADMIN_PASSWORD_HASH dans le fichier .env du serveur.' }),
      ),
    );
    return;
  }

  const input = h('input', { attrs: { type: 'password', autocomplete: 'current-password', 'aria-label': 'Mot de passe', placeholder: 'mot de passe', maxlength: 1024 } });
  const error = h('p', { class: 'admin-login-error', attrs: { role: 'alert' } });
  const submit = h('button', { class: 'os-btn os-btn-wide os-btn-primary', text: 'Connexion', attrs: { type: 'submit' } });
  const form = h(
    'form',
    { class: 'content admin-login' },
    img(ICON.admin, 'admin-login-icon'),
    h('p', { class: 'admin-login-title', text: 'ADMIN' }),
    input,
    submit,
    error,
  );
  win.body.append(form);
  input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!input.value) return;
    submit.disabled = true;
    error.textContent = '';
    try {
      await login(input.value);
      input.value = '';
      win.close();
      openPanel(os);
    } catch (err) {
      error.textContent = err instanceof ApiError ? err.message : 'Connexion impossible';
      input.select();
      win.el.classList.remove('shake');
      void win.el.offsetWidth;
      win.el.classList.add('shake');
    } finally {
      submit.disabled = false;
    }
  }, { signal: win.signal });
}

type Selection = { kind: 'folder'; item: FsFolder } | { kind: 'file'; item: FsFile } | null;

function openPanel(os: Os): void {
  const { win, created } = os.wm.open({ key: 'admin', title: 'Admin.exe', icon: ICON.admin, label: 'Admin', width: '72%', height: '78%', className: 'win-admin' });
  if (!created) return;
  new AdminPanel(os, win);
}

class AdminPanel {
  private currentId: number = DESKTOP_FOLDER_ID;
  private selection: Selection = null;
  private readonly expanded = new Set<number>([1, 2, 3]);
  private busy = false;

  private readonly root: HTMLDivElement;
  private readonly tree = h('div', { class: 'admin-tree', attrs: { role: 'tree' } });
  private readonly pathEl = h('div', { class: 'search_bar_text' });
  private readonly table = h('div', { class: 'admin-table', attrs: { role: 'grid' } });
  private readonly statusEl = h('div', { class: 'admin-status' });
  private readonly queueEl = h('div', { class: 'admin-queue', attrs: { hidden: true } });
  private readonly queue = new UploadQueue(this.queueEl);
  private readonly drop = h('div', { class: 'admin-drop', text: 'Dépose tes fichiers ou dossiers ici' });
  private readonly selButtons: HTMLButtonElement[] = [];

  constructor(
    private readonly os: Os,
    private readonly win: OSWindow,
  ) {
    const btn = (label: string, fn: () => void, opts: { needsSel?: boolean; cls?: string; title?: string } = {}) => {
      const b = h('button', { class: `os-btn os-btn-wide admin-btn ${opts.cls ?? ''}`, text: label, title: opts.title ?? label, attrs: { type: 'button' } });
      b.addEventListener('click', () => void this.guard(fn), { signal: win.signal });
      if (opts.needsSel) this.selButtons.push(b);
      return b;
    };

    const toolbar = h(
      'div',
      { class: 'admin-toolbar' },
      btn('+ Dossier', () => this.newFolder()),
      btn('⇪ Fichiers', () => this.pickFiles(false), { title: 'Importer des fichiers' }),
      btn('⇪ Dossier', () => this.pickFiles(true), { title: 'Importer un dossier (code…)' }),
      btn('★ Projet', () => this.newProject(), { cls: 'os-btn-primary', title: 'Nouveau projet sur le bureau' }),
      btn('↗ Raccourci', () => this.newShortcut()),
      btn('⌁ Lien', () => this.newLink()),
      h('span', { class: 'admin-toolbar-sep' }),
      btn('Ouvrir', () => this.openSelected(), { needsSel: true }),
      btn('Renommer', () => this.rename(), { needsSel: true }),
      btn('Déplacer', () => this.move(), { needsSel: true }),
      btn('Supprimer', () => this.remove(), { needsSel: true, cls: 'os-btn-danger' }),
      h('span', { class: 'admin-toolbar-grow' }),
      btn('⟳', () => this.refresh(), { title: 'Actualiser' }),
      btn('Déconnexion', () => this.signOut()),
    );

    const main = h(
      'div',
      { class: 'admin-main' },
      h('div', { class: 'admin-pathbar' }, h('div', { class: 'search_bar' }, this.pathEl)),
      h(
        'div',
        { class: 'admin-head' },
        h('span', { text: 'Nom' }),
        h('span', { text: 'Type' }),
        h('span', { text: 'Taille' }),
        h('span', { text: 'Modifié' }),
      ),
      this.table,
      this.drop,
    );
    this.root = h('div', { class: 'content admin' }, toolbar, h('div', { class: 'admin-body' }, this.tree, main), this.queueEl, this.statusEl);
    win.body.append(this.root);

    this.wire(main);
    os.onTreeChange(() => this.render(), win.signal);
    this.render();
  }

  /** Empêche deux actions en même temps et affiche les erreurs proprement. */
  private async guard(fn: () => unknown): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.root.classList.add('is-busy');
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof ApiError && err.status === 401) {
        this.win.close();
        openLogin(this.os, true);
        return;
      }
      await confirmBox(this.root, this.os.fs, 'Erreur', msg);
    } finally {
      this.busy = false;
      this.root.classList.remove('is-busy');
    }
  }

  private wire(main: HTMLElement): void {
    const { signal } = this.win;
    this.tree.addEventListener('click', (e) => {
      const node = (e.target as Element).closest<HTMLElement>('.admin-node');
      if (!node) return;
      const id = Number(node.dataset.id);
      if ((e.target as Element).closest('.admin-twisty')) {
        if (this.expanded.has(id)) this.expanded.delete(id);
        else this.expanded.add(id);
        this.renderTree();
        return;
      }
      this.go(id);
    }, { signal });

    this.table.addEventListener('click', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('.admin-row');
      this.select(row ? this.rowSelection(row) : null);
    }, { signal });
    this.table.addEventListener('dblclick', (e) => {
      const row = (e.target as Element).closest<HTMLElement>('.admin-row');
      const sel = row && this.rowSelection(row);
      if (sel?.kind === 'folder') this.go(sel.item.id);
      else if (sel?.kind === 'file') this.os.launch(sel.item);
    }, { signal });
    this.root.addEventListener('keydown', (e) => {
      if ((e.target as Element).closest('input, textarea, select')) return;
      if (e.key === 'Delete' && this.selection) void this.guard(() => this.remove());
      if (e.key === 'F2' && this.selection) void this.guard(() => this.rename());
      if (e.key === 'Backspace') {
        const parent = this.os.fs.folder(this.os.fs.folder(this.currentId)?.parentId);
        if (parent) this.go(parent.id);
      }
    }, { signal });

    // Glisser-déposer de fichiers / dossiers depuis l'ordinateur.
    let depth = 0;
    main.addEventListener('dragenter', (e) => {
      if (!e.dataTransfer?.types.includes('Files')) return;
      depth++;
      main.classList.add('is-dropping');
    }, { signal });
    main.addEventListener('dragleave', () => {
      if (--depth <= 0) main.classList.remove('is-dropping');
    }, { signal });
    main.addEventListener('dragover', (e) => e.preventDefault(), { signal });
    main.addEventListener('drop', (e) => {
      e.preventDefault();
      depth = 0;
      main.classList.remove('is-dropping');
      const dt = e.dataTransfer;
      if (!dt) return;
      void this.guard(async () => this.sendItems(await itemsFromDrop(dt), this.currentId));
    }, { signal });
  }

  private rowSelection(row: HTMLElement): Selection {
    const id = Number(row.dataset.id);
    if (row.dataset.kind === 'folder') {
      const item = this.os.fs.folder(id);
      return item ? { kind: 'folder', item } : null;
    }
    const item = this.os.fs.file(id);
    return item ? { kind: 'file', item } : null;
  }

  private go(id: number): void {
    this.currentId = id;
    this.selection = null;
    let cur = this.os.fs.folder(id);
    while (cur) {
      this.expanded.add(cur.id);
      cur = this.os.fs.folder(cur.parentId);
    }
    this.render();
  }

  private select(sel: Selection): void {
    this.selection = sel;
    this.table.querySelectorAll('.admin-row').forEach((r) => {
      const el = r as HTMLElement;
      el.classList.toggle('is-selected', !!sel && el.dataset.kind === sel.kind && Number(el.dataset.id) === sel.item.id);
    });
    const locked = sel?.kind === 'folder' && isProtected(sel.item.id);
    this.selButtons.forEach((b) => (b.disabled = !sel || (locked && b.textContent !== 'Ouvrir')));
  }

  private render(): void {
    const fs = this.os.fs;
    if (!fs.folder(this.currentId)) this.currentId = DESKTOP_FOLDER_ID;
    const folder = fs.folder(this.currentId);
    this.pathEl.textContent = folder ? fs.pathOf(folder) : '';
    this.renderTree();

    const subs = fs.subfolders(this.currentId);
    const files = fs.filesIn(this.currentId);
    const date = (s: string | null) => (s ? new Date(s.replace(' ', 'T')).toLocaleDateString('fr-FR') : '—');
    const row = (kind: 'folder' | 'file', id: number, icon: string, name: string, type: string, size: string, when: string, locked = false) =>
      h(
        'div',
        { class: `admin-row${locked ? ' is-locked' : ''}`, dataset: { kind, id }, attrs: { role: 'row', tabindex: 0 } },
        h('span', { class: 'admin-cell-name' }, img(icon, 'admin-icon'), h('span', { text: name }), locked ? h('span', { class: 'admin-lock', text: '🔒', title: 'Dossier système' }) : null),
        h('span', { text: type }),
        h('span', { text: size }),
        h('span', { text: when }),
      );
    this.table.replaceChildren(
      ...subs.map((f) => row('folder', f.id, folderIcon(f), f.name, 'dossier', '—', '—', isProtected(f.id))),
      ...files.map((f) => row('file', f.id, fileIcon(f, { projectLogo: this.os.projectLogo(f) }), f.name, f.ext || nameExtension(f.name), formatSize(f.size), date(f.row.updated_at))),
    );
    if (!subs.length && !files.length) this.table.appendChild(h('p', { class: 'admin-empty', text: 'Dossier vide — glisse des fichiers ici.' }));
    this.select(null);

    const limits = getLimits();
    this.statusEl.textContent = `Connecté · ${fs.folders.size} dossiers · ${fs.files.size} fichiers · ${subs.length + files.length} élément(s) ici${limits?.maxFileMb ? ` · ${limits.maxFileMb} Mo max par fichier` : ''}`;
  }

  private renderTree(): void {
    const fs = this.os.fs;
    const out: HTMLElement[] = [];
    const walk = (parentId: number | null, depth: number) => {
      for (const f of fs.subfolders(parentId)) {
        const hasKids = fs.subfolders(f.id).length > 0;
        const open = this.expanded.has(f.id);
        out.push(
          h(
            'div',
            { class: `admin-node${f.id === this.currentId ? ' is-current' : ''}`, dataset: { id: f.id }, attrs: { role: 'treeitem', 'aria-expanded': hasKids ? open : false } },
            h('span', { style: { width: `${depth * 10}px` }, class: 'admin-indent' }),
            h('span', { class: 'admin-twisty', text: hasKids ? (open ? '▾' : '▸') : '' }),
            img(folderIcon(f), 'admin-icon'),
            h('span', { class: 'admin-node-name', text: f.name }),
          ),
        );
        if (hasKids && open) walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    this.tree.replaceChildren(...out);
  }

  private async refresh(): Promise<void> {
    await this.os.reloadTree();
  }

  // ---------- Actions ----------

  private async newFolder(): Promise<void> {
    const v = await dialog(this.root, this.os.fs, {
      title: 'Nouveau dossier',
      fields: [{ kind: 'text', name: 'name', label: 'Nom', required: true }],
      confirm: 'Créer',
    });
    if (!v) return;
    await action('createFolder', { name: v.name, parent_id: this.currentId });
    await this.refresh();
  }

  private pickFiles(directory: boolean): void {
    const input = h('input', { attrs: { type: 'file', multiple: true } });
    if (directory) input.setAttribute('webkitdirectory', '');
    input.addEventListener('change', () => {
      const files = [...(input.files ?? [])];
      if (!files.length) return;
      const items: UploadItem[] = directory ? itemsFromDirectoryInput(files, true) : files.map((file) => ({ file, name: file.name, dirs: [] }));
      void this.guard(() => this.sendItems(items, this.currentId));
    });
    input.click();
  }

  private async sendItems(items: UploadItem[], folderId: number): Promise<void> {
    if (!items.length) return;
    this.queue.clear();
    const report = await this.queue.run(items, folderId, this.os.fs);
    await this.refresh();
    if (report.failed.length || report.skipped.length) {
      await confirmBox(
        this.root,
        this.os.fs,
        'Import terminé',
        `${report.ok} fichier(s) envoyé(s).${report.skipped.length ? ` ${report.skipped.length} ignoré(s).` : ''}${report.failed.length ? `\nÉchecs :\n${report.failed.slice(0, 8).join('\n')}` : ''}`,
      );
    } else {
      window.setTimeout(() => this.queue.clear(), 2500);
    }
  }

  /** Assistant « Nouveau projet » : dossier + logo + README + médias + code + icône sur le bureau. */
  private async newProject(): Promise<void> {
    const fs = this.os.fs;
    const defaultParent = fs.findFolderByName('dev')?.id ?? fs.findFolderByName('Documents')?.id ?? this.currentId;
    const v = await dialog(this.root, fs, {
      title: 'Nouveau projet',
      fields: [
        { kind: 'text', name: 'name', label: 'Nom du projet', required: true, placeholder: 'MoLeCuLe' },
        { kind: 'folder', name: 'parent', label: 'Ranger dans', value: defaultParent },
        { kind: 'file', name: 'logo', label: 'Logo (icône du bureau)', accept: 'image/png,image/jpeg,image/gif,image/webp' },
        { kind: 'textarea', name: 'readme', label: 'Description (Markdown)', placeholder: '# Mon projet\n\nCe que fait le projet, la stack, des captures…' },
        { kind: 'file', name: 'pdfs', label: 'Présentation (PDF)', accept: 'application/pdf', multiple: true },
        { kind: 'file', name: 'media', label: 'Images / vidéos (png, jpg, mp4…)', accept: 'image/*,video/mp4,video/webm', multiple: true },
        { kind: 'file', name: 'code', label: 'Code source (un dossier)', directory: true },
        { kind: 'check', name: 'desktop', label: 'Afficher le projet sur le bureau', value: true },
        { kind: 'note', text: 'node_modules, .git, dist… sont ignorés automatiquement.' },
      ],
      confirm: 'Créer le projet',
    });
    if (!v) return;
    const name = String(v.name);
    const parent = Number(v.parent);
    const created = await action('createFolder', { name, parent_id: parent });
    const projectId = created.id!;

    const items: UploadItem[] = [];
    const logo = (v.logo as File[])[0];
    if (logo) items.push({ file: logo, name: `logo.${nameExtension(logo.name) || 'png'}`, dirs: [] });
    const readme = String(v.readme ?? '');
    if (readme) items.push({ file: new Blob([readme], { type: 'text/markdown' }), name: 'README.md', dirs: [] });
    for (const f of v.pdfs as File[]) items.push({ file: f, name: f.name, dirs: [] });
    for (const f of v.media as File[]) items.push({ file: f, name: f.name, dirs: [] });
    items.push(...itemsFromDirectoryInput(v.code as File[]).map((it) => ({ ...it, dirs: ['src', ...it.dirs] })));

    await this.os.reloadTree();
    if (items.length) await this.sendItems(items, projectId);
    if (v.desktop) await action('createEntry', { kind: 'project', name, folder_id: DESKTOP_FOLDER_ID });
    await this.refresh();
    this.go(projectId);
  }

  private async newShortcut(): Promise<void> {
    const v = await dialog(this.root, this.os.fs, {
      title: 'Nouveau raccourci',
      fields: [
        { kind: 'folder', name: 'target', label: 'Dossier à ouvrir', value: this.currentId },
        { kind: 'folder', name: 'where', label: 'Placer le raccourci dans', value: DESKTOP_FOLDER_ID },
      ],
      confirm: 'Créer',
    });
    if (!v) return;
    const target = this.os.fs.folder(Number(v.target));
    if (!target) return;
    await action('createEntry', { kind: 'shortcut', name: target.name, folder_id: Number(v.where) });
    await this.refresh();
  }

  private async newLink(): Promise<void> {
    const v = await dialog(this.root, this.os.fs, {
      title: 'Nouveau lien (.exe)',
      fields: [
        { kind: 'text', name: 'name', label: 'Nom', required: true, placeholder: 'Behance' },
        { kind: 'text', name: 'url', label: 'Adresse', required: true, placeholder: 'https://…' },
        { kind: 'folder', name: 'where', label: 'Placer dans', value: this.currentId },
      ],
      confirm: 'Créer',
    });
    if (!v) return;
    await action('createEntry', { kind: 'link', name: v.name, url: v.url, folder_id: Number(v.where) });
    await this.refresh();
  }

  private openSelected(): void {
    const sel = this.selection;
    if (sel?.kind === 'folder') this.go(sel.item.id);
    else if (sel?.kind === 'file') this.os.launch(sel.item);
  }

  private async rename(): Promise<void> {
    const sel = this.selection;
    if (!sel) return;
    const fields: Parameters<typeof dialog>[2]['fields'] = [{ kind: 'text', name: 'name', label: 'Nouveau nom', value: sel.item.name, required: true }];
    if (sel.kind === 'folder') fields.push({ kind: 'check', name: 'shortcuts', label: 'Mettre à jour les raccourcis / projets qui pointent vers ce dossier', value: true });
    const v = await dialog(this.root, this.os.fs, { title: 'Renommer', fields, confirm: 'Renommer' });
    if (!v || v.name === sel.item.name) return;
    if (sel.kind === 'folder') await action('renameFolder', { id: sel.item.id, name: v.name, updateShortcuts: !!v.shortcuts });
    else await action('updateFile', { id: sel.item.id, name: v.name });
    await this.refresh();
  }

  private async move(): Promise<void> {
    const sel = this.selection;
    if (!sel) return;
    const fs = this.os.fs;
    const v = await dialog(this.root, fs, {
      title: `Déplacer « ${sel.item.name} »`,
      fields: [
        {
          kind: 'folder',
          name: 'dest',
          label: 'Vers',
          value: sel.kind === 'folder' ? (sel.item.parentId ?? undefined) : (sel.item.folderId ?? undefined),
          exclude: sel.kind === 'folder' ? (id) => fs.isInside(id, sel.item.id) : undefined,
        },
      ],
      confirm: 'Déplacer',
    });
    if (!v) return;
    if (sel.kind === 'folder') await action('moveFolder', { id: sel.item.id, parent_id: Number(v.dest) });
    else await action('updateFile', { id: sel.item.id, folder_id: Number(v.dest) });
    await this.refresh();
  }

  private async remove(): Promise<void> {
    const sel = this.selection;
    if (!sel) return;
    const fs = this.os.fs;
    if (sel.kind === 'folder') {
      const folders = fs.descendantFolders(sel.item.id);
      const count = folders.reduce((n, f) => n + fs.filesIn(f.id).length, 0);
      const v = await dialog(this.root, fs, {
        title: 'Supprimer le dossier',
        fields: [
          { kind: 'note', text: `« ${sel.item.name} » et tout son contenu (${folders.length - 1} sous-dossier(s), ${count} fichier(s)) seront supprimés de la base.` },
          { kind: 'check', name: 'blobs', label: 'Supprimer aussi les fichiers du serveur (s’ils ne servent nulle part ailleurs)', value: true },
        ],
        confirm: 'Supprimer',
        danger: true,
      });
      if (!v) return;
      await action('deleteFolder', { id: sel.item.id, deleteBlobs: !!v.blobs });
    } else {
      const entry = ['shortcut', 'project', 'link'].includes(sel.item.app);
      const v = await dialog(this.root, fs, {
        title: 'Supprimer le fichier',
        fields: [
          { kind: 'note', text: `Supprimer « ${sel.item.name} » ?` },
          ...(entry ? [] : [{ kind: 'check' as const, name: 'blob', label: 'Supprimer aussi le fichier du serveur (s’il ne sert nulle part ailleurs)', value: true }]),
        ],
        confirm: 'Supprimer',
        danger: true,
      });
      if (!v) return;
      await action('deleteFile', { id: sel.item.id, deleteBlob: !!v.blob });
    }
    await this.refresh();
  }

  private async signOut(): Promise<void> {
    await logout();
    this.win.close();
  }
}
