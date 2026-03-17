<?php
declare(strict_types=1);

$DB_HOST = '127.0.0.1';
$DB_USER = 'root';
$DB_PASS = 'Pokemon2003';
$DB_NAME = 'cardtest';

$mysqli = new mysqli($DB_HOST, $DB_USER, $DB_PASS, $DB_NAME);

if ($mysqli->connect_errno) {
  http_response_code(500);
  die('Database connection failed: ' . $mysqli->connect_error);
}

$mysqli->set_charset('utf8mb4');