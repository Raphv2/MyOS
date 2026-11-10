<?php

$envPath = __DIR__ . '/.env';

if (!file_exists($envPath)) {
    die(".env file not found");
}

$envVars = parse_ini_file($envPath);

if ($envVars === false) {
    die("Error parsing .env file");
}

foreach ($envVars as $key => $value) {
    putenv("$key=$value");
    $_ENV[$key] = $value;
}

$servername = $_ENV['DB_HOST'] ?? null;
$database = $_ENV['DB_NAME'] ?? null;
$username = $_ENV['DB_USER'] ?? null;
$password = $_ENV['DB_PASS'] ?? null;
?>