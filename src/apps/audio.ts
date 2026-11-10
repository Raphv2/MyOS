import { h, img } from '../core/dom';
import { baseName, type FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';
import { mediaControls, stopMedia } from './media';

/** Lecteur audio avec visualiseur en barres pixel (Web Audio). */
export function openAudio(os: Os, file: FsFile): void {
  const { win, created } = os.wm.open({
    key: `file:${file.id}`,
    title: file.name,
    icon: fileIcon(file),
    width: '36%',
    height: '42%',
  });
  if (!created) return;

  const audio = h('audio', { attrs: { src: file.url ?? '', preload: 'metadata' } });
  const canvas = h('canvas', { class: 'audio-viz', attrs: { width: 160, height: 64 } });
  const title = h('div', { class: 'audio-title' }, h('span', { text: baseName(file.name) }));
  const art = h('div', { class: 'audio-art' }, img(fileIcon(file), 'audio-cover'), canvas);
  const player = h('div', { class: 'content media-player audio-player' }, art, title, audio);
  player.appendChild(mediaControls(audio, win.signal, { keyTarget: player }));
  win.body.append(player);

  const ctx2d = canvas.getContext('2d');
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let raf = 0;
  const bins = new Uint8Array(32);

  const draw = () => {
    raf = requestAnimationFrame(draw);
    if (!ctx2d) return;
    const { width, height } = canvas;
    ctx2d.fillStyle = '#212121';
    ctx2d.fillRect(0, 0, width, height);
    if (analyser) analyser.getByteFrequencyData(bins);
    const bw = width / bins.length;
    for (let i = 0; i < bins.length; i++) {
      const v = analyser ? bins[i]! / 255 : 0.04;
      const blocks = Math.max(1, Math.round(v * 8));
      for (let b = 0; b < blocks; b++) {
        ctx2d.fillStyle = b > 5 ? '#ff0000' : b > 3 ? '#ffcc00' : '#00ff22';
        ctx2d.fillRect(i * bw + 1, height - (b + 1) * (height / 8) + 1, bw - 2, height / 8 - 2);
      }
    }
  };

  audio.addEventListener(
    'play',
    () => {
      if (audioCtx) return void audioCtx.resume();
      try {
        audioCtx = new AudioContext();
        const src = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);
        analyser.connect(audioCtx.destination);
      } catch {
        analyser = null; // le son continue sans visualiseur
      }
    },
    { signal: win.signal },
  );
  audio.addEventListener(
    'error',
    () => title.replaceChildren(h('span', { class: 'app-error', text: 'Fichier audio introuvable.' })),
    { signal: win.signal },
  );
  draw();

  win.onDispose(() => {
    cancelAnimationFrame(raf);
    stopMedia(audio);
    void audioCtx?.close();
  });
}
