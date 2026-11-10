<?php
/**
 * Règles des fichiers envoyés par l'admin : extensions autorisées, dossier de
 * rangement dans img/, nom sûr, vérification du contenu réel (MIME).
 */
declare(strict_types=1);

if (!defined('MYOS_API')) {
    http_response_code(404);
    exit;
}

/**
 * extension envoyée => [dossier dans img/, colonne `extension`, MIME acceptés, suffixe de stockage]
 * - Les .glb sont rangés comme les modèles existants : extension `blend`, fichier .glb.
 * - Le code est stocké avec un suffixe .txt : il ne peut jamais être exécuté par le serveur
 *   (même un .php ou un .html), il est seulement lu et colorié par MyOS Code.
 */
function upload_rules(): array
{
    $img = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    $text = ['text/plain', 'text/x-c', 'text/x-c++', 'text/x-java', 'text/x-python', 'text/x-php', 'text/html',
        'text/css', 'text/javascript', 'application/javascript', 'application/json', 'text/x-script.python',
        'text/xml', 'application/xml', 'text/x-shellscript', 'text/markdown', 'text/x-asm', 'text/x-makefile',
        'application/x-empty', 'inode/x-empty', 'text/x-ruby', 'text/x-lua', 'text/x-go', 'text/x-rust',
        'text/x-csrc', 'text/x-c++src', 'text/x-objective-c', 'text/x-tex', 'text/rtf', 'text/csv',
        'application/x-wine-extension-ini', 'application/octet-stream'];
    $rules = [
        'png' => ['illustrations', 'png', $img, ''],
        'jpg' => ['illustrations', 'jpg', $img, ''],
        'jpeg' => ['illustrations', 'jpeg', $img, ''],
        'gif' => ['illustrations', 'gif', $img, ''],
        'webp' => ['illustrations', 'webp', $img, ''],
        'pdf' => ['pdf', 'pdf', ['application/pdf'], ''],
        'glb' => ['3d', 'blend', ['model/gltf-binary', 'application/octet-stream'], ''],
        'mp4' => ['video', 'mp4', ['video/mp4', 'application/mp4', 'video/quicktime', 'video/x-m4v'], ''],
        'webm' => ['video', 'webm', ['video/webm'], ''],
        'mp3' => ['audio', 'mp3', ['audio/mpeg', 'audio/mp3', 'application/octet-stream'], ''],
        'wav' => ['audio', 'wav', ['audio/wav', 'audio/x-wav', 'audio/wave'], ''],
        'ogg' => ['audio', 'ogg', ['audio/ogg', 'application/ogg', 'video/ogg'], ''],
        'txt' => ['txt', 'txt', $text, ''],
        'md' => ['docs', 'md', $text, ''],
        'glsl' => ['shader', 'glsl', $text, ''],
        'frag' => ['shader', 'frag', $text, ''],
        'vert' => ['shader', 'vert', $text, ''],
    ];
    $code = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'php', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'json',
        'c', 'h', 'cpp', 'hpp', 'cc', 'cs', 'java', 'kt', 'go', 'rs', 'sql', 'sh', 'bash', 'bat', 'ps1', 'yml', 'yaml',
        'xml', 'lua', 'rb', 'swift', 'vue', 'svelte', 'dart', 'toml', 'ini'];
    foreach ($code as $ext) {
        $rules[$ext] = ['code', $ext, $text, '.txt'];
    }
    return $rules;
}

/** Limites d'envoi (Mo) : la plus petite entre la config MyOS et celle de PHP. */
function upload_limits(): array
{
    $toMb = static function (string $v): float {
        $v = trim($v);
        if ($v === '') {
            return 0;
        }
        $n = (float) $v;
        return match (strtolower(substr($v, -1))) {
            'g' => $n * 1024,
            'k' => $n / 1024,
            'm' => $n,
            default => $n / 1048576,
        };
    };
    $php = min($toMb((string) ini_get('upload_max_filesize')) ?: 2, $toMb((string) ini_get('post_max_size')) ?: 8);
    $mine = (float) env('UPLOAD_MAX_MB', '512');
    return ['maxFileMb' => round(min($php, $mine), 1), 'extensions' => array_keys(upload_rules())];
}

/** Dossiers indispensables au site (racine, utilisateur, bureau…) : non supprimables / déplaçables. */
function protected_folder_ids(): array
{
    $ids = env('PROTECTED_FOLDER_IDS', '1,2,3,8');
    return array_values(array_map('intval', array_filter(explode(',', $ids), 'strlen')));
}

/** Nom affichable valide (dossier ou fichier). */
function clean_name(mixed $name, int $max = 200): string
{
    $name = is_string($name) ? trim($name) : '';
    $name = preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', '', $name) ?? '';
    $name = preg_replace('/\s+/u', ' ', $name) ?? '';
    if ($name === '' || $name === '.' || $name === '..') {
        fail('Nom invalide');
    }
    if (mb_strlen($name) > $max) {
        fail("Nom trop long ({$max} caractères max)");
    }
    return $name;
}

/** Nom de fichier disque sûr : ASCII, sans espace piégeux, sans double extension. */
function safe_disk_name(string $base): string
{
    $ascii = function_exists('iconv') ? (iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $base) ?: $base) : $base;
    $ascii = preg_replace('/[^A-Za-z0-9 _\-()]+/', '_', $ascii) ?? 'fichier';
    $ascii = trim(preg_replace('/_+/', '_', $ascii) ?? '', ' _-');
    return $ascii === '' ? 'fichier' : substr($ascii, 0, 120);
}

/** Chemin disque libre : ajoute -1, -2… si le nom existe déjà. */
function unique_disk_path(string $dir, string $base, string $ext): string
{
    $candidate = "{$dir}/{$base}.{$ext}";
    for ($i = 1; file_exists($candidate); $i++) {
        $candidate = "{$dir}/{$base}-{$i}.{$ext}";
    }
    return $candidate;
}

function detect_mime(string $file): string
{
    if (function_exists('finfo_open')) {
        $f = finfo_open(FILEINFO_MIME_TYPE);
        if ($f) {
            $m = finfo_file($f, $file) ?: '';
            finfo_close($f);
            return $m;
        }
    }
    return function_exists('mime_content_type') ? (mime_content_type($file) ?: '') : '';
}

/** Vrai si le fichier commence comme un binaire glTF. */
function looks_like_glb(string $file): bool
{
    $fh = fopen($file, 'rb');
    $magic = $fh ? fread($fh, 4) : '';
    if ($fh) {
        fclose($fh);
    }
    return $magic === 'glTF';
}
