import type { FsFile } from '../core/fs';
import { fileIcon } from '../core/icons';
import type { Os } from '../os/context';
import { openAudio } from './audio';
import { openImage } from './image';
import { openLink } from './link';
import { openText } from './text';
import { openVideo } from './video';

/**
 * Ouvre un fichier avec l'application qui correspond à sa colonne `extension`.
 * Les applis lourdes (3D, PDF, IDE…) sont chargées à la demande.
 */
export function launch(os: Os, file: FsFile): void {
  const lazy = (load: () => Promise<{ open(os: Os, file: FsFile): void | Promise<void> }>) =>
    load()
      .then((m) => m.open(os, file))
      .catch((err: unknown) => {
        console.error(err);
        os.openError('error', `Impossible d'ouvrir ${file.name}.`);
      });

  switch (file.app) {
    case 'shortcut': {
      const target = os.fs.targetFolder(file);
      if (target) os.openFolder(target, `explorer:${file.name}`);
      else os.openError('error', `Le dossier « ${file.name} » est introuvable.`);
      break;
    }
    case 'project':
      void lazy(() => import('./project'));
      break;
    case 'link':
      openLink(os, file);
      break;
    case 'image':
      openImage(os, file);
      break;
    case 'text':
      openText(os, file);
      break;
    case 'audio':
      openAudio(os, file);
      break;
    case 'video':
      openVideo(os, file);
      break;
    case 'pdf':
      void lazy(() => import('./pdf'));
      break;
    case 'model3d':
      void lazy(() => import('./model3d'));
      break;
    case 'markdown':
      void lazy(() => import('./markdown'));
      break;
    case 'shader':
      void lazy(() => import('./shader'));
      break;
    case 'code':
      void lazy(() => import('./code'));
      break;
    default:
      os.openError('error', `Aucune application ne sait ouvrir « ${file.name} ».`);
      return;
  }

  os.recents.add({
    key: `file:${file.id}`,
    label: file.name,
    icon: fileIcon(file, { onDesktop: file.folderId !== null, projectLogo: os.projectLogo(file) }),
    open: () => launch(os, file),
  });
}
