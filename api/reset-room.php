<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$room = get_room($mysqli, ROOM_CODE);

if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

if (!is_host_token($room, $token)) {
  json_out(['ok' => false, 'msg' => 'Only the host can reset the room.'], 403);
}

$roomId = (int)$room['id'];

$mysqli->begin_transaction();

try {
  $stmt = $mysqli->prepare("DELETE FROM game_logs WHERE room_id = ?");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();

  $stmt = $mysqli->prepare("DELETE FROM player_hands WHERE room_id = ?");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();

  $stmt = $mysqli->prepare("DELETE FROM room_players WHERE room_id = ?");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();

  $stmt = $mysqli->prepare("
    UPDATE rooms
    SET status = 'waiting',
        max_players = 4,
        host_token = NULL,
        current_turn_seat = NULL,
        lead_seat = NULL,
        last_played_seat = NULL,
        active_card_json = NULL,
        active_element = NULL,
        pending_draw = 0,
        pass_count = 0,
        winner_seat = NULL,
        draw_pile_json = NULL,
        discard_pile_json = NULL
    WHERE id = ?
    LIMIT 1
  ");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();

  $mysqli->commit();
} catch (Throwable $e) {
  $mysqli->rollback();
  json_out(['ok' => false, 'msg' => 'Reset failed: ' . $e->getMessage()], 500);
}

unset($_SESSION['cardtest_token']);

json_out([
  'ok' => true,
  'msg' => 'Room reset complete.'
]);