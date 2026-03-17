<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$data = request_json();
$name = trim((string)($data['player_name'] ?? $data['name'] ?? ''));

if ($name === '') {
  json_out(['ok' => false, 'msg' => 'Enter a player name.'], 400);
}

if (mb_strlen($name) > 50) {
  $name = mb_substr($name, 0, 50);
}

$room = get_room($mysqli, ROOM_CODE);
if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

$roomId = (int)$room['id'];
$existing = get_player_by_token($mysqli, $roomId, $token);

if ($existing) {
  touch_player($mysqli, (int)$existing['id']);
  json_out(room_state_payload($mysqli, $room, $token));
}

if ((string)$room['status'] !== 'waiting') {
  json_out(['ok' => false, 'msg' => 'Game already started. Reset room first.'], 409);
}

$seat = next_open_seat($mysqli, $roomId, (int)$room['max_players']);
if ($seat === null) {
  json_out(['ok' => false, 'msg' => 'Room is full for the current mode.'], 409);
}

$isFirstHuman = false;
$stmt = $mysqli->prepare("
  SELECT COUNT(*) AS c
  FROM room_players
  WHERE room_id = ? AND player_type = 'human'
");
$stmt->bind_param('i', $roomId);
$stmt->execute();
$countRow = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (((int)($countRow['c'] ?? 0)) === 0) {
  $isFirstHuman = true;
}

$stmt = $mysqli->prepare("
  INSERT INTO room_players (room_id, seat_no, player_name, player_type, session_token, is_host)
  VALUES (?, ?, ?, 'human', ?, ?)
");
$isHost = $isFirstHuman ? 1 : 0;
$stmt->bind_param('iissi', $roomId, $seat, $name, $token, $isHost);
$stmt->execute();
$stmt->close();

if ($isFirstHuman) {
  $stmt = $mysqli->prepare("
    UPDATE rooms
    SET host_token = ?
    WHERE id = ?
    LIMIT 1
  ");
  $stmt->bind_param('si', $token, $roomId);
  $stmt->execute();
  $stmt->close();
}

$room = get_room($mysqli, ROOM_CODE);
json_out(room_state_payload($mysqli, $room, $token));