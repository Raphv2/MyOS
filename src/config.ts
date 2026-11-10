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

/** Grille des icônes du bureau (en vw/vh, relative à l'écran), reprise de l'ancien index.js. */
export interface GridConfig {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  stepWidth: number;
  stepHeight: number;
}

export const GRID: Record<'tv' | 'fullscreen' | 'mobile', GridConfig> = {
  tv: { minWidth: 0, maxWidth: 75, minHeight: 5, maxHeight: 60, stepWidth: 8, stepHeight: 10 },
  fullscreen: { minWidth: 0, maxWidth: 90, minHeight: 10, maxHeight: 80, stepWidth: 8, stepHeight: 10 },
  mobile: { minWidth: 0, maxWidth: 80, minHeight: 10, maxHeight: 70, stepWidth: 20, stepHeight: 10 },
};

/** Nombre max de fichiers récents dans le menu Start. */
export const MAX_RECENTS = 6;
