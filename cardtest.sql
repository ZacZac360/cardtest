-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 17, 2026 at 06:22 AM
-- Server version: 8.0.44
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `cardtest`
--

-- --------------------------------------------------------

--
-- Table structure for table `game_logs`
--

CREATE TABLE `game_logs` (
  `id` int UNSIGNED NOT NULL,
  `room_id` int UNSIGNED NOT NULL,
  `log_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `game_logs`
--

INSERT INTO `game_logs` (`id`, `room_id`, `log_text`, `created_at`) VALUES
(11, 1, 'Game started with 4 total seat(s).', '2026-03-17 13:20:42'),
(12, 1, 'Zai2 takes the first turn.', '2026-03-17 13:20:42'),
(13, 1, 'Zai2 played Fire 1.', '2026-03-17 13:20:48'),
(14, 1, 'Zai played Water 7.', '2026-03-17 13:20:57'),
(15, 1, 'AI 3 played Lightning 4.', '2026-03-17 13:20:57'),
(16, 1, 'AI 4 played Earth 5.', '2026-03-17 13:20:57');

-- --------------------------------------------------------

--
-- Table structure for table `player_hands`
--

CREATE TABLE `player_hands` (
  `id` int UNSIGNED NOT NULL,
  `room_id` int UNSIGNED NOT NULL,
  `seat_no` tinyint UNSIGNED NOT NULL,
  `hand_json` longtext COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `player_hands`
--

INSERT INTO `player_hands` (`id`, `room_id`, `seat_no`, `hand_json`) VALUES
(8, 1, 1, '[{\"id\":\"10c1e0106110\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":5,\"name\":\"Water 5\"},{\"id\":\"5c5ca2662508\",\"kind\":\"plus4\",\"element\":\"Wild\",\"value\":null,\"name\":\"+4 Wild\"},{\"id\":\"c5578f569425\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":1,\"name\":\"Water 1\"},{\"id\":\"2081a8e22544\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":5,\"name\":\"Earth 5\"},{\"id\":\"571415b57f19\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":5,\"name\":\"Wind 5\"},{\"id\":\"bd3c1a54c7e3\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":6,\"name\":\"Wind 6\"}]'),
(9, 1, 2, '[{\"id\":\"a0d0d7024ffe\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":5,\"name\":\"Wind 5\"},{\"id\":\"bc4cfca33d8a\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":8,\"name\":\"Lightning 8\"},{\"id\":\"fe01b1ce5dee\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":10,\"name\":\"Fire 10\"},{\"id\":\"5dc83c128764\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":2,\"name\":\"Lightning 2\"},{\"id\":\"2132bd243c0d\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":9,\"name\":\"Lightning 9\"},{\"id\":\"100bafcd9934\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":9,\"name\":\"Water 9\"}]'),
(10, 1, 3, '[{\"id\":\"f6b986cccc07\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":5,\"name\":\"Wood 5\"},{\"id\":\"a2d0b55029a4\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":6,\"name\":\"Wood 6\"},{\"id\":\"9a1ece41727d\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":8,\"name\":\"Fire 8\"},{\"id\":\"372d97ecc355\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":5,\"name\":\"Fire 5\"},{\"id\":\"dae49f0774c2\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":1,\"name\":\"Wind 1\"},{\"id\":\"519416727a63\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":9,\"name\":\"Wood 9\"}]'),
(11, 1, 4, '[{\"id\":\"c6b50c9faa7e\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":5,\"name\":\"Water 5\"},{\"id\":\"1b77356dda2d\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":5,\"name\":\"Lightning 5\"},{\"id\":\"9a7d91641684\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":1,\"name\":\"Lightning 1\"},{\"id\":\"a50df256fd53\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":7,\"name\":\"Earth 7\"},{\"id\":\"796fb431f2e9\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":8,\"name\":\"Wood 8\"},{\"id\":\"bd19af10ce88\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":3,\"name\":\"Fire 3\"}]');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `id` int UNSIGNED NOT NULL,
  `room_code` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('waiting','playing','finished') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'waiting',
  `max_players` tinyint UNSIGNED NOT NULL DEFAULT '4',
  `host_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_turn_seat` tinyint UNSIGNED DEFAULT NULL,
  `lead_seat` tinyint UNSIGNED DEFAULT NULL,
  `last_played_seat` tinyint UNSIGNED DEFAULT NULL,
  `active_card_json` longtext COLLATE utf8mb4_unicode_ci,
  `active_element` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pending_draw` int NOT NULL DEFAULT '0',
  `pass_count` int NOT NULL DEFAULT '0',
  `winner_seat` tinyint UNSIGNED DEFAULT NULL,
  `draw_pile_json` longtext COLLATE utf8mb4_unicode_ci,
  `discard_pile_json` longtext COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`id`, `room_code`, `status`, `max_players`, `host_token`, `current_turn_seat`, `lead_seat`, `last_played_seat`, `active_card_json`, `active_element`, `pending_draw`, `pass_count`, `winner_seat`, `draw_pile_json`, `discard_pile_json`, `created_at`, `updated_at`) VALUES
