<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$data = request_json();
$maxPlayers = (int)($data['max_players'] ?? 0);

if (!in_array($maxPlayers, [2, 3, 4], true)) {
  json_out(['ok' => false, 'msg' => 'Invalid player count.'], 400);
}

$room = get_room($mysqli, 'PROTO');
if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

if ((string)$room['status'] !== 'waiting') {
  json_out(['ok' => false, 'msg' => 'Cannot change mode after game start.'], 409);
}

if (!is_host_token($room, $token)) {
  json_out(['ok' => false, 'msg' => 'Only the host can change mode.'], 403);
}

$stmt = $mysqli->prepare("
  SELECT COUNT(*) AS c
  FROM room_players
  WHERE room_id = ? AND player_type = 'human'
");
$roomId = (int)$room['id'];
$stmt->bind_param('i', $roomId);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

$humanCount = (int)($row['c'] ?? 0);
if ($humanCount > $maxPlayers) {
  json_out(['ok' => false, 'msg' => 'Too many humans already joined for that mode.'], 409);
}

$stmt = $mysqli->prepare("
  UPDATE rooms
  SET max_players = ?
  WHERE id = ?
  LIMIT 1
");
$stmt->bind_param('ii', $maxPlayers, $roomId);
$stmt->execute();
$stmt->close();

$room = get_room($mysqli, 'PROTO');
json_out(room_state_payload($mysqli, $room, $token));