<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$room = get_room($mysqli, ROOM_CODE);

if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

$me = get_player_by_token($mysqli, (int)$room['id'], $token);
if ($me) {
  touch_player($mysqli, (int)$me['id']);
}

if (($room['status'] ?? '') === 'playing') {
  $currentSeat = (int)($room['current_turn_seat'] ?? 0);

  if ($currentSeat > 0) {
    $stmt = $mysqli->prepare("
      SELECT player_type
      FROM room_players
      WHERE room_id = ? AND seat_no = ?
      LIMIT 1
    ");
    $stmt->bind_param('ii', $room['id'], $currentSeat);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (($row['player_type'] ?? '') === 'ai') {
      run_ai_until_human_or_end($mysqli, $room);
      $room = get_room($mysqli, ROOM_CODE);
    }
  }
}

json_out(room_state_payload($mysqli, $room, $token));