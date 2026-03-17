<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$token = ensure_player_token();
$room = get_room($mysqli, ROOM_CODE);

if (!$room) {
  json_out(['ok' => false, 'msg' => 'Room not found.'], 500);
}

$me = get_player_by_token($mysqli, (int)$room['id'], $token);
if (!$me) {
  json_out(['ok' => false, 'msg' => 'Join the room first.'], 403);
}

$seatNo = (int)$me['seat_no'];
$res = apply_pass_action($mysqli, $room, $seatNo);

if (!$res['ok']) {
  json_out($res, 400);
}

$room = get_room($mysqli, ROOM_CODE);

json_out(room_state_payload($mysqli, $room, $token));