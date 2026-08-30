-- ============================================================
-- TALENT FEST - MySQL/MariaDB Schema
-- Converted from PostgreSQL (db)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. AUTH USERS (replaces db auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS `auth_users` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email_confirmed` TINYINT(1) NOT NULL DEFAULT 0,
  `last_sign_in_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `auth_users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS `profiles` (
  `id` VARCHAR(36) NOT NULL,
  `full_name` TEXT,
  `phone` TEXT,
  `city` TEXT,
  `photo_url` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `profiles_id_fk` FOREIGN KEY (`id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. USER ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_roles` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `user_id` VARCHAR(36) NOT NULL,
  `role` ENUM('admin', 'participant') NOT NULL,
  UNIQUE KEY `user_roles_user_id_role_unique` (`user_id`, `role`),
  PRIMARY KEY (`id`),
  CONSTRAINT `user_roles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `events` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `slug` TEXT NOT NULL,
  `city` TEXT NOT NULL,
  `city_code` TEXT NOT NULL DEFAULT '',
  `event_image_url` TEXT,
  `event_date` DATE,
  `start_time` TIME,
  `end_time` TIME,
  `venue` TEXT,
  `map_url` TEXT,
  `participant_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `visitor_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `guest_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `participant_capacity` INT NOT NULL DEFAULT 0,
  `visitor_capacity` INT NOT NULL DEFAULT 0,
  `guest_capacity` INT NOT NULL DEFAULT 0,
  `maximum_guests_per_participant` INT NOT NULL DEFAULT 2,
  `registration_opens_at` TIMESTAMP NULL,
  `registration_closes_at` TIMESTAMP NULL,
  `registration_status` TEXT NOT NULL DEFAULT 'inactive',
  `visitor_registration_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `events_slug_unique` (`slug`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. ACTIVITY CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS `activity_categories` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `slug` TEXT NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `activity_categories_slug_unique` (`slug`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. EVENT ACTIVITY CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_activity_categories` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `event_id` VARCHAR(36) NOT NULL,
  `activity_category_id` VARCHAR(36) NOT NULL,
  `capacity` INT,
  `registration_status` TEXT NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_activity_categories_unique` (`event_id`, `activity_category_id`),
  CONSTRAINT `eac_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `eac_category_id_fk` FOREIGN KEY (`activity_category_id`) REFERENCES `activity_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `registrations` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `registration_number` TEXT,
  `registration_type` TEXT NOT NULL,
  `event_id` VARCHAR(36),
  `first_name` TEXT NOT NULL DEFAULT '',
  `middle_name` TEXT,
  `last_name` TEXT NOT NULL DEFAULT '',
  `full_name` TEXT NOT NULL,
  `phone` TEXT NOT NULL DEFAULT '',
  `email` TEXT NOT NULL DEFAULT '',
  `encrypted_aadhaar` TEXT,
  `aadhaar_last_four` TEXT,
  `aadhaar_consent` TINYINT(1) NOT NULL DEFAULT 0,
  `activity_category_id` VARCHAR(36),
  `payment_status` TEXT NOT NULL DEFAULT 'pending',
  `registration_status` TEXT NOT NULL DEFAULT 'pending',
  `reservation_expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `event_name_snapshot` TEXT,
  `event_city_snapshot` TEXT,
  `event_date_snapshot` DATE,
  `event_start_time_snapshot` TIME,
  `event_end_time_snapshot` TIME,
  `event_venue_snapshot` TEXT,
  `photo_storage_path` TEXT,
  `photo_url` TEXT,
  `photo_uploaded_at` TIMESTAMP NULL,
  `photo_mime_type` TEXT,
  `photo_size_bytes` INT,
  `seat_allocation_status` TEXT NOT NULL DEFAULT 'none',
  PRIMARY KEY (`id`),
  UNIQUE KEY `registrations_number_unique` (`registration_number`(191)),
  KEY `registrations_event_id_idx` (`event_id`),
  KEY `registrations_payment_status_idx` (`payment_status`(50)),
  KEY `registrations_type_idx` (`registration_type`(20)),
  KEY `registrations_email_idx` (`email`(191)),
  KEY `registrations_phone_idx` (`phone`(20)),
  KEY `registrations_status_idx` (`registration_status`(20)),
  KEY `registrations_created_at_idx` (`created_at`),
  CONSTRAINT `reg_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL,
  CONSTRAINT `reg_category_id_fk` FOREIGN KEY (`activity_category_id`) REFERENCES `activity_categories`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. GUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `guests` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `registration_id` VARCHAR(36) NOT NULL,
  `guest_number` INT NOT NULL,
  `full_name` TEXT NOT NULL,
  `phone` TEXT NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `guests_reg_id_number_unique` (`registration_id`, `guest_number`),
  CONSTRAINT `guests_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. PASSES
-- ============================================================
CREATE TABLE IF NOT EXISTS `passes` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `registration_id` VARCHAR(36) NOT NULL,
  `guest_id` VARCHAR(36),
  `pass_number` TEXT,
  `pass_type` TEXT NOT NULL,
  `secure_qr_token` TEXT,
  `secure_qr_token_hash` TEXT,
  `status` TEXT NOT NULL DEFAULT 'active',
  `checked_in` TINYINT(1) NOT NULL DEFAULT 0,
  `checked_in_at` TIMESTAMP NULL,
  `generated_at` TIMESTAMP NULL,
  `revoked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `seat_section_name` TEXT,
  `seat_row_label` TEXT,
  `seat_number` INT,
  `seat_label` TEXT,
  `event_id` VARCHAR(36),
  `event_name_snapshot` TEXT,
  `event_date_snapshot` DATE,
  `event_time_snapshot` TIME,
  `event_venue_snapshot` TEXT,
  PRIMARY KEY (`id`),
  UNIQUE KEY `passes_pass_number_unique` (`pass_number`(191)),
  UNIQUE KEY `passes_qr_token_unique` (`secure_qr_token`(191)),
  KEY `passes_registration_id_idx` (`registration_id`),
  KEY `passes_guest_id_idx` (`guest_id`),
  KEY `passes_type_idx` (`pass_type`(20)),
  KEY `passes_status_idx` (`status`(20)),
  KEY `passes_checked_in_idx` (`checked_in`),
  KEY `passes_event_id_idx` (`event_id`),
  KEY `passes_created_at_idx` (`created_at`),
  CONSTRAINT `passes_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `passes_guest_id_fk` FOREIGN KEY (`guest_id`) REFERENCES `guests`(`id`) ON DELETE SET NULL,
  CONSTRAINT `passes_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `payments` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `registration_id` VARCHAR(36) NOT NULL,
  `provider` TEXT NOT NULL DEFAULT 'dummy',
  `payment_mode` TEXT NOT NULL DEFAULT 'test',
  `order_id` TEXT,
  `transaction_id` TEXT,
  `payment_signature_reference` TEXT,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `currency` TEXT NOT NULL DEFAULT 'INR',
  `status` TEXT NOT NULL DEFAULT 'pending',
  `verified_at` TIMESTAMP NULL,
  `idempotency_key` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payments_registration_id_idx` (`registration_id`),
  KEY `payments_order_id_idx` (`order_id`(191)),
  KEY `payments_transaction_id_idx` (`transaction_id`(191)),
  CONSTRAINT `payments_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11. CHECK IN LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS `check_in_logs` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `pass_id` VARCHAR(36) NOT NULL,
  `admin_user_id` TEXT,
  `previous_status` TEXT,
  `new_status` TEXT NOT NULL,
  `action` TEXT NOT NULL DEFAULT 'check_in',
  `checked_in_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `check_in_logs_pass_id_idx` (`pass_id`),
  CONSTRAINT `check_in_logs_pass_id_fk` FOREIGN KEY (`pass_id`) REFERENCES `passes`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 12. PASS DOWNLOAD LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS `pass_download_logs` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `pass_id` VARCHAR(36) NOT NULL,
  `registration_id` VARCHAR(36) NOT NULL,
  `access_reference` TEXT,
  `downloaded_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `pdl_pass_id_fk` FOREIGN KEY (`pass_id`) REFERENCES `passes`(`id`) ON DELETE CASCADE,
  CONSTRAINT `pdl_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13. ENTRY PASSES (Legacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS `entry_passes` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `entry_number` TEXT NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `participant_name` TEXT NOT NULL,
  `photo_url` TEXT,
  `competition` TEXT NOT NULL,
  `category` TEXT NOT NULL,
  `sub_category` TEXT,
  `city` TEXT,
  `venue` TEXT DEFAULT 'Talent Fest Main Arena',
  `hall` TEXT DEFAULT 'Hall A',
  `stage` TEXT DEFAULT 'Stage 1',
  `entry_gate` TEXT DEFAULT 'Gate 3',
  `event_date` DATE DEFAULT '2026-03-15',
  `reporting_time` TEXT DEFAULT '10:00 AM',
  `performance_time` TEXT DEFAULT '11:30 AM',
  `status` TEXT NOT NULL DEFAULT 'pending',
  `verification_token` TEXT NOT NULL,
  `checked_in_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `company_name` TEXT,
  `company_address` TEXT,
  `coordinator_name` TEXT,
  `company_contact_number` TEXT,
  `company_email` TEXT,
  `employee_full_name` TEXT,
  `designation` TEXT,
  `department` TEXT,
  `gender` TEXT,
  `employee_mobile_number` TEXT,
  `employee_email` TEXT,
  `award_category` TEXT,
  `other_award_category` TEXT,
  `working_since` DATE,
  `total_experience` TEXT,
  `major_achievements` TEXT,
  `participation_type` TEXT,
  `number_of_participants` INT,
  `registration_fees` DECIMAL(10,2),
  `payment_method` TEXT,
  `transaction_reference` TEXT,
  `employee_signature_url` TEXT,
  `company_authorized_signature_url` TEXT,
  `declaration_accepted` TINYINT(1),
  `registration_date` DATE,
  PRIMARY KEY (`id`),
  UNIQUE KEY `entry_passes_entry_number_unique` (`entry_number`(191)),
  KEY `entry_passes_user_id_idx` (`user_id`(36)),
  KEY `entry_passes_status_idx` (`status`(20)),
  KEY `entry_passes_award_category_idx` (`award_category`(191)),
  KEY `entry_passes_company_name_idx` (`company_name`(191)),
  CONSTRAINT `entry_passes_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14. PUBLIC ENTRY PASSES (Legacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS `public_entry_passes` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `participant_name` TEXT NOT NULL,
  `event_name` TEXT NOT NULL DEFAULT 'Telent Fest',
  `entry_number` TEXT NOT NULL,
  `qr_value` TEXT,
  `email` TEXT,
  `phone` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `checked_in` TINYINT(1) DEFAULT 0,
  `checked_in_at` TIMESTAMP NULL,
  `pass_status` TEXT DEFAULT 'generated',
  `status` TEXT DEFAULT 'generated',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `public_entry_passes_entry_number_unique` (`entry_number`(191)),
  KEY `public_entry_passes_created_at_idx` (`created_at`),
  KEY `public_entry_passes_checked_in_idx` (`checked_in`, `checked_in_at`),
  KEY `public_entry_passes_status_idx` (`pass_status`(20)),
  KEY `public_entry_passes_search_idx` (`participant_name`(191), `entry_number`(191), `email`(191), `phone`(20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 15. ADMIN ACTIVITY
-- ============================================================
CREATE TABLE IF NOT EXISTS `admin_activity` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `action` TEXT NOT NULL,
  `entry_number` TEXT,
  `participant_name` TEXT,
  `admin_email` TEXT,
  `pass_id` VARCHAR(36),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_activity_created_at_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 16. GALLERY CITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS `gallery_cities` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `slug` TEXT NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `gallery_cities_slug_unique` (`slug`(191)),
  KEY `gallery_cities_active_order_idx` (`is_active`, `display_order`, `name`(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 17. GALLERY MEDIA
-- ============================================================
CREATE TABLE IF NOT EXISTS `gallery_media` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `city_id` VARCHAR(36),
  `title` TEXT NOT NULL,
  `description` TEXT,
  `media_type` TEXT NOT NULL DEFAULT 'photo',
  `category` TEXT NOT NULL DEFAULT 'Photos',
  `storage_path` TEXT NOT NULL,
  `media_url` TEXT NOT NULL,
  `thumbnail_url` TEXT,
  `alt_text` TEXT,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `width` INT,
  `height` INT,
  `fit_mode` TEXT NOT NULL DEFAULT 'contain',
  `fit_position` TEXT NOT NULL DEFAULT 'center',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `gallery_media_city_id_idx` (`city_id`),
  KEY `gallery_media_type_category_idx` (`media_type`(20), `category`(50)),
  KEY `gallery_media_featured_idx` (`is_featured`),
  KEY `gallery_media_storage_path_idx` (`storage_path`(191)),
  CONSTRAINT `gallery_media_city_id_fk` FOREIGN KEY (`city_id`) REFERENCES `gallery_cities`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 18. CONCERT SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS `concert_settings` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `eyebrow` TEXT NOT NULL DEFAULT 'Live Concert',
  `title` TEXT NOT NULL DEFAULT 'Concert Information',
  `subtitle` TEXT NOT NULL DEFAULT '',
  `event_label` TEXT NOT NULL DEFAULT 'Grand Finale',
  `event_title` TEXT NOT NULL DEFAULT 'TelentFest Grand Finale',
  `venue` TEXT NOT NULL DEFAULT '',
  `city` TEXT NOT NULL DEFAULT '',
  `event_date` TEXT,
  `start_time` TEXT,
  `end_time` TEXT,
  `price_text` TEXT NOT NULL DEFAULT '',
  `button_text` TEXT NOT NULL DEFAULT 'Registration Form',
  `button_url` TEXT NOT NULL DEFAULT '/registration',
  `map_url` TEXT NOT NULL DEFAULT '',
  `map_embed_url` TEXT NOT NULL DEFAULT '',
  `latitude` DECIMAL(10,7),
  `longitude` DECIMAL(10,7),
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `concert_settings_updated_at_idx` (`updated_at`),
  KEY `concert_settings_published_idx` (`is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 19. CONCERT ARTISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `concert_artists` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `concert_info_id` VARCHAR(36),
  `artist_name` TEXT NOT NULL,
  `performance_type` TEXT NOT NULL DEFAULT '',
  `description` TEXT,
  `image_url` TEXT,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `concert_artists_info_id_idx` (`concert_info_id`),
  KEY `concert_artists_order_idx` (`display_order`),
  CONSTRAINT `concert_artists_info_id_fk` FOREIGN KEY (`concert_info_id`) REFERENCES `concert_settings`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 20. BLOG POSTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `blog_posts` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `title` TEXT NOT NULL,
  `slug` TEXT NOT NULL,
  `excerpt` TEXT NOT NULL DEFAULT '',
  `content` TEXT NOT NULL DEFAULT '',
  `category` TEXT NOT NULL DEFAULT 'Updates',
  `thumbnail_url` TEXT,
  `thumbnail_alt` TEXT,
  `status` TEXT NOT NULL DEFAULT 'draft',
  `published_at` TIMESTAMP NULL,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `blog_posts_slug_unique` (`slug`(191)),
  KEY `blog_posts_status_idx` (`status`(20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 21. EMPLOYEE AWARD REGISTRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `employee_award_registrations` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `application_number` TEXT NOT NULL,
  `company_name` TEXT NOT NULL,
  `company_address` TEXT NOT NULL,
  `coordinator_name` TEXT NOT NULL,
  `contact_number` TEXT NOT NULL,
  `company_email` TEXT NOT NULL,
  `employee_full_name` TEXT NOT NULL,
  `designation` TEXT NOT NULL,
  `department` TEXT NOT NULL,
  `gender` TEXT NOT NULL,
  `mobile_number` TEXT NOT NULL,
  `employee_email` TEXT NOT NULL,
  `award_categories` JSON,
  `other_award_category` TEXT,
  `working_since` DATE,
  `total_experience` TEXT NOT NULL,
  `major_achievements` TEXT NOT NULL,
  `event_participation` TEXT NOT NULL,
  `number_of_participants` INT NOT NULL DEFAULT 1,
  `declaration_accepted` TINYINT(1) NOT NULL DEFAULT 0,
  `employee_signature_name` TEXT NOT NULL,
  `authorized_company_signature_name` TEXT NOT NULL,
  `declaration_date` DATE NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'submitted',
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ear_application_number_unique` (`application_number`(191)),
  KEY `ear_created_at_idx` (`created_at`),
  KEY `ear_status_idx` (`status`(20))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 22. CONTACT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS `contact_messages` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `full_name` TEXT NOT NULL,
  `phone` TEXT NOT NULL,
  `email` TEXT NOT NULL,
  `subject` TEXT NOT NULL,
  `message` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'new',
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `contact_messages_status_idx` (`status`(20)),
  KEY `contact_messages_submitted_at_idx` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 23. EVENT SEAT SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_seat_sections` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `event_id` VARCHAR(36) NOT NULL,
  `section_name` TEXT NOT NULL,
  `section_code` TEXT NOT NULL,
  `seat_type` TEXT NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_seat_sections_unique` (`event_id`, `section_code`(50)),
  CONSTRAINT `ess_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 24. EVENT SEATS
-- ============================================================
CREATE TABLE IF NOT EXISTS `event_seats` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `event_id` VARCHAR(36) NOT NULL,
  `section_id` VARCHAR(36) NOT NULL,
  `row_label` TEXT NOT NULL,
  `seat_number` INT NOT NULL,
  `seat_label` TEXT NOT NULL,
  `seat_type` TEXT NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'available',
  `display_order` INT NOT NULL DEFAULT 0,
  `is_accessible` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `event_seats_label_unique` (`event_id`, `seat_label`(50)),
  KEY `event_seats_event_id_idx` (`event_id`),
  KEY `event_seats_section_id_idx` (`section_id`),
  KEY `event_seats_status_idx` (`event_id`, `status`(20)),
  KEY `event_seats_type_status_idx` (`event_id`, `seat_type`(20), `status`(20)),
  CONSTRAINT `es_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `es_section_id_fk` FOREIGN KEY (`section_id`) REFERENCES `event_seat_sections`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 25. SEAT HOLDS
-- ============================================================
CREATE TABLE IF NOT EXISTS `seat_holds` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `event_id` VARCHAR(36) NOT NULL,
  `seat_id` VARCHAR(36) NOT NULL,
  `registration_id` VARCHAR(36),
  `hold_token` TEXT NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seat_holds_token_unique` (`hold_token`(191)),
  KEY `seat_holds_event_id_idx` (`event_id`),
  KEY `seat_holds_registration_id_idx` (`registration_id`),
  KEY `seat_holds_expires_idx` (`expires_at`),
  CONSTRAINT `sh_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `sh_seat_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `event_seats`(`id`) ON DELETE CASCADE,
  CONSTRAINT `sh_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 26. SEAT BOOKINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS `seat_bookings` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `event_id` VARCHAR(36) NOT NULL,
  `seat_id` VARCHAR(36) NOT NULL,
  `registration_id` VARCHAR(36) NOT NULL,
  `pass_id` VARCHAR(36),
  `holder_type` TEXT NOT NULL,
  `holder_name` TEXT NOT NULL,
  `booked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `seat_bookings_event_seat_unique` (`event_id`, `seat_id`),
  KEY `seat_bookings_event_id_idx` (`event_id`),
  KEY `seat_bookings_registration_id_idx` (`registration_id`),
  KEY `seat_bookings_pass_id_idx` (`pass_id`),
  CONSTRAINT `sb_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `sb_seat_id_fk` FOREIGN KEY (`seat_id`) REFERENCES `event_seats`(`id`) ON DELETE CASCADE,
  CONSTRAINT `sb_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE CASCADE,
  CONSTRAINT `sb_pass_id_fk` FOREIGN KEY (`pass_id`) REFERENCES `passes`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 27. SEAT ALLOCATION AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS `seat_allocation_audit` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `event_id` VARCHAR(36) NOT NULL,
  `registration_id` VARCHAR(36),
  `pass_id` VARCHAR(36),
  `old_seat_id` VARCHAR(36),
  `new_seat_id` VARCHAR(36),
  `action` TEXT NOT NULL,
  `changed_by` TEXT NOT NULL DEFAULT 'system',
  `reason` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `saa_event_id_idx` (`event_id`),
  KEY `saa_registration_id_idx` (`registration_id`),
  CONSTRAINT `saa_event_id_fk` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
  CONSTRAINT `saa_registration_id_fk` FOREIGN KEY (`registration_id`) REFERENCES `registrations`(`id`) ON DELETE SET NULL,
  CONSTRAINT `saa_pass_id_fk` FOREIGN KEY (`pass_id`) REFERENCES `passes`(`id`) ON DELETE SET NULL,
  CONSTRAINT `saa_old_seat_id_fk` FOREIGN KEY (`old_seat_id`) REFERENCES `event_seats`(`id`) ON DELETE SET NULL,
  CONSTRAINT `saa_new_seat_id_fk` FOREIGN KEY (`new_seat_id`) REFERENCES `event_seats`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 28. RATE LIMITS
-- ============================================================
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `action_key` TEXT NOT NULL,
  `identifier` TEXT NOT NULL,
  `window_start` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `attempt_count` INT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rate_limits_unique` (`action_key`(100), `identifier`(100), `window_start`),
  KEY `rate_limits_lookup_idx` (`action_key`(100), `identifier`(100), `window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 29. UPLOADED OBJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `uploaded_objects` (
  `object_key` VARCHAR(512) NOT NULL,
  `bucket` VARCHAR(128) NOT NULL,
  `object_path` VARCHAR(384) NOT NULL,
  `body_base64` LONGTEXT NOT NULL,
  `content_type` VARCHAR(128) NOT NULL,
  `size_bytes` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`object_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA
-- ============================================================

-- Events
INSERT INTO `events` (`id`, `name`, `slug`, `city`, `city_code`, `event_date`, `start_time`, `end_time`, `venue`, `participant_price`, `visitor_price`, `guest_price`, `participant_capacity`, `visitor_capacity`, `guest_capacity`, `maximum_guests_per_participant`, `registration_status`, `visitor_registration_enabled`, `is_active`) VALUES
('e1a00000-0000-0000-0000-000000000001', 'Telent Fest Ahmedabad', 'telent-fest-ahmedabad', 'Ahmedabad', 'AMD', '2026-08-15', '09:00', '18:00', 'Ahmedabad Convention Centre', 299.00, 149.00, 199.00, 500, 200, 100, 2, 'active', 1, 1),
('e1a00000-0000-0000-0000-000000000002', 'Telent Fest Surat', 'telent-fest-surat', 'Surat', 'SUR', '2026-08-22', '09:00', '18:00', 'Surat Exhibition Hall', 299.00, 149.00, 199.00, 500, 200, 100, 2, 'active', 1, 1),
('e1a00000-0000-0000-0000-000000000003', 'Telent Fest Vadodara', 'telent-fest-vadodara', 'Vadodara', 'VAD', '2026-09-05', '09:00', '18:00', 'Vadodara Cultural Centre', 299.00, 149.00, 199.00, 500, 200, 100, 2, 'active', 1, 1),
('e1a00000-0000-0000-0000-000000000004', 'Telent Fest Rajkot', 'telent-fest-rajkot', 'Rajkot', 'RAJ', '2026-09-12', '09:00', '18:00', 'Rajkot Town Hall', 299.00, 149.00, 199.00, 500, 200, 100, 2, 'active', 1, 1);

-- Activity Categories
INSERT INTO `activity_categories` (`id`, `name`, `slug`, `is_active`) VALUES
('c1a00000-0000-0000-0000-000000000001', 'Singing', 'singing', 1),
('c1a00000-0000-0000-0000-000000000002', 'Dancing', 'dancing', 1),
('c1a00000-0000-0000-0000-000000000003', 'Music', 'music', 1),
('c1a00000-0000-0000-0000-000000000004', 'Instrumental Music', 'instrumental-music', 1),
('c1a00000-0000-0000-0000-000000000005', 'Acting', 'acting', 1),
('c1a00000-0000-0000-0000-000000000006', 'Drama and Theatre', 'drama-and-theatre', 1),
('c1a00000-0000-0000-0000-000000000007', 'Painting', 'painting', 1),
('c1a00000-0000-0000-0000-000000000008', 'Drawing and Sketching', 'drawing-and-sketching', 1),
('c1a00000-0000-0000-0000-000000000009', 'Arts and Craft', 'arts-and-craft', 1),
('c1a00000-0000-0000-0000-000000000010', 'Creative Writing', 'creative-writing', 1),
('c1a00000-0000-0000-0000-000000000011', 'Photography', 'photography', 1),
('c1a00000-0000-0000-0000-000000000012', 'Solo Performance', 'solo-performance', 1),
('c1a00000-0000-0000-0000-000000000013', 'Group Performance', 'group-performance', 1),
('c1a00000-0000-0000-0000-000000000014', 'Other', 'other', 1);

-- Gallery Cities
INSERT INTO `gallery_cities` (`id`, `name`, `slug`, `display_order`, `is_active`) VALUES
('g1a00000-0000-0000-0000-000000000001', 'Vadodara', 'vadodara', 1, 1),
('g1a00000-0000-0000-0000-000000000002', 'Surat', 'surat', 2, 1),
('g1a00000-0000-0000-0000-000000000003', 'Rajkot', 'rajkot', 3, 1),
('g1a00000-0000-0000-0000-000000000004', 'Ahmedabad', 'ahmedabad', 4, 1),
('g1a00000-0000-0000-0000-000000000005', 'Somnath', 'somnath', 5, 1),
('g1a00000-0000-0000-0000-000000000006', 'Kutch', 'kutch', 6, 1),
('g1a00000-0000-0000-0000-000000000007', 'Bhavnagar', 'bhavnagar', 7, 1),
('g1a00000-0000-0000-0000-000000000008', 'Junagadh', 'junagadh', 8, 1);

-- Concert Settings
INSERT INTO `concert_settings` (`id`, `eyebrow`, `title`, `subtitle`, `event_label`, `event_title`, `venue`, `city`, `event_date`, `start_time`, `end_time`, `is_published`) VALUES
('cs000000-0000-0000-0000-000000000001', 'Live Concert', 'Concert Information', '', 'Grand Finale', 'TelentFest Grand Finale', 'Pramukh Swami Auditorium', 'Rajkot', '2026-07-26', '14:00', '19:00', 1);

-- Blog Posts
INSERT INTO `blog_posts` (`id`, `title`, `slug`, `excerpt`, `content`, `category`, `status`, `is_featured`) VALUES
('b1a00000-0000-0000-0000-000000000001', 'How to Prepare for Your Telent Fest Audition', 'how-to-prepare-for-your-telent-fest-audition', 'Tips and tricks to ace your audition.', 'Full content here.', 'Tips', 'published', 1),
('b1a00000-0000-0000-0000-000000000002', 'Celebrating Winners Across Gujarat', 'celebrating-winners-across-gujarat', 'Recap of last season winners.', 'Full content here.', 'Updates', 'published', 0),
('b1a00000-0000-0000-0000-000000000003', 'City Events Are Growing', 'city-events-are-growing', 'More cities joining Telent Fest.', 'Full content here.', 'News', 'published', 0);

SET FOREIGN_KEY_CHECKS = 1;
