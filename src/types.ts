/**
 * Types qui reflètent EXACTEMENT le schéma MySQL de prod (base `file_explorer`).
 * Ne pas modifier : l'admin existant écrit dans ces tables.
 */

/** Ligne de la table `folders`. */
export interface FolderRow {
  id: number;
  name: string;
  parent_id: number | null;
}

/** Ligne de la table `files`. */
export interface FileRow {
  id: number;
  name: string;
  /** Ex. `png`, `pdf`, `blend`, `txt`, `shortcut`, `github`, `linkedin`… */
  extension: string;
  folder_id: number | null;
  size: number;
  created_at: string | null;
  updated_at: string | null;
  /** Toujours `file` en prod. */
  type: string | null;
  /** Chemin serveur, ex. `domains/raphaelgosset.fr/public_html/img/pdf/RG_cv.pdf`. */
  path: string | null;
}

/** Ce que renvoie `api/tree.php` (et `data.json`, même format que l'ancien site). */
export interface TreeData {
  folders: FolderRow[];
  files: FileRow[];
}
