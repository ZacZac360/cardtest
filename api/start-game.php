<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$room = get_room($mysqli, ROOM_CODE);

if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

if (!is_host_token($room, $token)) {
  json_out(['ok' => false, 'msg' => 'Only the host can start the game.'], 403);
}

if (($room['status'] ?? '') !== 'waiting') {
  json_out(['ok' => false, 'msg' => 'Room is not in waiting state.'], 409);
}

$roomId = (int)$room['id'];
$players = get_room_players($mysqli, $roomId);
$humanPlayers = array_values(array_filter($players, fn($p) => ($p['player_type'] ?? '') === 'human'));

if (count($humanPlayers) < 1) {
  json_out(['ok' => false, 'msg' => 'At least one human must join first.'], 400);
}

$maxPlayers = (int)$room['max_players'];

$mysqli->begin_transaction();

try {
  $stmt = $mysqli->prepare("
    DELETE FROM room_players
    WHERE room_id = ? AND player_type = 'ai'
  ");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();

  clear_hands($mysqli, $roomId);

  $stmt = $mysqli->prepare("DELETE FROM game_logs WHERE room_id = ?");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();

  $players = get_room_players($mysqli, $roomId);
  $takenSeats = array_map(fn($p) => (int)$p['seat_no'], $players);

  for ($seat = 1; $seat <= $maxPlayers; $seat++) {
    if (!in_array($seat, $takenSeats, true)) {
      $name = 'AI ' . $seat;
      $type = 'ai';
      $nullToken = null;
      $isHost = 0;

      $stmt = $mysqli->prepare("
        INSERT INTO room_players (room_id, seat_no, player_name, player_type, session_token, is_host)
        VALUES (?, ?, ?, ?, ?, ?)
      ");
      $stmt->bind_param('iisssi', $roomId, $seat, $name, $type, $nullToken, $isHost);
      $stmt->execute();
      $stmt->close();
    }
  }

  $players = get_room_players($mysqli, $roomId);
  $deck = build_deck();

  foreach ($players as $player) {
    $seatNo = (int)$player['seat_no'];
    $hand = [];
    for ($i = 0; $i < 7; $i++) {
      $card = array_pop($deck);
      if ($card) $hand[] = $card;
    }
    set_hand($mysqli, $roomId, $seatNo, $hand);
  }

  $seatOrder = room_seat_order($mysqli, $roomId);
  $firstSeat = $seatOrder[0] ?? 1;

  $room['status'] = 'playing';
  $room['current_turn_seat'] = $firstSeat;
  $room['lead_seat'] = $firstSeat;
  $room['last_played_seat'] = null;
  $room['active_card_json'] = null;
  $room['active_element'] = null;
  $room['pending_draw'] = 0;
  $room['pass_count'] = 0;
  $room['winner_seat'] = null;
  $room['draw_pile_json'] = jencode(array_values($deck));
  $room['discard_pile_json'] = jencode([]);

  save_room_game_state($mysqli, $room);

  add_log($mysqli, $roomId, 'Game started with ' . $maxPlayers . ' total seat(s).');
  add_log($mysqli, $roomId, get_player_name_by_seat($mysqli, $roomId, $firstSeat) . ' takes the first turn.');

  $mysqli->commit();
} catch (Throwable $e) {
  $mysqli->rollback();
  json_out(['ok' => false, 'msg' => 'Failed to start game: ' . $e->getMessage()], 500);
}

$room = get_room($mysqli, ROOM_CODE);

json_out(room_state_payload($mysqli, $room, $token));