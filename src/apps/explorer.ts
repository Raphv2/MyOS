import { USER_FOLDER_ID } from '../config';
import { h, img } from '../core/dom';
import type { FsFile, FsFolder } from '../core/fs';
import { fileIcon, folderIcon, ICON } from '../core/icons';
import type { Os } from '../os/context';
import { onOpen } from '../os/ui';

function item(kind: 'folder' | 'file', id: number, name: string, icon: string): HTMLDivElement {
  return h(
    'div',
    { class: 'folder', title: name, dataset: { kind, id }, attrs: { tabindex: 0 } },
    img(icon),
    h('p', { text: name }),
  );
}

/**
 * Explorateur de fichiers : liste latérale (Home, Bin | dossiers de l'utilisateur | racines),
 * contenu du dossier courant, barre d'adresse et bouton « dossier parent ».
 */
export function openExplorer(os: Os, start: FsFolder, key = `explorer:${start.id}`): void {
  const { win, created } = os.wm.open({ key, title: 'file explorer', icon: ICON.directory, label: start.name });
  if (!created) return;

  const back = h('div', { class: 'nav_button', text: '<', attrs: { role: 'button', 'aria-label': 'Dossier parent' } });
  const pathText = h('div', { class: 'search_bar_text' });
  const sideList = h('div', { class: 'list_folder_contener' });
  const items = h('div', { class: 'inner_folders' });
  const nameText = h('div', { class: 'folder_name_text' });

  win.body.append(
    h('div', { class: 'header' }, h('div', { class: 'row_explorer' }, back, h('div', { class: 'search_bar' }, pathText))),
    h('div', { class: 'content2' }, h('div', { class: 'list_folder' }, sideList), items),
    h('div', { class: 'footer_file_explorer' }, h('div', { class: 'folder_name' }, nameText)),
  );

  let currentId = start.id;

  const renderSidebar = () => {
    const fs = os.fs;
    const userFolders = fs.subfolders(USER_FOLDER_ID);
    const pinned = ['Home', 'Bin']
      .map((n) => userFolders.find((f) => f.name === n))
      .filter((f): f is FsFolder => !!f);
    const others = userFolders.filter((f) => f.name !== 'Home' && f.name !== 'Bin');
    const roots = fs.subfolders(null);
    const row = (f: FsFolder) => item('folder', f.id, f.name, folderIcon(f));
    sideList.replaceChildren(
      ...pinned.map(row),
      h('div', { class: 'space' }),
      ...others.map(row),
      h('div', { class: 'space' }),
      ...roots.map(row),
    );
  };

  const navigate = (folderId: number) => {
    const fs = os.fs;
    const folder = fs.folder(folderId) ?? fs.folder(start.id) ?? fs.subfolders(null)[0];
    if (!folder) return;
    currentId = folder.id;
    pathText.textContent = fs.pathOf(folder);
    nameText.textContent = folder.name;
    items.replaceChildren(
      ...fs.subfolders(folder.id).map((f) => item('folder', f.id, f.name, folderIcon(f))),
      ...fs.filesIn(folder.id).map((f) => item('file', f.id, f.name, fileIcon(f, { projectLogo: os.projectLogo(f) }))),
    );
    items.scrollTop = 0;
  };

  const fileOf = (el: HTMLElement): FsFile | undefined => os.fs.file(Number(el.dataset.id));

  // Clic simple : entrer dans un dossier (ou suivre un raccourci, comme avant).
  const onClick = (e: Event) => {
    const el = (e.target as Element).closest<HTMLElement>('.folder');
    if (!el) return;
    if (el.dataset.kind === 'folder') return navigate(Number(el.dataset.id));
    const file = fileOf(el);
    if (file?.app === 'shortcut') {
      const target = os.fs.targetFolder(file);
      if (target) navigate(target.id);
    }
  };
  sideList.addEventListener('click', onClick, { signal: win.signal });
  items.addEventListener('click', onClick, { signal: win.signal });

  // Double-clic (PC) / tap (mobile) : ouvrir le fichier.
  onOpen(
    items,
    '.folder[data-kind="file"]',
    (el) => {
      const file = fileOf(el);
      if (file && file.app !== 'shortcut') os.launch(file);
    },
    win.signal,
  );
  items.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter') return;
      const el = (e.target as Element).closest<HTMLElement>('.folder');
      if (!el) return;
      if (el.dataset.kind === 'folder') navigate(Number(el.dataset.id));
      else {
        const file = fileOf(el);
        if (file) os.launch(file);
      }
    },
    { signal: win.signal },
  );

  back.addEventListener(
    'click',
    () => {
      const parent = os.fs.folder(os.fs.folder(currentId)?.parentId);
      if (parent) navigate(parent.id);
    },
    { signal: win.signal },
  );

  os.onTreeChange(() => {
    renderSidebar();
    navigate(currentId);
  }, win.signal);

  renderSidebar();
  navigate(start.id);
}
