<?php
/**
 * GET /api/tree.php - arborescence { folders, files } lue directement en base.
 * Remplace l'ancien db.php qui réécrivait data.json à chaque visite :
 * on ne réécrit l'instantané que s'il a changé, et on le sert si la base tombe.
 */
declare(strict_types=1);

define('MYOS_API', true);
require __DIR__ . '/_lib/bootstrap.php';

require_method('GET', 'HEAD');

$snapshot = public_root() . '/data.json';

try {
    $pdo = db();
    $folders = $pdo->query('SELECT id, name, parent_id FROM folders ORDER BY id')->fetchAll();
    $files = $pdo->query(
        'SELECT id, name, extension, folder_id, size, created_at, updated_at, type, path FROM files ORDER BY id'
    )->fetchAll();
} catch (Throwable $e) {
    log_error($e);
    if (is_file($snapshot)) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-cache');
        header('X-MyOS-Source: snapshot');
        readfile($snapshot);
        exit;
    }
    fail('Base de données indisponible', 503);
}

$toInt = static fn ($v) => $v === null ? null : (int) $v;
foreach ($folders as &$f) {
    $f['id'] = (int) $f['id'];
    $f['parent_id'] = $toInt($f['parent_id']);
}
unset($f);
foreach ($files as &$f) {
    $f['id'] = (int) $f['id'];
    $f['folder_id'] = $toInt($f['folder_id']);
    $f['size'] = (int) $f['size'];
}
unset($f);

$json = json_encode(['folders' => $folders, 'files' => $files], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Instantané de secours (même format que l'ancien data.json).
// SNAPSHOT_WRITE=0 (environnement de test) : ne jamais toucher data.json, qui part en prod.
if (env('SNAPSHOT_WRITE', '1') !== '0' && (!is_file($snapshot) || md5_file($snapshot) !== md5($json))) {
    @file_put_contents($snapshot, $json, LOCK_EX);
}

$etag = '"' . md5($json) . '"';
header('ETag: ' . $etag);
header('Cache-Control: no-cache');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
echo $json;
