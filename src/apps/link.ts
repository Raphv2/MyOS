import { LINKS } from '../config';
import { h } from '../core/dom';
import { baseName, type FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';

const ASCII = {
  linkedin: `###+++
###+-+#
 #####
###+++###+++#++++++#
###+-+###++++++++-.-+
###+-+###++-+###++--+#
###+-+###+--#  ##+---#
###+-+###+--#  ##+---#
###+-+###+--#  ##+---#
###+-+###+--#  ##+---#
###+++###+++#  ##++-+#
#############   ######`,
  github: `     ++++++#++++
   #++###    ###+++
 ++#+           ##++
 +## ##+#+#++##+  ##+
+#+  #####++++++   ##+
#+  #######++++++   #+
#+  ##########+++   #+
+#+ + ##########   #++
 ++ ### ###++     ##++
 ++++##+####++   ##+#
   ###+#####++###++
     +######+++++`,
  spirale: `            ===============
     ===+%@@      %@%*==
   ===+@   =========
  ==+% ===+#@%***%@*===
 ==+#  =+#@==+***+==#*===
 ===  ==# =+%%===*%+=+*===
 === === ==+ ===+==+== *==
 *==  ==  +==%%%==+=== ===
  +== *+== %++++*%==*# ===
  #*== #+===    ==+*% ==*#
   #*+== #*+++++*#   ==+#
     %*===         ===#@
        **+=======+**#
            @@@@@`,
} as const;

/** Trouve la cible d'un « .exe » : extension métier, nom, ou URL stockée dans `path`. */
export function linkTarget(file: FsFile, mobile: boolean): { url: string; ascii: keyof typeof ASCII } | null {
  const key = [file.ext, baseName(file.name).toLowerCase()].find((k) => k in LINKS);
  if (key) {
    const l = LINKS[key]!;
    return { url: mobile && l.mobileUrl ? l.mobileUrl : l.url, ascii: l.ascii };
  }
  if (file.url && /^https?:\/\//.test(file.url)) return { url: file.url, ascii: 'spirale' };
  return null;
}

/**
 * « Lance » un .exe : animation de chargement ASCII pendant 1,5 s puis ouvre
 * le lien dans un nouvel onglet et ferme la fenêtre (comme l'ancien site).
 */
export function openLink(os: Os, file: FsFile): void {
  const target = linkTarget(file, os.mobile);
  if (!target) {
    os.openError('error', `${file.name} : programme introuvable.`);
    return;
  }
  runLink(os, `file:${file.id}`, file.name, fileIcon(file), target.url, target.ascii);
}

export function runLink(os: Os, key: string, title: string, icon: string, url: string, ascii: keyof typeof ASCII): void {
  const { win, created } = os.wm.open({ key, title, icon });
  if (!created) return;
  const area = h('textarea', { class: 'loading_url', attrs: { readonly: true, 'aria-label': `Ouverture de ${url}` } });
  win.body.append(h('div', { class: 'content' }, area));

  const duration = 1500;
  const step = 15;
  const total = duration / step;
  const bar = 30;
  let progress = 0;
  const timer = window.setInterval(() => {
    if (progress > total) {
      window.clearInterval(timer);
      window.open(url, '_blank', 'noopener');
      win.close();
      return;
    }
    const dots = ['.', '..', '...'][progress % 3];
    const fill = Math.floor((progress / total) * bar);
    const pct = Math.floor((progress / total) * 100);
    area.value = `${ASCII[ascii]}\n\nRedirection${dots}  [${'#'.repeat(fill)}${' '.repeat(bar - fill)}] ${pct}%\n`;
    progress++;
  }, step);
  win.onDispose(() => window.clearInterval(timer));
}
