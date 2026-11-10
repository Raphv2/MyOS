/** Client de l'API admin (session par cookie HttpOnly + jeton CSRF en mémoire). */

export interface AdminStatus {
  authenticated: boolean;
  configured: boolean;
  csrf?: string;
  limits?: { maxFileMb: number; extensions: string[] };
  protected?: number[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let csrf = '';
let limits: AdminStatus['limits'] = { maxFileMb: 0, extensions: [] };
let protectedIds: number[] = [];

export const getLimits = () => limits;
export const isProtected = (folderId: number) => protectedIds.includes(folderId);

function remember(s: AdminStatus): AdminStatus {
  if (s.csrf) csrf = s.csrf;
  if (s.limits) limits = s.limits;
  if (s.protected) protectedIds = s.protected;
  return s;
}

async function parse<T>(res: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* réponse non JSON */
  }
  if (!res.ok) {
    const msg = (body as { error?: string } | null)?.error ?? `Erreur ${res.status}`;
    throw new ApiError(msg, res.status);
  }
  return body as T;
}

export async function status(): Promise<AdminStatus> {
  const res = await fetch('/api/auth.php', { credentials: 'same-origin', cache: 'no-store' });
  return remember(await parse<AdminStatus>(res));
}

export async function login(password: string): Promise<AdminStatus> {
  const res = await fetch('/api/auth.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', password }),
  });
  return remember(await parse<AdminStatus>(res));
}

export async function logout(): Promise<void> {
  await fetch('/api/auth.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ action: 'logout' }),
  });
  csrf = '';
}

export interface ActionResult {
  ok: true;
  id?: number;
  path?: string;
}

export async function action(name: string, payload: Record<string, unknown>): Promise<ActionResult> {
  const res = await fetch('/api/admin.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: JSON.stringify({ action: name, ...payload }),
  });
  return parse<ActionResult>(res);
}

/** Envoi d'un fichier avec progression (XHR, fetch ne donne pas l'avancement de l'upload). */
export function upload(
  file: File | Blob,
  name: string,
  folderId: number,
  onProgress: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<ActionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin.php');
    xhr.withCredentials = true;
    xhr.setRequestHeader('X-CSRF-Token', csrf);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: string } & Partial<ActionResult> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non JSON */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.ok) resolve(body as ActionResult);
      else reject(new ApiError(body.error ?? `Erreur ${xhr.status}`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError('Connexion perdue', 0));
    signal?.addEventListener('abort', () => xhr.abort());
    const form = new FormData();
    form.append('action', 'upload');
    form.append('folder_id', String(folderId));
    form.append('name', name);
    form.append('file', file, name);
    xhr.send(form);
  });
}
