<?php
/**
 * /api/admin.php — écritures de l'admin intégré (connexion + CSRF obligatoires).
 *
 * Respecte strictement le schéma existant (tables `folders` / `files`) et les
 * conventions des lignes déjà en base :
 *   - path = domains/raphaelgosset.fr/public_html/img/<dossier>/<fichier>
 *   - raccourcis : extension `shortcut`, name = nom du dossier, path = …/img/other/<nom>
 *   - modèles 3D : extension `blend`, name = x.blend, fichier x.glb
 *
 * POST JSON  { action, ... }   ou   POST multipart (action=upload, file, folder_id)
 */
declare(strict_types=1);

define('MYOS_API', true);
require __DIR__ . '/_lib/bootstrap.php';
require __DIR__ . '/_lib/auth.php';
require __DIR__ . '/_lib/files.php';

require_method('POST');
require_admin();

$isUpload = str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data');
$body = $isUpload ? $_POST : read_json();
$action = (string) ($body['action'] ?? '');
$pdo = db();

function int_or_null(mixed $v): ?int
{
    if ($v === null || $v === '' || $v === 'null') {
        return null;
    }
    if (!is_numeric($v)) {
        fail('Identifiant invalide');
    }
    return (int) $v;
}

function folder_row(PDO $pdo, ?int $id): ?array
{
    if ($id === null) {
        return null;
    }
    $st = $pdo->prepare('SELECT id, name, parent_id FROM folders WHERE id = ?');
    $st->execute([$id]);
    return $st->fetch() ?: null;
}

function require_folder(PDO $pdo, mixed $id): array
{
    $row = folder_row($pdo, int_or_null($id));
    if (!$row) {
        fail('Dossier introuvable', 404);
    }
    return $row;
}

function file_row(PDO $pdo, mixed $id): array
{
    $st = $pdo->prepare('SELECT * FROM files WHERE id = ?');
    $st->execute([int_or_null($id)]);
    $row = $st->fetch();
    if (!$row) {
        fail('Fichier introuvable', 404);
    }
    return $row;
}

/** Vrai si $candidate est $folderId ou l'un de ses descendants. */
function is_descendant(PDO $pdo, int $candidate, int $folderId): bool
{
    $seen = [];
    $cur = $candidate;
    while ($cur !== null && !isset($seen[$cur])) {
        if ($cur === $folderId) {
            return true;
        }
        $seen[$cur] = true;
        $row = folder_row($pdo, $cur);
        $cur = $row ? ($row['parent_id'] === null ? null : (int) $row['parent_id']) : null;
    }
    return false;
}

function assert_not_protected(int $id): void
{
    if (in_array($id, protected_folder_ids(), true)) {
        fail('Ce dossier est indispensable au site : il ne peut pas être modifié ici.', 403);
    }
}

function name_taken(PDO $pdo, string $table, string $parentCol, ?int $parent, string $name, ?int $exceptId = null): bool
{
    $sql = "SELECT COUNT(*) FROM {$table} WHERE name = ? AND " . ($parent === null ? "{$parentCol} IS NULL" : "{$parentCol} = ?");
    $params = $parent === null ? [$name] : [$name, $parent];
    if ($exceptId !== null) {
        $sql .= ' AND id <> ?';
        $params[] = $exceptId;
    }
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return (int) $st->fetchColumn() > 0;
}

/** Supprime le fichier disque s'il est dans img/ et qu'aucune autre ligne ne l'utilise. */
function delete_blob_if_unused(PDO $pdo, ?string $path): bool
{
    $disk = path_to_disk($path);
    if (!$disk || !is_file($disk)) {
        return false;
    }
    $st = $pdo->prepare('SELECT COUNT(*) FROM files WHERE path = ?');
    $st->execute([$path]);
    if ((int) $st->fetchColumn() > 0) {
        return false;
    }
    $real = realpath($disk);
    $root = realpath(public_root() . '/img');
    if (!$real || !$root || !str_starts_with($real, $root . DIRECTORY_SEPARATOR)) {
        return false;
    }
    return @unlink($real);
}

