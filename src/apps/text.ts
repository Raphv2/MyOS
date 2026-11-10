import { fetchText } from '../core/api';
import { h } from '../core/dom';
import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';

/** Bloc-notes : affiche un .txt (on peut taper dedans, rien n'est enregistré - comme avant). */
export function openText(os: Os, file: FsFile): void {
  const { win, created } = os.wm.open({ key: `file:${file.id}`, title: file.name, icon: fileIcon(file) });
  if (!created) return;

  const area = h('textarea', { class: 'text_area', attrs: { spellcheck: 'false', 'aria-label': file.name } });
  area.value = 'Chargement...';
  win.body.append(h('div', { class: 'content notepad' }, area));

  if (!file.url) {
    area.value = `> ${file.name}\n> fichier vide.`;
    return;
  }
  fetchText(file.url)
    .then((text) => (area.value = text))
    .catch(() => (area.value = `> ${file.name}\n> ERREUR : fichier introuvable sur le disque.\n> (ajoute-le depuis l'admin)`));
}
