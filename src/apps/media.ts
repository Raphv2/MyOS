import { ASSET, assetIcon } from '../core/assets';
import { formatTime, h } from '../core/dom';

/** Icônes des contrôles : à fournir dans img/ (carré noir nommé tant qu'elles manquent). */
const CONTROL_ICONS = {
  play: ASSET.play,
  pause: ASSET.pause,
  sound: ASSET.sound,
  mute: ASSET.mute,
  full: ASSET.fullscreen,
} as const;

type ControlIcon = keyof typeof CONTROL_ICONS;

export function controlIcon(name: ControlIcon, cls = 'ctrl-icon'): HTMLImageElement {
  return assetIcon(CONTROL_ICONS[name], cls);
}

export function osButton(icon: ControlIcon, label: string): HTMLButtonElement {
  const b = h('button', { class: 'os-btn os-btn-icon', title: label, attrs: { type: 'button', 'aria-label': label } });
  b.appendChild(controlIcon(icon));
  return b;
}

function setIcon(btn: HTMLButtonElement, icon: ControlIcon) {
  btn.replaceChildren(controlIcon(icon));
}

/**
 * Barre de contrôle rétro pour <audio>/<video> : lecture, temps, position, volume,
 * (et plein écran pour la vidéo). Raccourcis : espace, ←/→, M.
 */
export function mediaControls(
  media: HTMLMediaElement,
  signal: AbortSignal,
  opts: { fullscreenTarget?: HTMLElement; keyTarget?: HTMLElement } = {},
): HTMLDivElement {
  const play = osButton('play', 'Lecture');
  const time = h('span', { class: 'media-time', text: '0:00 / 0:00' });
  const seek = h('input', {
    class: 'scale-slider media-seek',
    attrs: { type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Position' },
  });
  const muteBtn = osButton('sound', 'Couper le son');
  const volume = h('input', {
    class: 'scale-slider media-volume',
    attrs: { type: 'range', min: 0, max: 1, step: 0.01, value: 0.8, 'aria-label': 'Volume' },
  });
  media.volume = 0.8;
  const bar = h('div', { class: 'media-controls' }, play, time, seek, muteBtn, volume);

  if (opts.fullscreenTarget) {
    const fs = osButton('full', 'Plein écran');
    const target = opts.fullscreenTarget;
    fs.addEventListener(
      'click',
      () => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void target.requestFullscreen?.().catch(() => undefined);
      },
      { signal },
    );
    bar.appendChild(fs);
  }

  const toggle = () => (media.paused ? void media.play().catch(() => undefined) : media.pause());
  let seeking = false;
  const refresh = () => {
    time.textContent = `${formatTime(media.currentTime)} / ${formatTime(media.duration)}`;
    if (!seeking && media.duration) seek.value = String(Math.round((media.currentTime / media.duration) * 1000));
  };

  play.addEventListener('click', toggle, { signal });
  media.addEventListener('play', () => setIcon(play, 'pause'), { signal });
  media.addEventListener('pause', () => setIcon(play, 'play'), { signal });
  media.addEventListener('timeupdate', refresh, { signal });
  media.addEventListener('loadedmetadata', refresh, { signal });
  seek.addEventListener('pointerdown', () => (seeking = true), { signal });
  seek.addEventListener('input', () => {
    if (media.duration) media.currentTime = (Number(seek.value) / 1000) * media.duration;
  }, { signal });
  seek.addEventListener('change', () => (seeking = false), { signal });
  volume.addEventListener('input', () => {
    media.volume = Number(volume.value);
    media.muted = media.volume === 0;
  }, { signal });
  muteBtn.addEventListener('click', () => (media.muted = !media.muted), { signal });
  media.addEventListener('volumechange', () => setIcon(muteBtn, media.muted ? 'mute' : 'sound'), { signal });

  const keys = opts.keyTarget;
  if (keys) {
    keys.tabIndex = 0;
    keys.addEventListener(
      'keydown',
      (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if (e.key === ' ') {
          e.preventDefault();
          toggle();
        } else if (e.key === 'ArrowRight') media.currentTime += 5;
        else if (e.key === 'ArrowLeft') media.currentTime -= 5;
        else if (e.key.toLowerCase() === 'm') media.muted = !media.muted;
      },
      { signal },
    );
  }
  return bar;
}

/** Coupe proprement un média quand sa fenêtre se ferme. */
export function stopMedia(media: HTMLMediaElement): void {
  media.pause();
  media.removeAttribute('src');
  media.load();
}
