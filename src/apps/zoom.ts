import { clamp } from '../core/dom';

/**
 * Zoom (molette, slider, pinch) et déplacement (glisser) d'une image centrée.
 * Corrige l'ancien saut de l'image au premier zoom : le centrage -50% est conservé.
 */
export function attachZoomPan(
  container: HTMLElement,
  target: HTMLElement,
  slider: HTMLInputElement,
  signal: AbortSignal,
  opts: { min?: number; max?: number } = {},
): { reset(): void } {
  const min = opts.min ?? 0.1;
  const max = opts.max ?? 2;
  let scale = 1;
  let x = 0;
  let y = 0;

  const apply = () => {
    target.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
    slider.value = String(scale);
  };

  const zoomAt = (next: number, clientX: number, clientY: number) => {
    const rect = container.getBoundingClientRect();
    // Zoom vers le pointeur.
    const px = clientX - (rect.left + rect.width / 2) - x;
    const py = clientY - (rect.top + rect.height / 2) - y;
    const k = next / scale - 1;
    x -= px * k;
    y -= py * k;
    scale = next;
    apply();
  };

  slider.addEventListener('input', () => {
    scale = clamp(parseFloat(slider.value) || 1, min, max);
    apply();
  }, { signal });

  container.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomAt(clamp(scale + (e.deltaY < 0 ? 0.1 : -0.1), min, max), e.clientX, e.clientY);
    },
    { passive: false, signal },
  );

  // Glisser (souris / doigt) + pinch à deux doigts.
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart = 0;
  let pinchScale = 1;

  container.addEventListener(
    'pointerdown',
    (e) => {
      container.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStart = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        pinchScale = scale;
      }
      container.classList.add('is-grabbing');
    },
    { signal },
  );
  container.addEventListener(
    'pointermove',
    (e) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (pointers.size === 1) {
        x += cur.x - prev.x;
        y += cur.y - prev.y;
        apply();
      } else if (pointers.size === 2 && pinchStart > 0) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        scale = clamp(pinchScale * (d / pinchStart), min, max);
        apply();
      }
    },
    { signal },
  );
  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (pointers.size === 0) container.classList.remove('is-grabbing');
  };
  container.addEventListener('pointerup', end, { signal });
  container.addEventListener('pointercancel', end, { signal });

  const reset = () => {
    scale = 1;
    x = 0;
    y = 0;
    apply();
  };
  container.addEventListener('dblclick', reset, { signal });
  target.addEventListener('dragstart', (e) => e.preventDefault(), { signal });
  apply();
  return { reset };
}
