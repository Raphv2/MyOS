import { h } from '../core/dom';
import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';
import { mediaControls, pixelIcon, stopMedia } from './media';

/** Lecteur vidéo (mp4/webm) avec contrôles rétro et effet scanlines. */
export function openVideo(os: Os, file: FsFile): void {
  const { win, created } = os.wm.open({
    key: `file:${file.id}`,
    title: file.name,
    icon: fileIcon(file),
    width: '56%',
    height: '62%',
  });
  if (!created) return;
  win.body.append(videoPlayer(file.url ?? '', file.name, win.signal, (fn) => win.onDispose(fn)));
}

/** Construit un lecteur réutilisable (aussi utilisé dans la fenêtre Projet). */
export function videoPlayer(
  url: string,
  title: string,
  signal: AbortSignal,
  onDispose: (fn: () => void) => void,
): HTMLDivElement {
  const video = h('video', { class: 'media-video', attrs: { src: url, preload: 'metadata', playsinline: true } });
  const bigPlay = h('button', { class: 'media-bigplay', attrs: { type: 'button', 'aria-label': `Lire ${title}` } });
  bigPlay.appendChild(pixelIcon('play'));
  const stage = h('div', { class: 'media-stage' }, video, h('div', { class: 'media-scanlines' }), bigPlay);
  const player = h('div', { class: 'content media-player' }, stage);
  player.appendChild(mediaControls(video, signal, { fullscreenTarget: stage, keyTarget: player }));

  const start = () => void video.play().catch(() => undefined);
  bigPlay.addEventListener('click', start, { signal });
  video.addEventListener('click', () => (video.paused ? start() : video.pause()), { signal });
  video.addEventListener('play', () => stage.classList.add('is-playing'), { signal });
  video.addEventListener('pause', () => stage.classList.remove('is-playing'), { signal });
  video.addEventListener(
    'error',
    () => stage.replaceChildren(h('p', { class: 'app-error', text: 'Vidéo introuvable ou format non supporté.' })),
    { signal },
  );
  onDispose(() => stopMedia(video));
  return player;
}
