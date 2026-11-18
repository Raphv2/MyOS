import { ICON_CELL, type IconCell } from '../config';

/** Même détection que l'ancien site (le CSS mobile repose aussi sur `pointer: coarse`). */
export const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const FULLSCREEN_KEY = 'fullScreen';

/** Préférence « plein écran » (sans le cadre TV). Forcée sur mobile, comme avant. */
export function getFullscreenPref(): boolean {
  if (isMobile) return true;
  try {
    return localStorage.getItem(FULLSCREEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setFullscreenPref(value: boolean): void {
  try {
    localStorage.setItem(FULLSCREEN_KEY, String(value));
  } catch {
    /* navigation privée : on garde juste l'état en mémoire */
  }
}

export function iconCell(fullscreen: boolean): IconCell {
  if (isMobile) return ICON_CELL.mobile;
  return fullscreen ? ICON_CELL.fullscreen : ICON_CELL.tv;
}
