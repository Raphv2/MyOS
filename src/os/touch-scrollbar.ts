import { isMobile } from '../core/device';
import { h } from '../core/dom';

/**
 * iPhone (Safari, Chrome iOS… tous en WebKit iOS) : les styles ::-webkit-scrollbar sont ignorés,
 * on n'y voit que la fine barre native qui disparaît. On dessine donc notre barre (même look que
 * sur PC) par-dessus la zone qui défile, pendant le défilement, puis elle s'efface.
 * Sur Android et PC, la barre CSS s'affiche déjà : rien n'est installé.
 */
export function installTouchScrollbar(): void {
  if (!isMobile || cssScrollbarWorks()) return;

  const thumb = h('div', { class: 'touch-sb-thumb' });
  const track = h('div', { class: 'touch-sb', attrs: { 'aria-hidden': 'true' } }, thumb);
  document.body.appendChild(track);

  let target: HTMLElement | null = null;
  let hideTimer = 0;
  let raf = 0;

  const hide = () => track.classList.remove('is-on');
  const place = () => {
    raf = 0;
    if (!target || !target.isConnected) return hide();
    const { scrollTop, scrollHeight, clientHeight } = target;
    if (scrollHeight <= clientHeight + 1) return hide();
    const r = target.getBoundingClientRect();
    const w = track.offsetWidth;
    const th = Math.max(clientHeight * (clientHeight / scrollHeight), w * 2);
    const top = (clientHeight - th) * (scrollTop / (scrollHeight - clientHeight));
    track.style.left = `${r.left + target.clientLeft + target.clientWidth - w}px`;
    track.style.top = `${r.top + target.clientTop}px`;
    track.style.height = `${clientHeight}px`;
    thumb.style.height = `${th}px`;
    thumb.style.transform = `translateY(${top}px)`;
    track.classList.toggle('is-term', !!target.closest('.profile_terminal, .doc-terminal'));
    track.classList.add('is-on');
  };

  document.addEventListener(
    'scroll',
    (e) => {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return; // la page elle-même ne défile pas
      target = el;
      if (!raf) raf = requestAnimationFrame(place);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hide, 1200);
    },
    { capture: true, passive: true },
  );
}

/** La barre CSS maison s'affiche-t-elle ? (iPhone : non, la barre native ne prend aucune place) */
function cssScrollbarWorks(): boolean {
  const probe = h('div', { style: { position: 'absolute', top: '-999px', width: '100px', height: '50px', overflow: 'scroll' } });
  document.body.appendChild(probe);
  const width = probe.offsetWidth - probe.clientWidth;
  probe.remove();
  return width > 0;
}
