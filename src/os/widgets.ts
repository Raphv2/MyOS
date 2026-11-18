import { OWNER } from '../config';
import { isMobile } from '../core/device';
import { h, img } from '../core/dom';

function widget(id: string, title: string, bodyId: string, ...content: Node[]): HTMLDivElement {
  const close = h('div', { class: 'close-btn', attrs: { role: 'button', 'aria-label': `Fermer ${title}` } });
  const el = h(
    'div',
    { id, class: 'widget' },
    h('div', { class: 'top_widget' }, close, h('div', { class: 'application_name', text: title })),
    h('div', { id: bodyId, class: 'border-inner-contener widget-body' }, ...content),
  );
  close.addEventListener('click', () => {
    el.remove();
    window.dispatchEvent(new Event('myos:layout')); // les icônes reprennent la place libérée
  });
  return el;
}

/**
 * Widgets déplaçables par leur barre de titre (PC), position mémorisée en % de l'écran.
 * `onMove(final)` est appelé pendant le déplacement (final = false) et au lâcher (true).
 */
export function enableWidgetDrag(
  screen: HTMLElement,
  saved: Record<string, [number, number]>,
  onMove: (final: boolean) => void,
  signal: AbortSignal,
): void {
  if (isMobile) return; // sur mobile, le CSS d'origine place le widget contact
  for (const [id, [left, top]] of Object.entries(saved)) {
    const w = document.getElementById(id);
    if (w?.classList.contains('widget') && screen.contains(w)) {
      w.style.left = `${left}%`;
      w.style.top = `${top}%`;
    }
  }

  screen.addEventListener(
    'pointerdown',
    (e) => {
      const target = e.target as Element;
      const bar = target.closest<HTMLElement>('.top_widget');
      const w = bar?.closest<HTMLElement>('.widget');
      if (!bar || !w || e.button !== 0 || target.closest('.close-btn')) return;
      e.preventDefault();
      const sr = screen.getBoundingClientRect();
      const r = w.getBoundingClientRect();
      const topBar = screen.querySelector('.rectangular-bar-top')?.getBoundingClientRect();
      const minTop = topBar && topBar.height ? topBar.bottom - sr.top : 0;
      const shiftX = e.clientX - r.left;
      const shiftY = e.clientY - r.top;
      let left = ((r.left - sr.left) / sr.width) * 100;
      let top = ((r.top - sr.top) / sr.height) * 100;
      bar.setPointerCapture(e.pointerId);
      w.classList.add('is-dragging');

      const move = (ev: PointerEvent) => {
        const x = Math.min(Math.max(ev.clientX - shiftX - sr.left, 0), sr.width - r.width);
        const y = Math.min(Math.max(ev.clientY - shiftY - sr.top, minTop), sr.height - r.height);
        left = (x / sr.width) * 100;
        top = (y / sr.height) * 100;
        w.style.left = `${left}%`;
        w.style.top = `${top}%`;
        onMove(false);
      };
      const up = () => {
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
        bar.removeEventListener('pointercancel', up);
        w.classList.remove('is-dragging');
        saved[w.id] = [Math.round(left * 100) / 100, Math.round(top * 100) / 100];
        onMove(true);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
      bar.addEventListener('pointercancel', up);
    },
    { signal },
  );
}

export function bioParagraph(): HTMLParagraphElement {
  const p = h('p', { class: 'profile_subtitle profile_bio' });
  OWNER.bio.forEach((line, i) => {
    if (i) p.appendChild(h('br'));
    p.appendChild(document.createTextNode(line));
  });
  return p;
}

/** L'œil qui suit la souris, revient au centre puis bouge tout seul quand on ne fait rien. */
export function eyeWidget(signal: AbortSignal): HTMLDivElement {
  const eye = img('/img/eye.png', 'eye-pupil', '');
  eye.id = 'eye';
  const content = h(
    'div',
    { class: 'content', id: 'content_eye_widget' },
    img('/img/eye_gif.gif', 'widget-fill', ''),
    h('div', { class: 'eye-socket' }, eye),
  );
  const el = widget('eye_widget', 'eye_widget', 'eye_border_inner_contener', content);
  followMouse(eye, content, 1, signal);
  return el;
}

export function profileWidget(signal: AbortSignal): HTMLDivElement {
  const content = h(
    'div',
    { class: 'content', id: 'content_profile_widget' },
    h('div', { class: 'profile_image_dropdown' }),
    h('p', { class: 'raph_name' }, h('span', { class: 'sr-only', text: OWNER.name }), h('span', { text: terminalTag(OWNER.name), attrs: { 'aria-hidden': 'true' } })),
    terminal(OWNER.bio, signal),
  );
  return widget('profile_widget', 'profile_widget', 'profile_border_inner_contener', content);
}

/** « Raphaël Gosset » → « ====RAPHAEL GOSSET==== » (sans accents, en majuscules) */
function terminalTag(name: string): string {
  const id = name.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
  return `====${id}====`;
}

/**
 * Petit terminal pour de faux : la bio s'écrit lettre par lettre derrière un « > », puis on
 * peut taper une commande (help, clear, exit). `exit` ferme le widget comme la croix.
 */
function terminal(lines: string[], signal: AbortSignal): HTMLDivElement {
  const row = (text: string) => h('div', { class: 'term-line' }, h('span', { class: 'term-prompt', text: '> ' }), text);
  const out = h('div', { class: 'term-out', attrs: { 'aria-live': 'polite' } });
  const typed = h('span', { class: 'term-typed' });
  const cursor = h('span', { class: 'term-cursor' });
  const input = h('input', {
    class: 'term-input',
    attrs: { type: 'text', maxlength: '60', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Commande' },
  });
  const inputRow = h('div', { class: 'term-line term-input-line' }, h('span', { class: 'term-prompt', text: '> ' }), typed, cursor, input);
  const el = h('div', { class: 'profile_terminal' }, h('p', { class: 'sr-only', text: lines.join(' ') }), out);

  // --- Écriture de la bio (~28 ms par lettre, pause entre les lignes, après le fondu du widget)
  const bio = h('div', { attrs: { 'aria-hidden': 'true' } });
  out.appendChild(bio);
  // Les lignes n'apparaissent (avec leur « > ») qu'au moment où elles commencent à s'écrire.
  const nodes = lines.map(() => {
    const t = document.createTextNode('');
    row('').appendChild(t);
    return t;
  });
  let r = 0;
  let c = 0;
  let timer = 0;
  const ready = () => {
    window.clearTimeout(timer);
    nodes.forEach((t, i) => {
      t.data = lines[i] ?? '';
      if (!t.parentElement!.isConnected) bio.appendChild(t.parentElement!);
    });
    if (!inputRow.isConnected) el.appendChild(inputRow);
    inputRow.insertBefore(cursor, input);
  };
  const tick = () => {
    const text = lines[r];
    if (text === undefined) return ready();
    const line = nodes[r]!.parentElement!;
    if (!line.isConnected) bio.appendChild(line);
    if (cursor.parentElement !== line) line.appendChild(cursor);
    nodes[r]!.data = text.slice(0, ++c);
    if (c >= text.length) {
      r++;
      c = 0;
    }
    timer = window.setTimeout(tick, c === 0 ? 380 : 28);
  };
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ready();
  else timer = window.setTimeout(tick, 1200);
  signal.addEventListener('abort', () => window.clearTimeout(timer));

  // --- Commandes
  const print = (...texts: string[]) => texts.forEach((t) => out.appendChild(h('div', { class: 'term-line term-reply', text: t })));
  const run = (cmd: string) => {
    out.appendChild(row(cmd));
    const name = cmd.trim().toLowerCase();
    if (name === 'exit') {
      el.closest('.widget')?.querySelector<HTMLElement>('.close-btn')?.click();
      return;
    }
    if (name === 'clear') out.replaceChildren();
    else if (name === 'help') print('help   liste des commandes', "clear  efface l'écran", 'exit   ferme la fenêtre');
    else if (name) print(`${name.split(/\s/)[0]}: commande introuvable (tape help)`);
  };
  const sync = () => {
    input.setSelectionRange(input.value.length, input.value.length); // le curseur reste en bout de ligne
    typed.textContent = input.value;
  };
  input.addEventListener('input', sync, { signal });
  input.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation(); // ne pas quitter le plein écran
        input.blur();
      } else if (e.key === 'Enter') {
        run(input.value);
        input.value = '';
        sync();
      } else window.setTimeout(sync);
      el.scrollTop = el.scrollHeight;
    },
    { signal },
  );
  input.addEventListener('focus', () => el.classList.add('is-focused'), { signal });
  input.addEventListener('blur', () => el.classList.remove('is-focused'), { signal });
  // Un clic dans le terminal termine l'écriture et donne la main au clavier.
  el.addEventListener(
    'click',
    () => {
      if (window.getSelection()?.toString()) return; // laisse copier du texte
      ready();
      input.focus({ preventScroll: true });
      el.scrollTop = el.scrollHeight;
    },
    { signal },
  );
  return el;
}

