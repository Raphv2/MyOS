import { OWNER } from '../config';
import { h, img } from '../core/dom';

function widget(id: string, title: string, bodyId: string, ...content: Node[]): HTMLDivElement {
  const close = h('div', { class: 'close-btn', attrs: { role: 'button', 'aria-label': `Fermer ${title}` } });
  const el = h(
    'div',
    { id, class: 'widget' },
    h('div', { class: 'top_widget' }, close, h('div', { class: 'application_name', text: title })),
    h('div', { id: bodyId, class: 'border-inner-contener widget-body' }, ...content),
  );
  close.addEventListener('click', () => el.remove());
  return el;
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

export function profileWidget(): HTMLDivElement {
  const content = h(
    'div',
    { class: 'content', id: 'content_profile_widget' },
    h('div', { class: 'profile_image_dropdown' }),
    h('p', { class: 'raph_name', text: OWNER.name }),
    bioParagraph(),
  );
  return widget('profile_widget', 'profile_widget', 'profile_border_inner_contener', content);
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
