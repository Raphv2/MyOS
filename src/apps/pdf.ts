import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { clamp, h, img } from '../core/dom';
import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';
import { attachZoomPan } from './zoom';
import { zoomSlider } from './image';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/** Bouton de téléchargement (même style que l'ancien). */
export function downloadButton(url: string, name: string): HTMLAnchorElement {
  return h(
    'a',
    { class: 'download_link', attrs: { href: url, download: name, title: `Télécharger ${name}` } },
    h('span', { class: 'download_button' }, img('/img/download_icon.png', 'download_icon')),
  );
}

/** Vue PDF réutilisable (fenêtre PDF et onglet « Présentation » d'un projet). */
export function pdfView(url: string, name: string, signal: AbortSignal, onDispose: (fn: () => void) => void): HTMLDivElement {
  const pages = h('div', { class: 'pdf-pages', attrs: { tabindex: 0 } }, h('p', { class: 'pdf-loading', text: 'LOADING...' }));
  const slider = zoomSlider();
  slider.min = '0.5';
  slider.max = '2.5';
  slider.value = '1';
  const info = h('span', { class: 'pdf-page-info', text: '' });
  const view = h(
    'div',
    { class: 'content pdf-view' },
    pages,
    h('div', { class: 'footer_file_explorer viewer-footer' }, slider, info),
    downloadButton(url, name),
  );

  let doc: pdfjs.PDFDocumentProxy | null = null;
  let zoom = 1;
  let generation = 0;
  const canvases: HTMLCanvasElement[] = [];

  const tasks = new Set<ReturnType<pdfjs.PDFPageProxy['render']>>();
  const render = async () => {
    if (!doc) return;
    const gen = ++generation;
    // pdf.js interdit deux rendus simultanés sur le même canvas : on annule d'abord.
    for (const t of tasks) t.cancel();
    await Promise.allSettled([...tasks].map((t) => t.promise));
    tasks.clear();
    if (gen !== generation) return;
    const avail = Math.max(200, pages.clientWidth - 24);
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      if (gen !== generation) return;
      const base = page.getViewport({ scale: 1 });
      const scale = (avail / base.width) * zoom;
      const viewport = page.getViewport({ scale });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let canvas = canvases[i - 1];
      if (!canvas) {
        canvas = h('canvas', { class: 'pdf-page', attrs: { 'aria-label': `Page ${i}` } });
        canvases.push(canvas);
        pages.appendChild(canvas);
      }
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const task = page.render({ canvas, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
      tasks.add(task);
      try {
        await task.promise;
      } catch (err) {
        if (err instanceof pdfjs.RenderingCancelledException) return;
        throw err;
      } finally {
        tasks.delete(task);
      }
      if (gen !== generation) return;
    }
  };

  const updateInfo = () => {
    if (!doc) return;
    const mid = pages.scrollTop + pages.clientHeight / 2;
    const idx = canvases.findIndex((c) => c.offsetTop + c.offsetHeight > mid);
    info.textContent = `${clamp(idx + 1 || doc.numPages, 1, doc.numPages)} / ${doc.numPages}`;
  };

  let timer = 0;
  const scheduleRender = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void render().then(updateInfo), 120);
  };

  slider.addEventListener('input', () => {
    zoom = Number(slider.value);
    scheduleRender();
  }, { signal });
  pages.addEventListener('scroll', updateInfo, { passive: true, signal });
  const ro = new ResizeObserver(scheduleRender);
  ro.observe(pages);

  const task = pdfjs.getDocument({ url });
  task.promise
    .then(async (d) => {
      doc = d;
      pages.replaceChildren();
      await render();
      updateInfo();
    })
    .catch((err: unknown) => {
      console.error(err);
      // Repli : l'aperçu PNG de l'ancien site (img/pdf/RG_cv.png), s'il existe.
      const preview = img(url.replace(/\.pdf$/i, '.png'), 'image_', name);
      const box = h('div', { class: 'viewer pdf-fallback' }, preview);
      pages.replaceChildren(box);
      attachZoomPan(box, preview, slider, signal);
      preview.addEventListener('error', () => box.replaceChildren(h('p', { class: 'app-error', text: 'PDF introuvable.' })), { once: true });
    });

  onDispose(() => {
    window.clearTimeout(timer);
    ro.disconnect();
    generation++;
    void task.destroy();
  });
  return view;
}

export function open(os: Os, file: FsFile): void {
  const { win, created } = os.wm.open({
    key: `file:${file.id}`,
    title: file.name,
    icon: fileIcon(file),
    width: '42%',
    height: '72%',
  });
  if (!created) return;
  win.body.append(pdfView(file.url ?? '', file.name, win.signal, (fn) => win.onDispose(fn)));
}