/** Widget contact : la spirale ouvre un mail (Spirale.exe). */
export function contactWidget(onSpirale: () => void, signal: AbortSignal): HTMLDivElement {
  const spirale = img('/img/spirale.png', 'spirale', 'Me contacter');
  spirale.id = 'Spirale.exe';
  spirale.setAttribute('role', 'button');
  spirale.tabIndex = 0;
  const content = h(
    'div',
    { class: 'content', id: 'content_contact_widget' },
    img('/img/IMAGE_fond.png', 'widget-fill', ''),
    h('div', { class: 'contact-overlay' }, spirale, h('p', { class: 'contact-hint', text: '↑ CLICK HERE ↑' })),
  );
  spirale.addEventListener('click', onSpirale, { signal });
  spirale.addEventListener('keydown', (e) => e.key === 'Enter' && onSpirale(), { signal });
  return widget('contact_us', 'CONTACT_US', 'contact_border_inner_contener', content);
}

function followMouse(eye: HTMLElement, container: HTMLElement, radius: number, signal: AbortSignal) {
  let timeout = 0;
  let frame = 0;
  let wander = 0;
  const ease = (t: number) => 1 - Math.exp(-5 * t * t);

  const stopAll = () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(timeout);
    window.clearInterval(wander);
  };
  signal.addEventListener('abort', stopAll);

  document.addEventListener(
    'mousemove',
    (e) => {
      stopAll();
      const r = container.getBoundingClientRect();
      const dx = e.clientX - r.left - r.width / 2;
      const dy = e.clientY - r.top - r.height / 2;
      const max = radius * (window.innerWidth / 100);
      const dist = Math.hypot(dx, dy);
      let x = dx;
      let y = dy;
      if (dist >= max) {
        const a = Math.atan2(dy, dx);
        x = Math.cos(a) * max;
        y = Math.sin(a) * max;
      }
      eye.style.transform = `translate(${x}px, ${y}px)`;

      timeout = window.setTimeout(() => {
        let t0 = 0;
        const back = (ts: number) => {
          t0 ||= ts;
          const p = Math.min((ts - t0) / 500, 1);
          const k = 1 - ease(p);
          eye.style.transform = `translate(${x * k}px, ${y * k}px)`;
          if (p < 1) frame = requestAnimationFrame(back);
          else
            wander = window.setInterval(() => {
              eye.style.transform = `translate(${(Math.random() - 0.5) * 10}px, ${(Math.random() - 0.5) * 4}px)`;
            }, 500);
        };
        frame = requestAnimationFrame(back);
      }, 1000);
    },
    { signal },
  );
}
