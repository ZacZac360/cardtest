-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Mar 17, 2026 at 02:48 PM
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
(2, 'PROTO', 'waiting', 4, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, NULL, '2026-03-17 16:31:27', '2026-03-17 20:45:37');

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
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=384;

--
-- AUTO_INCREMENT for table `player_hands`
--
ALTER TABLE `player_hands`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=414;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `room_players`
--
ALTER TABLE `room_players`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=87;

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