switch ($action) {
    case 'createFolder': {
        $parent = require_folder($pdo, $body['parent_id'] ?? null);
        $name = clean_name($body['name'] ?? '');
        if (name_taken($pdo, 'folders', 'parent_id', (int) $parent['id'], $name)) {
            fail('Un dossier porte déjà ce nom ici');
        }
        $pdo->prepare('INSERT INTO folders (name, parent_id) VALUES (?, ?)')->execute([$name, (int) $parent['id']]);
        json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }

    case 'renameFolder': {
        $folder = require_folder($pdo, $body['id'] ?? null);
        assert_not_protected((int) $folder['id']);
        $name = clean_name($body['name'] ?? '');
        $parent = $folder['parent_id'] === null ? null : (int) $folder['parent_id'];
        if (name_taken($pdo, 'folders', 'parent_id', $parent, $name, (int) $folder['id'])) {
            fail('Un dossier porte déjà ce nom ici');
        }
        $pdo->beginTransaction();
        $pdo->prepare('UPDATE folders SET name = ? WHERE id = ?')->execute([$name, (int) $folder['id']]);
        // Les raccourcis / projets pointent vers un dossier par son nom : on les suit.
        if (!empty($body['updateShortcuts'])) {
            $pdo->prepare("UPDATE files SET name = ? WHERE name = ? AND extension IN ('shortcut', 'project')")
                ->execute([$name, $folder['name']]);
        }
        $pdo->commit();
        json_out(['ok' => true]);
    }

    case 'moveFolder': {
        $folder = require_folder($pdo, $body['id'] ?? null);
        assert_not_protected((int) $folder['id']);
        $target = require_folder($pdo, $body['parent_id'] ?? null);
        if (is_descendant($pdo, (int) $target['id'], (int) $folder['id'])) {
            fail('Impossible de déplacer un dossier dans lui-même');
        }
        if (name_taken($pdo, 'folders', 'parent_id', (int) $target['id'], $folder['name'], (int) $folder['id'])) {
            fail('Un dossier porte déjà ce nom dans la destination');
        }
        $pdo->prepare('UPDATE folders SET parent_id = ? WHERE id = ?')->execute([(int) $target['id'], (int) $folder['id']]);
        json_out(['ok' => true]);
    }

    case 'deleteFolder': {
        $folder = require_folder($pdo, $body['id'] ?? null);
        assert_not_protected((int) $folder['id']);
        // Récupère les chemins des fichiers du sous-arbre avant la suppression (cascade en base).
        $ids = [(int) $folder['id']];
        for ($i = 0; $i < count($ids); $i++) {
            $st = $pdo->prepare('SELECT id FROM folders WHERE parent_id = ?');
            $st->execute([$ids[$i]]);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $child) {
                $ids[] = (int) $child;
            }
        }
        foreach ($ids as $fid) {
            if (in_array($fid, protected_folder_ids(), true)) {
                fail('Ce dossier contient un dossier indispensable au site.', 403);
            }
        }
        $in = implode(',', array_fill(0, count($ids), '?'));
        $st = $pdo->prepare("SELECT path FROM files WHERE folder_id IN ({$in})");
        $st->execute($ids);
        $paths = array_unique(array_filter($st->fetchAll(PDO::FETCH_COLUMN)));
        $pdo->prepare('DELETE FROM folders WHERE id = ?')->execute([(int) $folder['id']]);
        $deleted = 0;
        if (!empty($body['deleteBlobs'])) {
            foreach ($paths as $p) {
                $deleted += delete_blob_if_unused($pdo, $p) ? 1 : 0;
            }
        }
        json_out(['ok' => true, 'folders' => count($ids), 'blobsDeleted' => $deleted]);
    }

    case 'createEntry': {
        // Raccourci, projet ou lien : une ligne `files` sans fichier envoyé.
        $folder = require_folder($pdo, $body['folder_id'] ?? null);
        $kind = (string) ($body['kind'] ?? '');
        $name = clean_name($body['name'] ?? '');
        if ($kind === 'shortcut' || $kind === 'project') {
            $path = path_prefix() . 'img/other/' . $name;
            $ext = $kind;
        } elseif ($kind === 'link') {
            $url = trim((string) ($body['url'] ?? ''));
            if (!preg_match('#^https?://[^\s<>"]+$#i', $url) || strlen($url) > 2000) {
                fail('Lien invalide (http:// ou https:// attendu)');
            }
            $path = $url;
            $ext = 'link';
            if (!str_ends_with(strtolower($name), '.exe')) {
                $name .= '.exe';
            }
        } else {
            fail('Type inconnu');
        }
        if (name_taken($pdo, 'files', 'folder_id', (int) $folder['id'], $name)) {
            fail('Un élément porte déjà ce nom ici');
        }
        $pdo->prepare("INSERT INTO files (name, extension, folder_id, size, type, path) VALUES (?, ?, ?, 0, 'file', ?)")
            ->execute([$name, $ext, (int) $folder['id'], $path]);
        json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }

    case 'updateFile': {
        $file = file_row($pdo, $body['id'] ?? null);
        $name = array_key_exists('name', $body) ? clean_name($body['name']) : $file['name'];
        $folderId = array_key_exists('folder_id', $body) ? (int) require_folder($pdo, $body['folder_id'])['id'] : (int) $file['folder_id'];
        if (name_taken($pdo, 'files', 'folder_id', $folderId, $name, (int) $file['id'])) {
            fail('Un fichier porte déjà ce nom dans ce dossier');
        }
        $pdo->prepare('UPDATE files SET name = ?, folder_id = ? WHERE id = ?')->execute([$name, $folderId, (int) $file['id']]);
        json_out(['ok' => true]);
    }

    case 'deleteFile': {
        $file = file_row($pdo, $body['id'] ?? null);
        $pdo->prepare('DELETE FROM files WHERE id = ?')->execute([(int) $file['id']]);
        $blob = !empty($body['deleteBlob']) && delete_blob_if_unused($pdo, $file['path']);
        json_out(['ok' => true, 'blobDeleted' => $blob]);
    }

    case 'upload': {
        $folder = require_folder($pdo, $body['folder_id'] ?? null);
        $up = $_FILES['file'] ?? null;
        if (!is_array($up) || !isset($up['error']) || is_array($up['error'])) {
            fail('Aucun fichier reçu');
        }
        if ($up['error'] !== UPLOAD_ERR_OK) {
            $msg = match ($up['error']) {
                UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Fichier trop lourd pour le serveur',
                UPLOAD_ERR_PARTIAL => 'Envoi interrompu',
                UPLOAD_ERR_NO_FILE => 'Aucun fichier reçu',
                default => 'Erreur pendant l\'envoi',
            };
            fail($msg);
        }
        $limits = upload_limits();
        if ($up['size'] > $limits['maxFileMb'] * 1048576) {
            fail("Fichier trop lourd ({$limits['maxFileMb']} Mo max)");
        }
        $original = clean_name($body['name'] ?? $up['name'] ?? '', 200);
        $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        $rules = upload_rules();
        if (!isset($rules[$ext])) {
            fail("Type de fichier non autorisé : .{$ext}");
        }
        [$dir, $column, $mimes, $suffix] = $rules[$ext];
        $mime = detect_mime($up['tmp_name']);
        $ok = in_array($mime, $mimes, true) || ($ext === 'glb' && looks_like_glb($up['tmp_name']));
        if ($ext === 'glb' && !looks_like_glb($up['tmp_name'])) {
            $ok = false;
        }
        if (!$ok) {
            fail("Le contenu ne correspond pas à un .{$ext} ({$mime})");
        }

        $base = pathinfo($original, PATHINFO_FILENAME);
        $displayName = $ext === 'glb' ? "{$base}.blend" : $original;
        if (name_taken($pdo, 'files', 'folder_id', (int) $folder['id'], $displayName)) {
            fail("« {$displayName} » existe déjà dans ce dossier");
        }

        $targetDir = public_root() . '/img/' . $dir;
        if (!is_dir($targetDir) && !@mkdir($targetDir, 0755, true)) {
            fail('Dossier de destination non inscriptible', 500);
        }
        $diskExt = $ext . $suffix;
        $disk = unique_disk_path($targetDir, safe_disk_name($base), $diskExt);
        if (!move_uploaded_file($up['tmp_name'], $disk)) {
            fail('Impossible d\'enregistrer le fichier', 500);
        }
        @chmod($disk, 0644);
        $path = path_prefix() . 'img/' . $dir . '/' . basename($disk);
        try {
            $pdo->prepare("INSERT INTO files (name, extension, folder_id, size, type, path) VALUES (?, ?, ?, ?, 'file', ?)")
                ->execute([$displayName, $column, (int) $folder['id'], (int) $up['size'], $path]);
        } catch (Throwable $e) {
            @unlink($disk);
            throw $e;
        }
        json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'path' => $path]);
    }

    default:
        fail('Action inconnue');
}
