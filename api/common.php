<?php
declare(strict_types=1);

session_start();

require_once __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

const ROOM_CODE = 'PROTO';
const ELEMENTS = ['Fire', 'Water', 'Lightning', 'Earth', 'Wind', 'Wood'];
const STRONG_AGAINST = [
  'Fire'      => 'Wood',
  'Water'     => 'Fire',
  'Lightning' => 'Water',
  'Earth'     => 'Lightning',
  'Wind'      => 'Earth',
  'Wood'      => 'Wind',
];

function json_out(array $data, int $status = 200): never {
  http_response_code($status);
  echo json_encode($data);
  exit;
}

function request_json(): array {
  $raw = file_get_contents('php://input');
  if (!$raw) return [];
  $data = json_decode($raw, true);
  return is_array($data) ? $data : [];
}

function ensure_player_token(): string {
  if (empty($_SESSION['cardtest_token'])) {
    $_SESSION['cardtest_token'] = bin2hex(random_bytes(16));
  }
  return (string)$_SESSION['cardtest_token'];
}

function jdecode(?string $json, $default) {
  if ($json === null || $json === '') return $default;
  $v = json_decode($json, true);
  return is_array($v) ? $v : $default;
}

function jencode($value): string {
  return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function get_room(mysqli $mysqli, string $roomCode = ROOM_CODE): ?array {
  $stmt = $mysqli->prepare("
    SELECT *
    FROM rooms
    WHERE room_code = ?
    LIMIT 1
  ");
  $stmt->bind_param('s', $roomCode);
  $stmt->execute();
  $room = $stmt->get_result()->fetch_assoc() ?: null;
  $stmt->close();
  return $room;
}

function get_room_players(mysqli $mysqli, int $roomId): array {
  $stmt = $mysqli->prepare("
    SELECT *
    FROM room_players
    WHERE room_id = ?
    ORDER BY seat_no ASC
  ");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
  $stmt->close();
  return $rows;
}

function get_player_by_token(mysqli $mysqli, int $roomId, string $token): ?array {
  $stmt = $mysqli->prepare("
    SELECT *
    FROM room_players
    WHERE room_id = ? AND session_token = ?
    LIMIT 1
  ");
  $stmt->bind_param('is', $roomId, $token);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc() ?: null;
  $stmt->close();
  return $row;
}

function touch_player(mysqli $mysqli, int $playerId): void {
  $stmt = $mysqli->prepare("
    UPDATE room_players
    SET last_seen_at = NOW()
    WHERE id = ?
    LIMIT 1
  ");
  $stmt->bind_param('i', $playerId);
  $stmt->execute();
  $stmt->close();
}

function next_open_seat(mysqli $mysqli, int $roomId, int $maxPlayers): ?int {
  $taken = [];
  $stmt = $mysqli->prepare("
    SELECT seat_no
    FROM room_players
    WHERE room_id = ?
  ");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $res = $stmt->get_result();
  while ($row = $res->fetch_assoc()) {
    $taken[(int)$row['seat_no']] = true;
  }
  $stmt->close();

  for ($seat = 1; $seat <= $maxPlayers; $seat++) {
    if (!isset($taken[$seat])) {
      return $seat;
    }
  }

  return null;
}

function is_host_token(array $room, string $token): bool {
  return !empty($room['host_token']) && hash_equals((string)$room['host_token'], $token);
}

function add_log(mysqli $mysqli, int $roomId, string $text): void {
  $stmt = $mysqli->prepare("
    INSERT INTO game_logs (room_id, log_text)
    VALUES (?, ?)
  ");
  $stmt->bind_param('is', $roomId, $text);
  $stmt->execute();
  $stmt->close();
}

function get_logs(mysqli $mysqli, int $roomId, int $limit = 20): array {
  $stmt = $mysqli->prepare("
    SELECT log_text
    FROM game_logs
    WHERE room_id = ?
    ORDER BY id DESC
    LIMIT ?
  ");
  $stmt->bind_param('ii', $roomId, $limit);
  $stmt->execute();
  $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
  $stmt->close();
  return array_map(fn($r) => (string)$r['log_text'], $rows);
}

function get_hand(mysqli $mysqli, int $roomId, int $seatNo): array {
  $stmt = $mysqli->prepare("
    SELECT hand_json
    FROM player_hands
    WHERE room_id = ? AND seat_no = ?
    LIMIT 1
  ");
  $stmt->bind_param('ii', $roomId, $seatNo);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();

  return jdecode($row['hand_json'] ?? null, []);
}

function set_hand(mysqli $mysqli, int $roomId, int $seatNo, array $hand): void {
  $json = jencode(array_values($hand));

  $stmt = $mysqli->prepare("
    INSERT INTO player_hands (room_id, seat_no, hand_json)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE hand_json = VALUES(hand_json)
  ");
  $stmt->bind_param('iis', $roomId, $seatNo, $json);
  $stmt->execute();
  $stmt->close();
}

function clear_hands(mysqli $mysqli, int $roomId): void {
  $stmt = $mysqli->prepare("DELETE FROM player_hands WHERE room_id = ?");
  $stmt->bind_param('i', $roomId);
  $stmt->execute();
  $stmt->close();
}

function make_id(): string {
  return bin2hex(random_bytes(6));
}

function create_normal_card(string $element, int $value): array {
  return [
    'id' => make_id(),
    'kind' => 'normal',
    'element' => $element,
    'value' => $value,
    'name' => $element . ' ' . $value,
  ];
}

function create_plus2(string $element): array {
  return [
    'id' => make_id(),
    'kind' => 'plus2',
    'element' => $element,
    'value' => null,
    'name' => '+2 ' . $element,
  ];
}

function create_plus4(): array {
  return [
    'id' => make_id(),
    'kind' => 'plus4',
    'element' => 'Wild',
    'value' => null,
    'name' => '+4 Wild',
  ];
}

function shuffle_cards(array $cards): array {
  shuffle($cards);
  return array_values($cards);
}

function build_deck(): array {
  $deck = [];

  foreach (ELEMENTS as $element) {
    for ($value = 1; $value <= 10; $value++) {
      $deck[] = create_normal_card($element, $value);
    }
  }

  foreach (ELEMENTS as $element) {
    $deck[] = create_normal_card($element, 5);
    $deck[] = create_normal_card($element, 8);
  }

  foreach (ELEMENTS as $element) {
    $deck[] = create_plus2($element);
  }

  $deck[] = create_plus4();
  $deck[] = create_plus4();
  $deck[] = create_plus4();
  $deck[] = create_plus4();

  return shuffle_cards($deck);
}

function compare_elements(?string $challenger, ?string $defender): string {
  if (!$challenger || !$defender) return 'neutral';
  if ($challenger === 'Wild' || $defender === 'Wild') return 'neutral';

  if ((STRONG_AGAINST[$challenger] ?? null) === $defender) return 'strong';
  if ((STRONG_AGAINST[$defender] ?? null) === $challenger) return 'weak';
  return 'neutral';
}

function card_text(?array $card): string {
  if (!$card) return 'None';

  if (($card['kind'] ?? '') === 'normal') {
    return (string)$card['element'] . ' ' . (string)$card['value'];
  }

  if (($card['kind'] ?? '') === 'plus2') {
    return '+2 ' . (string)$card['element'];
  }

  if (($card['kind'] ?? '') === 'plus4') {
    if (!empty($card['chosenElement'])) {
      return '+4 Wild → ' . (string)$card['chosenElement'];
    }
    return '+4 Wild';
  }

  return 'Unknown';
}

function get_effective_element(?array $card): ?string {
  if (!$card) return null;
  if (($card['kind'] ?? '') === 'plus4') {
    return $card['chosenElement'] ?? null;
  }
  return $card['element'] ?? null;
}

function can_play_card(array $card, ?array $activeCard, int $pendingDraw): bool {
  if (!$activeCard) return true;

  if (($activeCard['kind'] ?? '') === 'plus4' && $pendingDraw > 0) {
    return ($card['kind'] ?? '') === 'plus4';
  }

  if (($activeCard['kind'] ?? '') === 'plus2' && $pendingDraw > 0) {
    return ($card['kind'] ?? '') === 'plus2';
  }

  if (($card['kind'] ?? '') === 'plus4') {
    return true;
  }

  $targetElement = get_effective_element($activeCard);

  if (($card['kind'] ?? '') === 'plus2') {
    return compare_elements((string)$card['element'], $targetElement) === 'strong';
  }

  if (($card['kind'] ?? '') === 'normal') {
    return compare_elements((string)$card['element'], $targetElement) === 'strong';
  }

  return false;
}

function get_playable_cards(array $hand, ?array $activeCard, int $pendingDraw): array {
  return array_values(array_filter($hand, fn($card) => can_play_card($card, $activeCard, $pendingDraw)));
}

function has_any_playable_card(array $hand, ?array $activeCard, int $pendingDraw): bool {
  foreach ($hand as $card) {
    if (can_play_card($card, $activeCard, $pendingDraw)) {
      return true;
    }
  }
  return false;
}

function find_card_in_hand(array $hand, string $cardId): ?array {
  foreach ($hand as $card) {
    if (($card['id'] ?? '') === $cardId) {
      return $card;
    }
  }
  return null;
}

function remove_card_from_hand(array &$hand, string $cardId): ?array {
  foreach ($hand as $i => $card) {
    if (($card['id'] ?? '') === $cardId) {
      $removed = $card;
      array_splice($hand, $i, 1);
      return $removed;
    }
  }
  return null;
}

function room_seat_order(mysqli $mysqli, int $roomId): array {
  $players = get_room_players($mysqli, $roomId);
  return array_values(array_map(fn($p) => (int)$p['seat_no'], $players));
}

function next_turn_seat(mysqli $mysqli, int $roomId, int $currentSeat): int {
  $seats = room_seat_order($mysqli, $roomId);
  if (!$seats) return $currentSeat;

  $idx = array_search($currentSeat, $seats, true);
  if ($idx === false) return $seats[0];

  $nextIdx = ($idx + 1) % count($seats);
  return $seats[$nextIdx];
}

function ensure_draw_pile(mysqli $mysqli, array &$room): void {
  $drawPile = jdecode($room['draw_pile_json'] ?? null, []);
  if (count($drawPile) > 0) return;

  $discard = jdecode($room['discard_pile_json'] ?? null, []);
  $activeCard = jdecode($room['active_card_json'] ?? null, null);

  if (!$discard) return;

  $activeId = $activeCard['id'] ?? null;
  $recyclable = [];

  foreach ($discard as $card) {
    if (($card['id'] ?? '') !== $activeId) {
      $recyclable[] = $card;
    }
  }

  if (!$recyclable) return;

  $drawPile = shuffle_cards($recyclable);
  $room['draw_pile_json'] = jencode($drawPile);
  $room['discard_pile_json'] = jencode($activeCard ? [$activeCard] : []);
}

function draw_cards_for_seat(mysqli $mysqli, array &$room, int $seatNo, int $count): int {
  $roomId = (int)$room['id'];
  $hand = get_hand($mysqli, $roomId, $seatNo);
  $drawPile = jdecode($room['draw_pile_json'] ?? null, []);

  $drawn = 0;
  for ($i = 0; $i < $count; $i++) {
    if (!$drawPile) {
      ensure_draw_pile($mysqli, $room);
      $drawPile = jdecode($room['draw_pile_json'] ?? null, []);
    }

    if (!$drawPile) break;

    $card = array_pop($drawPile);
    if (!$card) break;

    $hand[] = $card;
    $drawn++;
    $room['draw_pile_json'] = jencode($drawPile);
  }

  set_hand($mysqli, $roomId, $seatNo, $hand);
  return $drawn;
}

function save_room_game_state(mysqli $mysqli, array $room): void {
  $stmt = $mysqli->prepare("
    UPDATE rooms
    SET status = ?,
        max_players = ?,
        host_token = ?,
        current_turn_seat = ?,
        lead_seat = ?,
        last_played_seat = ?,
        active_card_json = ?,
        active_element = ?,
        pending_draw = ?,
        pass_count = ?,
        winner_seat = ?,
        draw_pile_json = ?,
        discard_pile_json = ?
    WHERE id = ?
    LIMIT 1
  ");

  $status = (string)$room['status'];
  $maxPlayers = (int)$room['max_players'];
  $hostToken = $room['host_token'];
  $currentTurnSeat = $room['current_turn_seat'] !== null ? (int)$room['current_turn_seat'] : null;
  $leadSeat = $room['lead_seat'] !== null ? (int)$room['lead_seat'] : null;
  $lastPlayedSeat = $room['last_played_seat'] !== null ? (int)$room['last_played_seat'] : null;
  $activeCardJson = $room['active_card_json'];
  $activeElement = $room['active_element'];
  $pendingDraw = (int)$room['pending_draw'];
  $passCount = (int)$room['pass_count'];
  $winnerSeat = $room['winner_seat'] !== null ? (int)$room['winner_seat'] : null;
  $drawPileJson = $room['draw_pile_json'];
  $discardPileJson = $room['discard_pile_json'];
  $roomId = (int)$room['id'];

  $stmt->bind_param(
    'sisiiissiisssi',
    $status,
    $maxPlayers,
    $hostToken,
    $currentTurnSeat,
    $leadSeat,
    $lastPlayedSeat,
    $activeCardJson,
    $activeElement,
    $pendingDraw,
    $passCount,
    $winnerSeat,
    $drawPileJson,
    $discardPileJson,
    $roomId
  );
  $stmt->execute();
  $stmt->close();
}

function get_player_name_by_seat(mysqli $mysqli, int $roomId, int $seatNo): string {
  $stmt = $mysqli->prepare("
    SELECT player_name
    FROM room_players
    WHERE room_id = ? AND seat_no = ?
    LIMIT 1
  ");
  $stmt->bind_param('ii', $roomId, $seatNo);
  $stmt->execute();
  $row = $stmt->get_result()->fetch_assoc();
  $stmt->close();
  return (string)($row['player_name'] ?? ('Seat ' . $seatNo));
}

function apply_play_action(mysqli $mysqli, array &$room, int $seatNo, string $cardId, ?string $chosenElement = null): array {
  if (($room['status'] ?? '') !== 'playing') {
    return ['ok' => false, 'msg' => 'Game is not active.'];
  }

  if ((int)$room['winner_seat'] > 0) {
    return ['ok' => false, 'msg' => 'Game already finished.'];
  }

  if ((int)$room['current_turn_seat'] !== $seatNo) {
    return ['ok' => false, 'msg' => 'Not your turn.'];
  }

  $roomId = (int)$room['id'];
  $hand = get_hand($mysqli, $roomId, $seatNo);
  $card = find_card_in_hand($hand, $cardId);
  if (!$card) {
    return ['ok' => false, 'msg' => 'Card not found in hand.'];
  }

  $activeCard = jdecode($room['active_card_json'] ?? null, null);
  $pendingDraw = (int)$room['pending_draw'];

  if (!can_play_card($card, $activeCard, $pendingDraw)) {
    return ['ok' => false, 'msg' => 'That card cannot be played right now.'];
  }

  if (($card['kind'] ?? '') === 'plus4') {
    if (!$chosenElement || !in_array($chosenElement, ELEMENTS, true)) {
      return ['ok' => false, 'msg' => 'Choose an element for +4.'];
    }
  }

  $played = remove_card_from_hand($hand, $cardId);
  if (!$played) {
    return ['ok' => false, 'msg' => 'Failed to remove card.'];
  }

  if (($played['kind'] ?? '') === 'plus4') {
    $played['chosenElement'] = $chosenElement;
  }

  $discard = jdecode($room['discard_pile_json'] ?? null, []);
  $discard[] = $played;

  $room['active_card_json'] = jencode($played);
  $room['discard_pile_json'] = jencode($discard);
  $room['last_played_seat'] = $seatNo;
  $room['lead_seat'] = $seatNo;
  $room['pass_count'] = 0;

  if (($played['kind'] ?? '') === 'plus2') {
    $room['pending_draw'] = max(0, (int)$room['pending_draw']) + 2;
    $room['active_element'] = (string)$played['element'];
  } elseif (($played['kind'] ?? '') === 'plus4') {
    $room['pending_draw'] = max(0, (int)$room['pending_draw']) + 4;
    $room['active_element'] = (string)$played['chosenElement'];
  } else {
    $room['pending_draw'] = 0;
    $room['active_element'] = (string)$played['element'];
  }

  set_hand($mysqli, $roomId, $seatNo, $hand);

  $playerName = get_player_name_by_seat($mysqli, $roomId, $seatNo);
  add_log($mysqli, $roomId, $playerName . ' played ' . card_text($played) . '.');

  if (count($hand) === 0) {
    $room['winner_seat'] = $seatNo;
    $room['status'] = 'finished';
    add_log($mysqli, $roomId, $playerName . ' wins the game.');
    save_room_game_state($mysqli, $room);
    return ['ok' => true];
  }

  $room['current_turn_seat'] = next_turn_seat($mysqli, $roomId, $seatNo);
  save_room_game_state($mysqli, $room);
  return ['ok' => true];
}

function apply_pass_action(mysqli $mysqli, array &$room, int $seatNo): array {
  if (($room['status'] ?? '') !== 'playing') {
    return ['ok' => false, 'msg' => 'Game is not active.'];
  }

  if ((int)$room['winner_seat'] > 0) {
    return ['ok' => false, 'msg' => 'Game already finished.'];
  }

  if ((int)$room['current_turn_seat'] !== $seatNo) {
    return ['ok' => false, 'msg' => 'Not your turn.'];
  }

  $roomId = (int)$room['id'];
  $playerName = get_player_name_by_seat($mysqli, $roomId, $seatNo);
  $pendingDraw = (int)$room['pending_draw'];

  if ($pendingDraw > 0) {
    $drawn = draw_cards_for_seat($mysqli, $room, $seatNo, $pendingDraw);
    $room['pending_draw'] = 0;
    add_log($mysqli, $roomId, $playerName . ' passed and drew ' . $drawn . ' card(s).');
  } else {
    $drawn = draw_cards_for_seat($mysqli, $room, $seatNo, 1);
    add_log($mysqli, $roomId, $playerName . ' passed and drew ' . $drawn . ' card.');
  }

  $room['pass_count'] = ((int)$room['pass_count']) + 1;

  $seatCount = count(room_seat_order($mysqli, $roomId));
  $leadSeat = (int)($room['lead_seat'] ?? 0);

  if ($leadSeat > 0 && $room['pass_count'] >= max(1, $seatCount - 1)) {
    $room['pass_count'] = 0;
    $room['current_turn_seat'] = $leadSeat;
    add_log($mysqli, $roomId, get_player_name_by_seat($mysqli, $roomId, $leadSeat) . ' regains initiative.');
    save_room_game_state($mysqli, $room);
    return ['ok' => true];
  }

  $room['current_turn_seat'] = next_turn_seat($mysqli, $roomId, $seatNo);
  save_room_game_state($mysqli, $room);
  return ['ok' => true];
}

function ai_card_score(array $card, ?array $activeCard, int $pendingDraw): int {
  $kind = (string)($card['kind'] ?? '');

  if ($pendingDraw > 0) {
    if ($kind === 'plus2' || $kind === 'plus4') return 0;
    return 999;
  }

  if ($kind === 'normal') return (int)($card['value'] ?? 0);
  if ($kind === 'plus2') return 60;
  if ($kind === 'plus4') return 100;
  return 999;
}

function ai_choose_element(array $hand, ?string $avoidElement = null): string {
  $counts = [];
  foreach (ELEMENTS as $e) $counts[$e] = 0;
  foreach ($hand as $card) {
    $el = $card['element'] ?? null;
    if ($el && isset($counts[$el])) $counts[$el]++;
  }

  if ($avoidElement && isset($counts[$avoidElement]) && count(array_unique($counts)) > 1) {
    $counts[$avoidElement] = max(0, $counts[$avoidElement] - 1);
  }

  arsort($counts);
  $best = array_key_first($counts);
  return $best ?: ELEMENTS[array_rand(ELEMENTS)];
}

function run_ai_until_human_or_end(mysqli $mysqli, array &$room): void {
  $roomId = (int)$room['id'];

  for ($guard = 0; $guard < 40; $guard++) {
    if (($room['status'] ?? '') !== 'playing') return;
    if ((int)$room['winner_seat'] > 0) return;

    $currentSeat = (int)($room['current_turn_seat'] ?? 0);
    if ($currentSeat <= 0) return;

    $stmt = $mysqli->prepare("
      SELECT player_type
      FROM room_players
      WHERE room_id = ? AND seat_no = ?
      LIMIT 1
    ");
    $stmt->bind_param('ii', $roomId, $currentSeat);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $type = (string)($row['player_type'] ?? '');
    if ($type !== 'ai') return;

    $hand = get_hand($mysqli, $roomId, $currentSeat);
    $activeCard = jdecode($room['active_card_json'] ?? null, null);
    $pendingDraw = (int)$room['pending_draw'];
    $playable = get_playable_cards($hand, $activeCard, $pendingDraw);

    if (!$playable) {
      apply_pass_action($mysqli, $room, $currentSeat);
      $room = get_room($mysqli, ROOM_CODE);
      continue;
    }

    usort($playable, fn($a, $b) => ai_card_score($a, $activeCard, $pendingDraw) <=> ai_card_score($b, $activeCard, $pendingDraw));
    $pick = $playable[0];
    $chosenElement = null;

    if (($pick['kind'] ?? '') === 'plus4') {
      $handWithoutPick = array_values(array_filter($hand, fn($card) => ($card['id'] ?? '') !== ($pick['id'] ?? '')));
      $targetElement = get_effective_element($activeCard);
      $chosenElement = ai_choose_element($handWithoutPick, $targetElement);
    }

    apply_play_action($mysqli, $room, $currentSeat, (string)$pick['id'], $chosenElement);
    $room = get_room($mysqli, ROOM_CODE);
  }
}

function room_state_payload(mysqli $mysqli, array $room, string $token): array {
  $roomId = (int)$room['id'];
  $players = get_room_players($mysqli, $roomId);
  $me = get_player_by_token($mysqli, $roomId, $token);

  $seats = [];
  for ($i = 1; $i <= 4; $i++) {
    $seats[$i] = [
      'seat_no' => $i,
      'occupied' => false,
      'player_name' => null,
      'player_type' => null,
      'is_host' => false,
      'is_me' => false,
      'card_count' => 0,
    ];
  }

  foreach ($players as $player) {
    $seatNo = (int)$player['seat_no'];
    $hand = get_hand($mysqli, $roomId, $seatNo);

    $seats[$seatNo] = [
      'seat_no' => $seatNo,
      'occupied' => true,
      'player_name' => (string)$player['player_name'],
      'player_type' => (string)$player['player_type'],
      'is_host' => ((int)$player['is_host'] === 1),
      'is_me' => $me ? ((int)$me['id'] === (int)$player['id']) : false,
      'card_count' => count($hand),
    ];
  }

  $myHand = [];
  if ($me) {
    $myHand = get_hand($mysqli, $roomId, (int)$me['seat_no']);
  }

  return [
    'ok' => true,
    'room' => [
      'room_code' => (string)$room['room_code'],
      'status' => (string)$room['status'],
      'max_players' => (int)$room['max_players'],
      'human_count' => count(array_filter($players, fn($p) => ($p['player_type'] ?? '') === 'human')),
      'total_count' => count($players),
      'is_host' => is_host_token($room, $token),
      'current_turn_seat' => $room['current_turn_seat'] !== null ? (int)$room['current_turn_seat'] : null,
      'lead_seat' => $room['lead_seat'] !== null ? (int)$room['lead_seat'] : null,
      'last_played_seat' => $room['last_played_seat'] !== null ? (int)$room['last_played_seat'] : null,
      'winner_seat' => $room['winner_seat'] !== null ? (int)$room['winner_seat'] : null,
      'active_card' => jdecode($room['active_card_json'] ?? null, null),
      'active_element' => $room['active_element'],
      'pending_draw' => (int)$room['pending_draw'],
      'pass_count' => (int)$room['pass_count'],
    ],
    'me' => $me ? [
      'seat_no' => (int)$me['seat_no'],
      'player_name' => (string)$me['player_name'],
      'is_host' => ((int)$me['is_host'] === 1),
      'hand' => $myHand,
      'has_playable_card' => has_any_playable_card($myHand, jdecode($room['active_card_json'] ?? null, null), (int)$room['pending_draw']),
    ] : null,
    'seats' => array_values($seats),
    'logs' => get_logs($mysqli, $roomId, 20),
  ];
}