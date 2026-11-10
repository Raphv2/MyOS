import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { fetchText } from '../core/api';
import { h } from '../core/dom';
import type { FsFile, VirtualFS } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';

/**
 * Markdown → HTML nettoyé (DOMPurify). Les liens/images relatifs (`![](capture.png)`)
 * sont résolus vers les fichiers du même dossier dans la base.
 */
export function renderMarkdown(text: string, fs: VirtualFS, folderId: number | null): DocumentFragment {
  const html = DOMPurify.sanitize(marked.parse(text, { async: false, gfm: true, breaks: false }) as string);
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const siblings = folderId === null ? [] : fs.filesIn(folderId);
  const resolve = (ref: string): string | null => {
    if (/^(https?:|mailto:|#|\/|data:)/i.test(ref)) return null;
    const name = decodeURIComponent(ref.split(/[?#]/)[0]!.split('/').pop() ?? '');
    return siblings.find((f) => f.name === name)?.url ?? null;
  };
  tpl.content.querySelectorAll<HTMLImageElement>('img[src]').forEach((im) => {
    const url = resolve(im.getAttribute('src') ?? '');
    if (url) im.src = url;
    im.loading = 'lazy';
  });
  tpl.content.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const url = resolve(a.getAttribute('href') ?? '');
    if (url) a.href = url;
    if (/^https?:/i.test(a.href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
  return tpl.content;
}

export async function markdownInto(el: HTMLElement, file: FsFile, fs: VirtualFS): Promise<void> {
  el.replaceChildren(h('p', { class: 'ide-loading', text: 'Chargement...' }));
  try {
    const text = await fetchText(file.url ?? '');
    el.replaceChildren(renderMarkdown(text, fs, file.folderId));
  } catch {
    el.replaceChildren(h('p', { class: 'app-error', text: `${file.name} introuvable.` }));
  }
}

/** Lecteur de document Markdown (README…). */
export function open(os: Os, file: FsFile): void {
  const { win, created } = os.wm.open({ key: `file:${file.id}`, title: file.name, icon: fileIcon(file), width: '46%', height: '66%' });
  if (!created) return;
  const doc = h('article', { class: 'doc-view' });
  win.body.append(h('div', { class: 'content doc-scroll' }, doc));
  void markdownInto(doc, file, os.fs);
}
