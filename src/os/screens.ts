import { OWNER } from '../config';
import { h, img } from '../core/dom';
import { clockEl, fullscreenTab, osLogo, topSeparator } from './chrome';
import { startClock } from './ui';

export interface ScreenEnv {
  go(page: 'start' | 'accueil' | 'endoflight'): void;
  exitFullscreen(): void;
}

/** Écran de démarrage : vidéo de boot MyOS puis carte de profil + LOGIN. */
export function mountStart(root: HTMLElement, env: ScreenEnv): () => void {
  const ctrl = new AbortController();
  const { signal } = ctrl;
  const clock = clockEl();
  const video = h('video', {
    id: 'start_myos_video',
    class: 'start_myos_video',
    attrs: { src: '/img/MyOS_loading.mp4', muted: true, autoplay: true, playsinline: true },
  });
  video.muted = true; // requis pour l'autoplay
  const login = h('a', { class: 'start_button', text: 'LOGIN', attrs: { href: '?page=accueil' } });
  login.addEventListener('click', (e) => {
    e.preventDefault();
    env.go('accueil');
  }, { signal });

  root.append(
    h(
      'div',
      { class: 'screen_start' },
      video,
      fullscreenTab(env.exitFullscreen, signal),
      h('div', { class: 'rectangular-bar-top' }, osLogo(), topSeparator(), clock),
      h(
        'div',
        { class: 'container_profile' },
        h(
          'div',
          { class: 'landing-profile-container' },
          h('div', { class: 'profile_image_contener' }),
          h('p', { class: 'profile_name', text: OWNER.startName }),
          h('p', { class: 'profile_subtitle', text: OWNER.title }),
        ),
        h('div', { class: 'landing-start-container' }, h('h2', { id: 'landing-start-button', class: 'landing-start-text' }, login)),
      ),
    ),
  );
  void video.play().catch(() => undefined);
  const stopClock = startClock(clock);
  return () => {
    stopClock();
    ctrl.abort();
  };
}

/** TV éteinte : le GIF d'extinction, puis écran noir. */
export function mountOff(root: HTMLElement, env: ScreenEnv): () => void {
  const ctrl = new AbortController();
  // Paramètre unique : relance l'animation du GIF à chaque extinction.
  const gif = img(`/img/tv_off.gif?t=${Date.now()}`, 'end', '');
  gif.id = 'end';
  root.append(gif, fullscreenTab(env.exitFullscreen, ctrl.signal), h('div', { class: 'tv_off' }));
  const t = window.setTimeout(() => gif.classList.add('hidden'), 600);
  return () => {
    window.clearTimeout(t);
    ctrl.abort();
  };
}
