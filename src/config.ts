/** Réglages du site. Tout ce qui était codé en dur un peu partout est ici. */

export const OWNER = {
  name: 'Raphaël Gosset',
  startName: 'RAPHAÊL GOSSET',
  title: 'Fullstack Developper',
  email: 'raphaelgosset.pro@gmail.com',
  bio: [
    "Hey! I'm Raph, a fullstack developer.",
    'I built this portfolio to share a bit of my world and offer you a different kind of web experience.',
    'I’ll be happy to help you bring your projects to life, so feel free to get in touch! :)',
  ],
};

/** Id du dossier « Desktop » dans la table `folders` (bureau = son contenu). */
export const DESKTOP_FOLDER_ID = 8;
/** Id du dossier utilisateur (`C:/Users/Raphaël Gosset`) : sa liste latérale dans l'explorateur. */
export const USER_FOLDER_ID = 3;

/**
 * Liens ouverts par les « .exe ». La clé est la colonne `extension`
 * (`github`, `linkedin`) ou le nom sans `.exe`, en minuscules.
 */
export const LINKS: Record<string, { url: string; mobileUrl?: string; ascii: 'github' | 'linkedin' | 'spirale' }> = {
  github: { url: 'https://github.com/Raphv2', ascii: 'github' },
  linkedin: { url: 'https://www.linkedin.com/in/raphael-gosset/', ascii: 'linkedin' },
  spirale: {
    url: `https://mail.google.com/mail/?view=cm&fs=1&to=${OWNER.email}&su=Demande%20de%20contact`,
    mobileUrl: `intent://send/?to=${OWNER.email}&subject=Demande%20de%20contact#Intent;scheme=mailto;package=com.google.android.gm;end`,
    ascii: 'spirale',
  },
};

/**
 * Taille visée d'une case de la grille du bureau, en vw / vh (comme le reste du CSS).
 * La grille remplit l'écran avec autant de cases entières que possible : une icône par case.
 */
export interface IconCell {
  cellW: number;
  cellH: number;
}

export const ICON_CELL: Record<'tv' | 'fullscreen' | 'mobile', IconCell> = {
  tv: { cellW: 6.8, cellH: 12 },
  fullscreen: { cellW: 6.8, cellH: 12 },
  // Mobile : mêmes 5 colonnes qu'avant (la taille des icônes vient du CSS mobile d'origine).
  mobile: { cellW: 19, cellH: 10 },
};

/** Nombre max de fichiers récents dans le menu Start. */
export const MAX_RECENTS = 6;
