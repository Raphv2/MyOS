/**
 * Mémorise la disposition du bureau dans le navigateur du visiteur :
 * place des icônes (en fraction de la grille, pour survivre au passage plein écran)
 * et position des widgets (en % de l'écran).
 */
export interface DesktopLayout {
  icons: Record<string, [number, number]>;
  widgets: Record<string, [number, number]>;
}

const KEY = 'myos-desktop-v1';

const isPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

export function loadLayout(): DesktopLayout {
  const empty: DesktopLayout = { icons: {}, widgets: {} };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<DesktopLayout> | null;
    if (!raw || typeof raw !== 'object') return empty;
    const clean = (o: unknown) =>
      Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([, v]) => isPair(v))) as Record<string, [number, number]>;
    return { icons: clean(raw.icons), widgets: clean(raw.widgets) };
  } catch {
    return empty;
  }
}

export function saveLayout(layout: DesktopLayout): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {
    /* navigation privée ou stockage plein : la disposition ne sera simplement pas retenue */
  }
}
