<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$data = request_json();

$cardId = trim((string)($data['card_id'] ?? ''));
$chosenElement = trim((string)($data['chosen_element'] ?? ''));

if ($cardId === '') {
  json_out(['ok' => false, 'msg' => 'No card selected.'], 400);
}

$room = get_room($mysqli, ROOM_CODE);
if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

$me = get_player_by_token($mysqli, (int)$room['id'], $token);
if (!$me) {
  json_out(['ok' => false, 'msg' => 'Join the room first.'], 403);
}

$seatNo = (int)$me['seat_no'];

$res = apply_play_action(
  $mysqli,
  $room,
  $seatNo,
  $cardId,
  $chosenElement !== '' ? $chosenElement : null
);

if (!$res['ok']) {
  json_out($res, 400);
}

$room = get_room($mysqli, ROOM_CODE);
run_ai_until_human_or_end($mysqli, $room);
$room = get_room($mysqli, ROOM_CODE);

json_out(room_state_payload($mysqli, $room, $token));