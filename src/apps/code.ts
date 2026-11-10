import { fetchText } from '../core/api';
import { h, img } from '../core/dom';
import { TEXT_KINDS, type FsFile, type FsFolder } from '../core/fs';
import { fileIcon, folderIcon, ICON } from '../core/icons';
import type { Os } from '../os/context';
import type { OSWindow } from '../os/window-manager';
import { highlight, LANG_LABEL, languageOf } from './highlight';

/** Zone de code colorée, sans l'arborescence (utilisée aussi par le shader et les projets). */
export function codeBlock(): { el: HTMLDivElement; show(text: string, lang: string): Promise<void> } {
  const el = h('div', { class: 'ide-editor', attrs: { tabindex: 0 } });
  return {
    el,
    async show(text, lang) {
      const html = await highlight(text, lang);
      el.innerHTML = html; // HTML produit par Shiki (contenu échappé)
      el.scrollTop = 0;
    },
  };
}

interface Tab {
  file: FsFile;
  tabEl: HTMLDivElement;
  text: string | null;
  html: string | null;
  error: string | null;
}

/** Une fenêtre IDE : explorateur à gauche, onglets, code coloré, barre d'état. */
class Ide {
  private readonly tabs = new Map<number, Tab>();
  private active: Tab | null = null;
  private readonly treeEl = h('div', { class: 'ide-tree', attrs: { role: 'tree' } });
  private readonly tabsEl = h('div', { class: 'ide-tabs', attrs: { role: 'tablist' } });
  private readonly editor = h('div', { class: 'ide-editor', attrs: { tabindex: 0 } });
  private readonly status = {
    lang: h('span', { text: '' }),
    lines: h('span', { text: '' }),
    copy: h('button', { class: 'ide-copy', text: 'Copier', attrs: { type: 'button' } }),
  };
  private readonly collapsed = new Set<number>();

  constructor(
    private readonly os: Os,
    private readonly win: OSWindow,
    private readonly root: FsFolder,
  ) {
    const sidebar = h(
      'div',
      { class: 'ide-sidebar' },
      h('div', { class: 'ide-sidebar-title', text: 'EXPLORER' }),
      h('div', { class: 'ide-root-name', text: root.name.toUpperCase() }),
      this.treeEl,
    );
    const statusBar = h(
      'div',
      { class: 'ide-status' },
      h('span', { class: 'ide-status-brand', text: '◆ MyOS Code' }),
      this.status.lines,
      h('span', { text: 'UTF-8' }),
      this.status.lang,
      h('span', { class: 'ide-readonly', text: 'Lecture seule' }),
      this.status.copy,
    );
    this.editor.appendChild(this.welcome());
    win.body.append(h('div', { class: 'ide' }, sidebar, h('div', { class: 'ide-main' }, this.tabsEl, this.editor), statusBar));

    const { signal } = win;
    this.treeEl.addEventListener('click', (e) => this.onTreeClick(e), { signal });
    this.status.copy.addEventListener('click', () => this.copy(), { signal });
    os.onTreeChange(() => this.renderTree(), signal);
    this.renderTree();
  }

  private welcome(): HTMLElement {
    return h(
      'div',
      { class: 'ide-welcome' },
      img(ICON.ide, 'ide-welcome-logo'),
      h('p', { text: this.root.name }),
      h('p', { class: 'ide-hint', text: 'Choisis un fichier dans l’explorateur.' }),
    );
  }

  private renderTree(): void {
    const fs = this.os.fs;
    const build = (folder: FsFolder, depth: number): HTMLElement[] => {
      const out: HTMLElement[] = [];
      for (const sub of fs.subfolders(folder.id)) {
        const open = !this.collapsed.has(sub.id);
        out.push(
          h(
            'div',
            { class: `ide-node ide-folder${open ? ' is-open' : ''}`, dataset: { folder: sub.id }, attrs: { role: 'treeitem', 'aria-expanded': open } },
            h('span', { class: 'ide-indent', style: { width: `${depth * 12}px` } }),
            h('span', { class: 'ide-chevron', text: open ? '▾' : '▸' }),
            img(folderIcon(sub), 'ide-node-icon'),
            h('span', { class: 'ide-node-name', text: sub.name }),
          ),
        );
        if (open) out.push(...build(sub, depth + 1));
      }
      for (const file of fs.filesIn(folder.id)) {
        out.push(
          h(
            'div',
            {
              class: `ide-node ide-file${this.active?.file.id === file.id ? ' is-active' : ''}`,
              dataset: { file: file.id },
              title: file.name,
              attrs: { role: 'treeitem' },
            },
            h('span', { class: 'ide-indent', style: { width: `${depth * 12 + 12}px` } }),
            img(fileIcon(file), 'ide-node-icon'),
            h('span', { class: 'ide-node-name', text: file.name }),
          ),
        );
      }
      return out;
    };
    this.treeEl.replaceChildren(...build(this.root, 0));
  }