(1, 'PROTO', 'playing', 4, '6ceb5e58e98a7a5fb847c4b93ae0be8a', 1, 4, 4, '{\"id\":\"f69bc28c60cc\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":5,\"name\":\"Earth 5\"}', 'Earth', 0, 0, NULL, '[{\"id\":\"2dcc64068a5c\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":8,\"name\":\"Earth 8\"},{\"id\":\"8d84826cf8b4\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":10,\"name\":\"Lightning 10\"},{\"id\":\"4185a1e60a60\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":1,\"name\":\"Wood 1\"},{\"id\":\"6b69204c19b4\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":3,\"name\":\"Water 3\"},{\"id\":\"294610fc49ba\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":7,\"name\":\"Wood 7\"},{\"id\":\"3780fda636c7\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":9,\"name\":\"Fire 9\"},{\"id\":\"c70e8461b1ea\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":8,\"name\":\"Fire 8\"},{\"id\":\"f2d982380b47\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":9,\"name\":\"Wind 9\"},{\"id\":\"e6cbe878f1ef\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":6,\"name\":\"Earth 6\"},{\"id\":\"abcc007753c4\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":3,\"name\":\"Lightning 3\"},{\"id\":\"4bfea82bcda2\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":7,\"name\":\"Wind 7\"},{\"id\":\"5453c6c89fef\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":2,\"name\":\"Fire 2\"},{\"id\":\"847a154061cd\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":7,\"name\":\"Fire 7\"},{\"id\":\"e9bc4ba6f68f\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":8,\"name\":\"Lightning 8\"},{\"id\":\"0e19e013bf2d\",\"kind\":\"plus2\",\"element\":\"Earth\",\"value\":null,\"name\":\"+2 Earth\"},{\"id\":\"ddc9b1b44e8b\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":4,\"name\":\"Wind 4\"},{\"id\":\"323144cc5614\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":2,\"name\":\"Earth 2\"},{\"id\":\"03a67077ce2a\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":6,\"name\":\"Water 6\"},{\"id\":\"aa8bec4740d6\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":1,\"name\":\"Earth 1\"},{\"id\":\"5498bd394d2d\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":5,\"name\":\"Lightning 5\"},{\"id\":\"301090fb3273\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":8,\"name\":\"Water 8\"},{\"id\":\"6f73377d3398\",\"kind\":\"plus4\",\"element\":\"Wild\",\"value\":null,\"name\":\"+4 Wild\"},{\"id\":\"71e7228fd6ff\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":8,\"name\":\"Wind 8\"},{\"id\":\"4050eb94f88c\",\"kind\":\"plus4\",\"element\":\"Wild\",\"value\":null,\"name\":\"+4 Wild\"},{\"id\":\"b28ed29b7202\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":2,\"name\":\"Wood 2\"},{\"id\":\"0ab521122e9d\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":3,\"name\":\"Wind 3\"},{\"id\":\"1c7589ed6fd0\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":7,\"name\":\"Lightning 7\"},{\"id\":\"5cb518a0cb95\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":10,\"name\":\"Wind 10\"},{\"id\":\"6e3b5731e9dd\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":3,\"name\":\"Earth 3\"},{\"id\":\"8efcbbd95057\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":10,\"name\":\"Earth 10\"},{\"id\":\"a4d6b10735ad\",\"kind\":\"plus2\",\"element\":\"Water\",\"value\":null,\"name\":\"+2 Water\"},{\"id\":\"de02644a55de\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":8,\"name\":\"Water 8\"},{\"id\":\"e1bb44302771\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":2,\"name\":\"Wind 2\"},{\"id\":\"65bb62fa0822\",\"kind\":\"plus2\",\"element\":\"Lightning\",\"value\":null,\"name\":\"+2 Lightning\"},{\"id\":\"149a791ed249\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":3,\"name\":\"Wood 3\"},{\"id\":\"08d46849d829\",\"kind\":\"normal\",\"element\":\"Wind\",\"value\":8,\"name\":\"Wind 8\"},{\"id\":\"3163c83d365e\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":9,\"name\":\"Earth 9\"},{\"id\":\"590b7a8e2c58\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":10,\"name\":\"Wood 10\"},{\"id\":\"7e290db148c1\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":6,\"name\":\"Lightning 6\"},{\"id\":\"abd7c9f13393\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":4,\"name\":\"Wood 4\"},{\"id\":\"a81e2974b7b6\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":5,\"name\":\"Fire 5\"},{\"id\":\"4509a954adb0\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":4,\"name\":\"Water 4\"},{\"id\":\"6c0346d2f596\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":4,\"name\":\"Earth 4\"},{\"id\":\"bc728bea2c8b\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":8,\"name\":\"Earth 8\"},{\"id\":\"6ca8532de64f\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":6,\"name\":\"Fire 6\"},{\"id\":\"27ab050e4181\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":4,\"name\":\"Fire 4\"},{\"id\":\"28c9492f7283\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":10,\"name\":\"Water 10\"},{\"id\":\"2b7e256c0a3e\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":2,\"name\":\"Water 2\"},{\"id\":\"4492cde9bd73\",\"kind\":\"plus2\",\"element\":\"Wood\",\"value\":null,\"name\":\"+2 Wood\"},{\"id\":\"2b3a49f345d3\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":8,\"name\":\"Wood 8\"},{\"id\":\"79d8b3f948f9\",\"kind\":\"plus2\",\"element\":\"Wind\",\"value\":null,\"name\":\"+2 Wind\"},{\"id\":\"2cc2d4bdeb87\",\"kind\":\"plus2\",\"element\":\"Fire\",\"value\":null,\"name\":\"+2 Fire\"},{\"id\":\"4e0ba218c400\",\"kind\":\"plus4\",\"element\":\"Wild\",\"value\":null,\"name\":\"+4 Wild\"},{\"id\":\"2be39d3bb083\",\"kind\":\"normal\",\"element\":\"Wood\",\"value\":5,\"name\":\"Wood 5\"}]', '[{\"id\":\"29693fc89cad\",\"kind\":\"normal\",\"element\":\"Fire\",\"value\":1,\"name\":\"Fire 1\"},{\"id\":\"40918bab5cdc\",\"kind\":\"normal\",\"element\":\"Water\",\"value\":7,\"name\":\"Water 7\"},{\"id\":\"1f42635ab1e4\",\"kind\":\"normal\",\"element\":\"Lightning\",\"value\":4,\"name\":\"Lightning 4\"},{\"id\":\"f69bc28c60cc\",\"kind\":\"normal\",\"element\":\"Earth\",\"value\":5,\"name\":\"Earth 5\"}]', '2026-03-17 12:59:57', '2026-03-17 13:20:57');

