import { h } from '../core/dom';
import type { VirtualFS } from '../core/fs';

export type Field =
  | { kind: 'text'; name: string; label: string; value?: string; placeholder?: string; required?: boolean }
  | { kind: 'textarea'; name: string; label: string; value?: string; placeholder?: string }
  | { kind: 'folder'; name: string; label: string; value?: number; exclude?: (id: number) => boolean }
  | { kind: 'file'; name: string; label: string; accept?: string; multiple?: boolean; directory?: boolean }
  | { kind: 'check'; name: string; label: string; value?: boolean }
  | { kind: 'note'; text: string };

export type DialogValues = Record<string, string | number | boolean | File[]>;

/**
 * Boîte de dialogue modale DANS la fenêtre admin (style OS rétro).
 * Résout avec les valeurs, ou null si annulée.
 */
export function dialog(
  host: HTMLElement,
  fs: VirtualFS,
  opts: { title: string; fields: Field[]; confirm: string; danger?: boolean },
): Promise<DialogValues | null> {
  return new Promise((resolve) => {
    const inputs = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();
    const rows = opts.fields.map((f) => {
      if (f.kind === 'note') return h('p', { class: 'admin-note', text: f.text });
      let input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      switch (f.kind) {
        case 'text':
          input = h('input', { attrs: { type: 'text', placeholder: f.placeholder ?? '', required: !!f.required, autocomplete: 'off' } });
          input.value = f.value ?? '';
          break;
        case 'textarea':
          input = h('textarea', { attrs: { rows: 6, placeholder: f.placeholder ?? '' } });
          input.value = f.value ?? '';
          break;
        case 'folder': {
          const select = h('select');
          const sorted = [...fs.folders.values()]
            .filter((x) => !f.exclude?.(x.id))
            .map((x) => ({ id: x.id, path: fs.pathOf(x) }))
            .sort((a, b) => a.path.localeCompare(b.path, 'fr'));
          for (const o of sorted) {
            const opt = h('option', { text: o.path, attrs: { value: o.id } });
            if (o.id === f.value) opt.selected = true;
            select.appendChild(opt);
          }
          input = select;
          break;
        }
        case 'file': {
          const fi = h('input', { attrs: { type: 'file', accept: f.accept ?? '', multiple: !!f.multiple } });
          if (f.directory) {
            fi.setAttribute('webkitdirectory', '');
            fi.multiple = true;
          }
          input = fi;
          break;
        }
        case 'check': {
          const cb = h('input', { attrs: { type: 'checkbox' } });
          cb.checked = f.value ?? false;
          inputs.set(f.name, cb);
          return h('label', { class: 'admin-check' }, cb, h('span', { text: f.label }));
        }
      }
      inputs.set(f.name, input);
      return h('label', { class: 'admin-field' }, h('span', { text: f.label }), input);
    });

    const ok = h('button', { class: `os-btn os-btn-wide ${opts.danger ? 'os-btn-danger' : 'os-btn-primary'}`, text: opts.confirm, attrs: { type: 'submit' } });
    const cancel = h('button', { class: 'os-btn os-btn-wide', text: 'Annuler', attrs: { type: 'button' } });
    const form = h(
      'form',
      { class: 'admin-dialog', attrs: { role: 'dialog', 'aria-label': opts.title } },
      h('div', { class: 'top_tab admin-dialog-title' }, h('div', { class: 'application_name', text: opts.title })),
      h('div', { class: 'admin-dialog-body' }, ...rows),
      h('div', { class: 'admin-dialog-actions' }, cancel, ok),
    );
    const overlay = h('div', { class: 'admin-overlay' }, form);
    host.appendChild(overlay);
    (form.querySelector('input:not([type=checkbox]), textarea, select') as HTMLElement | null)?.focus();

    const close = (v: DialogValues | null) => {
      overlay.remove();
      resolve(v);
    };
    cancel.addEventListener('click', () => close(null));
    overlay.addEventListener('keydown', (e) => e.key === 'Escape' && close(null));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const values: DialogValues = {};
      for (const f of opts.fields) {
        if (f.kind === 'note') continue;
        const el = inputs.get(f.name)!;
        if (f.kind === 'check') values[f.name] = (el as HTMLInputElement).checked;
        else if (f.kind === 'file') values[f.name] = [...((el as HTMLInputElement).files ?? [])];
        else if (f.kind === 'folder') values[f.name] = Number(el.value);
        else values[f.name] = el.value.trim();
        if (f.kind === 'text' && f.required && !values[f.name]) {
          el.focus();
          return;
        }
      }
      close(values);
    });
  });
}

/** Confirmation simple. */
export async function confirmBox(host: HTMLElement, fs: VirtualFS, title: string, text: string, confirm = 'OK', danger = false) {
  return (await dialog(host, fs, { title, fields: [{ kind: 'note', text }], confirm, danger })) !== null;
}
