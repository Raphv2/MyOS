import type { FsFile, FsFolder, VirtualFS } from '../core/fs';
import type { Recents } from './recents';
import type { WindowManager } from './window-manager';

/**
 * Ce que l'OS met à disposition des applications. Une seule instance par montage du bureau.
 */
export interface Os {
  /** Arborescence courante (remplacée après chaque modification dans l'admin). */
  readonly fs: VirtualFS;
  readonly wm: WindowManager;
  readonly screen: HTMLElement;
  readonly recents: Recents;
  readonly mobile: boolean;
  /** Ouvre un fichier avec la bonne application. */
  launch(file: FsFile): void;
  /** Ouvre l'explorateur sur un dossier. `key` : identité de la fenêtre (une par point d'entrée). */
  openFolder(folder: FsFolder, key?: string): void;
  /** Fenêtre d'erreur rétro. */
  openError(title: string, message: string): void;
  /** Recharge l'arborescence depuis l'API et prévient les fenêtres ouvertes. */
  reloadTree(): Promise<void>;
  /** Abonnement aux changements d'arborescence. Retourne la fonction de désabonnement. */
  onTreeChange(fn: () => void, signal?: AbortSignal): void;
  /** Logo d'un projet (fichier `logo.*` dans son dossier), sinon null. */
  projectLogo(file: FsFile): string | null;
}
