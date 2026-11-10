<?php
/**
 * MyOS API - socle commun (config, base, JSON, erreurs).
 * Ce dossier n'est pas accessible depuis le web (.htaccess), et chaque fichier
 * vérifie MYOS_API pour ne rien faire s'il est appelé directement.
 */
declare(strict_types=1);

if (!defined('MYOS_API')) {
    http_response_code(404);
    exit;
}

ini_set('display_errors', '0');
error_reporting(E_ALL);

/** Racine du site (public_html). */
function public_root(): string
{
    return dirname(__DIR__, 2);
}

/**
 * Variables de config. Ordre de recherche du fichier .env :
 *   1. MYOS_ENV_FILE (variable d'environnement)
 *   2. le dossier AU-DESSUS de public_html (recommandé : jamais servi par le web)
 *   3. public_html/.env (emplacement actuel, pour ne rien casser)
 * Les vraies variables d'environnement sont prioritaires (Docker).
 */
function env(string $key, ?string $default = null): ?string
{
    static $vars = null;
    if ($vars === null) {
        $vars = [];
        $candidates = array_filter([
            getenv('MYOS_ENV_FILE') ?: null,
            dirname(public_root()) . '/.env',
            public_root() . '/.env',
        ]);
        foreach ($candidates as $file) {
            if (is_file($file) && is_readable($file)) {
                $vars = parse_env_file($file);
                break;
            }
        }
    }
    $real = getenv($key);
    if ($real !== false && $real !== '') {
        return $real;
    }
    return $vars[$key] ?? $default;
}

/** Parser .env minimal (KEY=VALUE, guillemets optionnels, # commentaires). */
function parse_env_file(string $file): array
{
    $out = [];
    foreach (file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || $line[0] === ';' || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = array_map('trim', explode('=', $line, 2));
        if (strlen($v) >= 2 && ($v[0] === '"' || $v[0] === "'") && $v[strlen($v) - 1] === $v[0]) {
            $v = substr($v, 1, -1);
        }
        $out[$k] = $v;
    }
    return $out;
}

/** Dossier privé (sessions, limites de connexion, logs). Hors web si possible. */
function private_dir(): string
{
    static $dir = null;
    if ($dir !== null) {
        return $dir;
    }
    $wanted = env('STORAGE_DIR') ?: dirname(public_root()) . '/myos-storage';
    if (!is_dir($wanted)) {
        @mkdir($wanted, 0700, true);
    }
    if (!is_dir($wanted) || !is_writable($wanted)) {
        $wanted = __DIR__ . '/../_storage';
        if (!is_dir($wanted)) {
            @mkdir($wanted, 0700, true);
        }
        if (!is_file($wanted . '/.htaccess')) {
            @file_put_contents($wanted . '/.htaccess', "Require all denied\nDeny from all\n");
        }
    }
    return $dir = $wanted;
}

function log_error(Throwable|string $err): void
{
    $msg = $err instanceof Throwable
        ? get_class($err) . ': ' . $err->getMessage() . ' @ ' . $err->getFile() . ':' . $err->getLine()
        : $err;
    @error_log('[' . date('c') . '] ' . $msg . "\n", 3, private_dir() . '/php-error.log');
}

set_exception_handler(static function (Throwable $e): void {
    log_error($e);
    json_out(['error' => 'Erreur serveur'], 500);
});

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function fail(string $message, int $status = 400): never
{
    json_out(['error' => $message], $status);
}

function require_method(string ...$methods): string
{
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($m, $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        fail('Méthode non autorisée', 405);
    }
    return $m;
}

/** Corps JSON de la requête (64 Ko max). */
function read_json(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 65536) ?: '';
    if ($raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        fail('JSON invalide');
    }
    return $data;
}

/** Connexion PDO (mêmes clés que l'ancien .env : DB_HOST, DB_NAME, DB_USER, DB_PASS). */
function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $host = env('DB_HOST', 'localhost');
    $name = env('DB_NAME');
    if (!$name) {
        throw new RuntimeException('DB_NAME manquant dans .env');
    }
    $pdo = new PDO("mysql:host={$host};dbname={$name};charset=utf8mb4", env('DB_USER'), env('DB_PASS'), [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    return $pdo;
}

/**
 * Préfixe de la colonne `path`, identique aux lignes existantes :
 * `domains/raphaelgosset.fr/public_html/` + `img/...`.
 */
function path_prefix(): string
{
    $p = env('PATH_PREFIX', 'domains/raphaelgosset.fr/public_html/');
    return rtrim($p, '/') . '/';
}

/** `domains/…/public_html/img/x.png` → chemin disque absolu, ou null si hors de img/. */
function path_to_disk(?string $path): ?string
{
    if (!$path) {
        return null;
    }
    $marker = 'public_html/';
    $i = strpos($path, $marker);
    $rel = $i === false ? ltrim($path, '/') : substr($path, $i + strlen($marker));
    if (!str_starts_with($rel, 'img/') || str_contains($rel, '..')) {
        return null;
    }
    return public_root() . '/' . $rel;
}