  private onTreeClick(e: Event): void {
    const node = (e.target as Element).closest<HTMLElement>('.ide-node');
    if (!node) return;
    if (node.dataset.folder) {
      const id = Number(node.dataset.folder);
      if (this.collapsed.has(id)) this.collapsed.delete(id);
      else this.collapsed.add(id);
      this.renderTree();
      return;
    }
    const file = this.os.fs.file(Number(node.dataset.file));
    if (!file) return;
    if (TEXT_KINDS.has(file.app)) void this.openFile(file);
    else this.os.launch(file); // image, pdf, vidéo… : leur propre appli
  }

  async openFile(file: FsFile): Promise<void> {
    let tab = this.tabs.get(file.id);
    if (!tab) {
      const close = h('span', { class: 'ide-tab-close', text: '×', attrs: { role: 'button', 'aria-label': `Fermer ${file.name}` } });
      const tabEl = h(
        'div',
        { class: 'ide-tab', title: file.name, attrs: { role: 'tab' } },
        img(fileIcon(file), 'ide-node-icon'),
        h('span', { text: file.name }),
        close,
      );
      tab = { file, tabEl, text: null, html: null, error: null };
      const t = tab;
      tabEl.addEventListener('click', (e) => {
        if (e.target === close) this.closeTab(t);
        else void this.activate(t);
      }, { signal: this.win.signal });
      tabEl.addEventListener('auxclick', (e) => e.button === 1 && this.closeTab(t), { signal: this.win.signal });
      this.tabs.set(file.id, tab);
      this.tabsEl.appendChild(tabEl);
    }
    await this.activate(tab);
  }

  private async activate(tab: Tab): Promise<void> {
    this.active = tab;
    for (const t of this.tabs.values()) t.tabEl.classList.toggle('is-active', t === tab);
    tab.tabEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.renderTree();
    const lang = languageOf(tab.file.ext, tab.file.name);
    this.status.lang.textContent = LANG_LABEL[lang] ?? lang;
    if (tab.html === null && tab.error === null) {
      this.editor.replaceChildren(h('p', { class: 'ide-loading', text: 'Chargement...' }));
      try {
        tab.text = await fetchText(tab.file.url ?? '');
        tab.html = await highlight(tab.text, lang);
      } catch (err) {
        tab.error = err instanceof Error ? err.message : String(err);
      }
    }
    if (this.active !== tab) return;
    if (tab.error !== null) {
      this.editor.replaceChildren(h('p', { class: 'app-error', text: `Impossible de lire ${tab.file.name} : ${tab.error}` }));
      this.status.lines.textContent = '';
      return;
    }
    this.editor.innerHTML = tab.html ?? '';
    this.editor.scrollTop = 0;
    this.status.lines.textContent = `${(tab.text ?? '').split('\n').length} lignes`;
  }

  private closeTab(tab: Tab): void {
    tab.tabEl.remove();
    this.tabs.delete(tab.file.id);
    if (this.active === tab) {
      const next = [...this.tabs.values()].pop();
      this.active = null;
      if (next) void this.activate(next);
      else {
        this.editor.replaceChildren(this.welcome());
        this.status.lines.textContent = '';
        this.status.lang.textContent = '';
        this.renderTree();
      }
    }
  }

  private copy(): void {
    const text = this.active?.text;
    if (!text) return;
    void navigator.clipboard?.writeText(text).then(() => {
      this.status.copy.textContent = 'Copié !';
      window.setTimeout(() => (this.status.copy.textContent = 'Copier'), 1200);
    });
  }
}

const instances = new Map<string, Ide>();

/** Ouvre l'IDE sur un dossier (et éventuellement un fichier dedans). */
export function openIde(os: Os, root: FsFolder, file?: FsFile): void {
  const key = `ide:${root.id}`;
  const { win, created } = os.wm.open({
    key,
    title: `MyOS Code — ${root.name}`,
    icon: ICON.ide,
    label: `Code ${root.name}`,
    width: '64%',
    height: '70%',
    className: 'win-ide',
  });
  let ide = instances.get(key);
  if (created || !ide) {
    ide = new Ide(os, win, root);
    instances.set(key, ide);
    win.onDispose(() => instances.delete(key));
  }
  if (file) void ide.openFile(file);
}

/** Ouverture d'un fichier de code : l'IDE s'ouvre sur son dossier. */
export function open(os: Os, file: FsFile): void {
  const folder = os.fs.folder(file.folderId);
  if (!folder) {
    os.openError('error', `Dossier de ${file.name} introuvable.`);
    return;
  }
  openIde(os, folder, file);
}
