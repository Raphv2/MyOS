type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  id?: string;
  text?: string;
  title?: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string | number>;
  style?: Partial<CSSStyleDeclaration>;
}

/**
 * Petit utilitaire de création d'éléments, sans innerHTML (pas d'injection possible
 * via un nom de fichier, contrairement à l'ancien code).
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.id) el.id = props.id;
    if (props.text !== undefined) el.textContent = props.text;
    if (props.title) el.title = props.title;
    if (props.attrs) {
      for (const [k, v] of Object.entries(props.attrs)) {
        if (v === false || v === null || v === undefined) continue;
        el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    if (props.dataset) for (const [k, v] of Object.entries(props.dataset)) el.dataset[k] = String(v);
    if (props.style) Object.assign(el.style, props.style);
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    parent.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export function img(src: string, cls = '', alt = ''): HTMLImageElement {
  const el = h('img', { class: cls, attrs: { src, alt, draggable: 'false' } });
  return el;
}

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Élément introuvable : ${selector}`);
  return el;
}

export function qsMaybe<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

export const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Formatte une durée en secondes en `m:ss`. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Taille lisible : 329894 → `322 Ko`. */
export function formatSize(bytes: number): string {
  if (!bytes) return '—';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}
