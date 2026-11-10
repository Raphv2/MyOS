import { h, img } from '../core/dom';
import type { FsFile, FsFolder } from '../core/fs';
import { fileIcon, folderIcon, ICON } from '../core/icons';
import type { Os } from '../os/context';
import { openIde } from './code';
import { markdownInto } from './markdown';
import { pdfView } from './pdf';
import { scanProject, type ProjectContent } from './project-scan';
import { videoPlayer } from './video';

type Section = 'overview' | 'gallery' | 'docs' | 'videos' | 'code';

/**
 * Fenêtre « Projet » : logo + nom, et des onglets Présentation (README), Galerie,
 * Documents (PDF), Vidéos et Code (ouvre MyOS Code sur le dossier du projet).
 */
export function openProject(os: Os, folder: FsFolder): void {
  const p0 = scanProject(os.fs, folder);
  const { win, created } = os.wm.open({
    key: `project:${folder.id}`,
    title: folder.name,
    icon: p0.logo?.url ?? ICON.project,
    label: folder.name,
    width: '62%',
    height: '72%',
    className: 'win-project',
  });
  if (!created) return;
  const { signal } = win;

  const nav = h('nav', { class: 'project-nav' });
  const main = h('div', { class: 'project-main' });
  const head = h('div', { class: 'project-head' });
  win.body.append(h('div', { class: 'content project' }, h('aside', { class: 'project-side' }, head, nav), main));

  let current: Section = 'overview';
  const disposers: Array<() => void> = [];
  const cleanPane = () => disposers.splice(0).forEach((fn) => fn());
  win.onDispose(cleanPane);

  const render = () => {
    const p = scanProject(os.fs, folder);
    head.replaceChildren(
      img(p.logo?.url ?? ICON.project, 'project-logo', `Logo ${folder.name}`),
      h('h2', { class: 'project-title', text: folder.name }),
    );
    const sections: Array<[Section, string, number | null]> = [
      ['overview', 'Présentation', null],
      ['gallery', 'Galerie', p.images.length + p.models.length],
      ['docs', 'Documents', p.pdfs.length],
      ['videos', 'Vidéos', p.videos.length],
      ['code', 'Code', p.codeCount],
    ];
    nav.replaceChildren(
      ...sections
        .filter(([key, , n]) => key === 'overview' || (n ?? 0) > 0)
        .map(([key, label, n]) => {
          const b = h(
            'button',
            { class: `project-tab${key === current ? ' is-active' : ''}`, attrs: { type: 'button' } },
            h('span', { text: label }),
            n !== null ? h('span', { class: 'project-count', text: String(n) }) : null,
          );
          b.addEventListener('click', () => show(key), { signal });
          return b;
        }),
    );
    renderPane(p);
  };

  const tile = (f: FsFile, thumb: string) => {
    const t = h(
      'button',
      { class: 'project-tile', title: f.name, attrs: { type: 'button' } },
      img(thumb, 'project-thumb', f.name),
      h('span', { text: f.name }),
    );
    t.addEventListener('click', () => os.launch(f), { signal });
    return t;
  };

  const picker = (files: FsFile[], onPick: (f: FsFile) => void) => {
    const bar = h('div', { class: 'project-picker' });
    files.forEach((f, i) => {
      const b = h('button', { class: `app-subtab${i === 0 ? ' is-active' : ''}`, text: f.name, attrs: { type: 'button' } });
      b.addEventListener('click', () => {
        bar.querySelectorAll('.app-subtab').forEach((x) => x.classList.toggle('is-active', x === b));
        onPick(f);
      }, { signal });
      bar.appendChild(b);
    });
    return bar;
  };

  const renderPane = (p: ProjectContent) => {
    cleanPane();
    const ctrl = new AbortController();
    disposers.push(() => ctrl.abort());
    const onDispose = (fn: () => void) => disposers.push(fn);

    switch (current) {
      case 'overview': {
        const doc = h('article', { class: 'doc-view' });
        main.replaceChildren(h('div', { class: 'doc-scroll' }, doc));
        if (p.readme) void markdownInto(doc, p.readme, os.fs);
        else
          doc.replaceChildren(
            h('h1', { text: folder.name }),
            h('p', { class: 'ide-hint', text: 'Ajoute un fichier README.md dans ce dossier pour décrire le projet.' }),
          );
        break;
      }
      case 'gallery':
        main.replaceChildren(
          h(
            'div',
            { class: 'project-grid' },
            ...p.images.map((f) => tile(f, f.url ?? fileIcon(f))),
            ...p.models.map((f) => tile(f, fileIcon(f))),
          ),
        );
        break;
      case 'docs': {
        const holder = h('div', { class: 'project-media' });
        const display = (f: FsFile) => {
          cleanPane();
          const c = new AbortController();
          disposers.push(() => c.abort());
          holder.replaceChildren(pdfView(f.url ?? '', f.name, c.signal, onDispose));
        };
        main.replaceChildren(p.pdfs.length > 1 ? picker(p.pdfs, display) : h('div'), holder);
        if (p.pdfs[0]) display(p.pdfs[0]);
        break;
      }
      case 'videos': {
        const holder = h('div', { class: 'project-media' });
        const display = (f: FsFile) => {
          cleanPane();
          const c = new AbortController();
          disposers.push(() => c.abort());
          holder.replaceChildren(videoPlayer(f.url ?? '', f.name, c.signal, onDispose));
        };
        main.replaceChildren(p.videos.length > 1 ? picker(p.videos, display) : h('div'), holder);
        if (p.videos[0]) display(p.videos[0]);
        break;
      }
      case 'code': {
        const root = p.codeRoot ?? folder;
        const btn = h('button', { class: 'os-btn os-btn-wide', text: 'Ouvrir dans MyOS Code', attrs: { type: 'button' } });
        btn.addEventListener('click', () => openIde(os, root), { signal: ctrl.signal });
        const files = os.fs
          .descendantFolders(root.id)
          .flatMap((f) => os.fs.filesIn(f.id))
          .filter((f) => f.app === 'code' || f.app === 'shader');
        const list = h(
          'ul',
          { class: 'project-code-list' },
          ...files.slice(0, 40).map((f) => {
            const dir = os.fs.folder(f.folderId);
            const rel = dir ? os.fs.pathOf(dir).slice(os.fs.pathOf(root).length - root.name.length) : root.name;
            const li = h('li', null, img(fileIcon(f), 'ide-node-icon'), h('span', { text: `${rel}/${f.name}` }));
            li.addEventListener('click', () => openIde(os, root, f), { signal: ctrl.signal });
            return li;
          }),
        );
        main.replaceChildren(
          h('div', { class: 'project-code' }, img(folderIcon(root), 'project-code-icon'), h('p', { text: `${files.length} fichier(s) de code` }), btn, list),
        );
        break;
      }
    }
  };

  const show = (s: Section) => {
    current = s;
    render();
  };

  os.onTreeChange(render, signal);
  render();
}

export function open(os: Os, file: FsFile): void {
  const folder = os.fs.targetFolder(file);
  if (!folder) {
    os.openError('error', `Le dossier du projet « ${file.name} » est introuvable.`);
    return;
  }
  openProject(os, folder);
}
