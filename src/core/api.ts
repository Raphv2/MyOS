import type { TreeData } from '../types';

function isTree(v: unknown): v is TreeData {
  return (
    typeof v === 'object' &&
    v !== null &&
    Array.isArray((v as TreeData).folders) &&
    Array.isArray((v as TreeData).files)
  );
}

/**
 * Charge l'arborescence : d'abord l'API PHP (lecture directe en base),
 * sinon l'instantané `data.json` (même format que l'ancien site).
 */
export async function fetchTree(): Promise<TreeData> {
  try {
    const res = await fetch('/api/tree.php', { headers: { Accept: 'application/json' }, cache: 'no-cache' });
    if (res.ok) {
      const json: unknown = await res.json();
      if (isTree(json)) return json;
    }
  } catch {
    /* API absente (dev sans PHP) ou base indisponible : on passe au fallback */
  }
  const res = await fetch('/data.json', { cache: 'no-cache' });
  const json: unknown = await res.json();
  if (!isTree(json)) throw new Error('data.json invalide');
  return json;
}

/** Récupère un fichier texte (code, txt, md…). Lève une erreur explicite si absent. */
export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText || 'Fichier introuvable'}`);
  const type = res.headers.get('Content-Type') ?? '';
  // Hostinger renvoie une page HTML 200 pour certaines erreurs : on la refuse pour un .txt.
  if (type.includes('text/html') && !/\.html?$/i.test(new URL(url, location.href).pathname)) {
    throw new Error('Fichier introuvable');
  }
  return res.text();
}
