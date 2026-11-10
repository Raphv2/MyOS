<?php
/**
 * /api/auth.php — connexion admin.
 *   GET                         → { authenticated, configured, csrf?, limits? }
 *   POST { action: "login", password }
 *   POST { action: "logout" }   (en-tête X-CSRF-Token)
 *
 * Le mot de passe n'est jamais stocké en clair : ADMIN_PASSWORD_HASH dans .env
 * (généré avec `npm run admin:password`).
 */
declare(strict_types=1);

define('MYOS_API', true);
require __DIR__ . '/_lib/bootstrap.php';
require __DIR__ . '/_lib/auth.php';
require __DIR__ . '/_lib/files.php';

$method = require_method('GET', 'POST');
session_boot();

$hash = (string) env('ADMIN_PASSWORD_HASH', '');
$configured = $hash !== '' && str_starts_with($hash, '$');

if ($method === 'GET') {
    $out = ['authenticated' => is_admin(), 'configured' => $configured];
    if (is_admin()) {
        $out['csrf'] = csrf_token();
        $out['limits'] = upload_limits();
        $out['protected'] = protected_folder_ids();
    }
    json_out($out);
}

check_same_origin();
$body = read_json();
$action = (string) ($body['action'] ?? '');

if ($action === 'login') {
    if (!$configured) {
        fail("Admin non configuré : ajoute ADMIN_PASSWORD_HASH dans le .env", 503);
    }
    if (login_blocked()) {
        fail('Trop de tentatives. Réessaie dans 15 minutes.', 429);
    }
    $password = (string) ($body['password'] ?? '');
    if ($password === '' || strlen($password) > 1024 || !password_verify($password, $hash)) {
        record_login_failure();
        usleep(random_int(300_000, 700_000)); // ralentit le brute-force
        fail('Mot de passe incorrect', 401);
    }
    clear_login_failures();
    session_regenerate_id(true);
    $_SESSION['admin'] = true;
    $_SESSION['fp'] = client_fingerprint();
    unset($_SESSION['csrf']);
    json_out([
        'authenticated' => true,
        'csrf' => csrf_token(),
        'limits' => upload_limits(),
        'protected' => protected_folder_ids(),
    ]);
}

if ($action === 'logout') {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (is_admin() && is_string($sent) && hash_equals(csrf_token(), $sent)) {
        $_SESSION = [];
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Strict']);
        session_destroy();
    }
    json_out(['authenticated' => false]);
}

fail('Action inconnue');
