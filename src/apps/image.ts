import { h, img } from '../core/dom';
import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';
import { attachZoomPan } from './zoom';

export function zoomSlider(): HTMLInputElement {
  return h('input', {
    class: 'scale-slider',
    attrs: { type: 'range', min: 0.1, max: 2, step: 0.01, value: 1, 'aria-label': 'Zoom' },
  });
}

/** Visionneuse d'image : zoom molette / slider / pinch, glisser pour déplacer, double-clic pour recentrer. */
export function openImage(os: Os, file: FsFile): void {
  const { win, created } = os.wm.open({ key: `file:${file.id}`, title: file.name, icon: fileIcon(file) });
  if (!created) return;

  const picture = img(file.url ?? '', 'image_', file.name);
  const viewer = h('div', { class: 'content viewer' }, picture);
  const slider = zoomSlider();
  win.body.append(viewer, h('div', { class: 'footer_file_explorer viewer-footer' }, slider));

  picture.addEventListener('error', () => viewer.replaceChildren(h('p', { class: 'app-error', text: 'Image introuvable.' })), {
    signal: win.signal,
    once: true,
  });
  attachZoomPan(viewer, picture, slider, win.signal);
}
