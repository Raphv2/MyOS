<?php
/**
 * Session admin : cookie HttpOnly + Secure + SameSite=Strict, jeton CSRF,
 * vérification de l'origine, limite de tentatives de connexion.
 */
declare(strict_types=1);

if (!defined('MYOS_API')) {
    http_response_code(404);
    exit;
}

const SESSION_IDLE_SECONDS = 7200;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_WINDOW_SECONDS = 900;

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
}

function session_boot(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $dir = private_dir() . '/sessions';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (is_dir($dir) && is_writable($dir)) {
        session_save_path($dir);
    }
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.gc_maxlifetime', (string) SESSION_IDLE_SECONDS);
    session_name('MYOS_ADMIN');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/api/',
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
    $now = time();
    if (isset($_SESSION['last']) && $now - (int) $_SESSION['last'] > SESSION_IDLE_SECONDS) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['last'] = $now;
}

function client_fingerprint(): string
{
    return hash('sha256', $_SERVER['HTTP_USER_AGENT'] ?? '');
}

function is_admin(): bool
{
    return !empty($_SESSION['admin']) && hash_equals((string) ($_SESSION['fp'] ?? ''), client_fingerprint());
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

/** La requête vient bien de ce site (protège contre les formulaires piégés ailleurs). */
function check_same_origin(): void
{
    $host = strtolower($_SERVER['HTTP_HOST'] ?? '');
    $origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
    $originHost = strtolower((string) parse_url($origin, PHP_URL_HOST));
    $originPort = parse_url($origin, PHP_URL_PORT);
    if ($originPort) {
        $originHost .= ':' . $originPort;
    }
    if ($origin === '' || $originHost !== $host) {
        fail('Origine refusée', 403);
    }
}

/** À appeler en tête de toute action d'écriture. */
function require_admin(): void
{
    session_boot();
    if (!is_admin()) {
        fail('Non connecté', 401);
    }
    check_same_origin();
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        fail('Jeton CSRF invalide', 403);
    }
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/** Lit/écrit le fichier de tentatives de connexion avec verrou. */
function with_attempts(callable $fn): mixed
{
    $file = private_dir() . '/login-attempts.json';
    $fh = fopen($file, 'c+');
    if (!$fh) {
        return $fn([])[1] ?? null;
    }
    flock($fh, LOCK_EX);
    $data = json_decode(stream_get_contents($fh) ?: '[]', true) ?: [];
    $now = time();
    foreach ($data as $ip => $times) {
        $data[$ip] = array_values(array_filter($times, static fn ($t) => $now - $t < LOGIN_WINDOW_SECONDS));
        if (!$data[$ip]) {
            unset($data[$ip]);
        }
    }
    [$data, $result] = $fn($data);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}

function login_blocked(): bool
{
    $ip = client_ip();
    return (bool) with_attempts(static fn ($d) => [$d, count($d[$ip] ?? []) >= LOGIN_MAX_FAILURES]);
}

function record_login_failure(): void
{
    $ip = client_ip();
    with_attempts(static function ($d) use ($ip) {
        $d[$ip][] = time();
        return [$d, null];
    });
}

function clear_login_failures(): void
{
    $ip = client_ip();
    with_attempts(static function ($d) use ($ip) {
        unset($d[$ip]);
        return [$d, null];
    });
}