-- --------------------------------------------------------

--
-- Table structure for table `room_players`
--

CREATE TABLE `room_players` (
  `id` int UNSIGNED NOT NULL,
  `room_id` int UNSIGNED NOT NULL,
  `seat_no` tinyint UNSIGNED NOT NULL,
  `player_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `player_type` enum('human','ai') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'human',
  `session_token` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_host` tinyint(1) NOT NULL DEFAULT '0',
  `connected_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `room_players`
--

INSERT INTO `room_players` (`id`, `room_id`, `seat_no`, `player_name`, `player_type`, `session_token`, `is_host`, `connected_at`, `last_seen_at`) VALUES
(3, 1, 1, 'Zai2', 'human', '6ceb5e58e98a7a5fb847c4b93ae0be8a', 1, '2026-03-17 13:20:33', '2026-03-17 13:21:19'),
(4, 1, 2, 'Zai', 'human', '0095db50974b6cc7b3643fd694699625', 0, '2026-03-17 13:20:36', '2026-03-17 13:22:21'),
(5, 1, 3, 'AI 3', 'ai', NULL, 0, '2026-03-17 13:20:42', '2026-03-17 13:20:42'),
(6, 1, 4, 'AI 4', 'ai', NULL, 0, '2026-03-17 13:20:42', '2026-03-17 13:20:42');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `game_logs`
--
ALTER TABLE `game_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_room_logs` (`room_id`,`id`);

--
-- Indexes for table `player_hands`
--
ALTER TABLE `player_hands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_room_hand` (`room_id`,`seat_no`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_room_code` (`room_code`);

--
-- Indexes for table `room_players`
--
ALTER TABLE `room_players`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_room_seat` (`room_id`,`seat_no`),
  ADD UNIQUE KEY `uq_session_token` (`session_token`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `game_logs`
--
ALTER TABLE `game_logs`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `player_hands`
--
ALTER TABLE `player_hands`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `room_players`
--
ALTER TABLE `room_players`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `game_logs`
--
ALTER TABLE `game_logs`
  ADD CONSTRAINT `fk_game_logs_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `player_hands`
--
ALTER TABLE `player_hands`
  ADD CONSTRAINT `fk_player_hands_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `room_players`
--
ALTER TABLE `room_players`
  ADD CONSTRAINT `fk_room_players_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
