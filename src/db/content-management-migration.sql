-- Additive content tables. Existing static content remains the public fallback.
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `designation` TEXT NOT NULL,
  `photo_url` TEXT NULL,
  `photo_path` TEXT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `team_members_order_idx` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `title` TEXT NOT NULL,
  `subtitle` TEXT NOT NULL DEFAULT '',
  `label` TEXT NOT NULL DEFAULT '',
  `banner_url` TEXT NULL,
  `banner_path` TEXT NULL,
  `link_url` TEXT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `projects_order_idx` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sponsorship_documents` (
  `id` VARCHAR(36) NOT NULL DEFAULT (UUID()),
  `name` TEXT NOT NULL,
  `file_url` TEXT NOT NULL,
  `file_path` TEXT NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `sponsorship_documents_order_idx` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the public fallback content once so it is immediately editable in Admin.
INSERT INTO `team_members` (`id`, `name`, `designation`, `display_order`)
SELECT 'c1000000-0000-0000-0000-000000000001', 'JB Ahir', 'Founder & CEO', 1
WHERE NOT EXISTS (SELECT 1 FROM `team_members` WHERE `name` = 'JB Ahir');
INSERT INTO `team_members` (`id`, `name`, `designation`, `display_order`)
SELECT 'c1000000-0000-0000-0000-000000000002', 'Priya Sharma', 'Head of Operations', 2
WHERE NOT EXISTS (SELECT 1 FROM `team_members` WHERE `name` = 'Priya Sharma');
INSERT INTO `team_members` (`id`, `name`, `designation`, `display_order`)
SELECT 'c1000000-0000-0000-0000-000000000003', 'Rohan Verma', 'Creative Director', 3
WHERE NOT EXISTS (SELECT 1 FROM `team_members` WHERE `name` = 'Rohan Verma');
INSERT INTO `team_members` (`id`, `name`, `designation`, `display_order`)
SELECT 'c1000000-0000-0000-0000-000000000004', 'Ananya Iyer', 'Marketing Lead', 4
WHERE NOT EXISTS (SELECT 1 FROM `team_members` WHERE `name` = 'Ananya Iyer');

INSERT INTO `projects` (`id`, `title`, `subtitle`, `label`, `banner_url`, `display_order`)
SELECT 'c2000000-0000-0000-0000-000000000001', 'Upcoming Project', 'A new TELENTFEST initiative is being prepared and will be announced soon.', 'UPCOMING PROJECTS', '/project-assets/registered-students-post.png', 1
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `banner_url` = '/project-assets/registered-students-post.png');
INSERT INTO `projects` (`id`, `title`, `subtitle`, `label`, `banner_url`, `display_order`)
SELECT 'c2000000-0000-0000-0000-000000000002', 'Upcoming Project', 'A new TELENTFEST initiative is being prepared and will be announced soon.', 'UPCOMING PROJECTS', '/project-assets/upcoming-project-poster.jpeg', 2
WHERE NOT EXISTS (SELECT 1 FROM `projects` WHERE `banner_url` = '/project-assets/upcoming-project-poster.jpeg');

INSERT INTO `sponsorship_documents` (`id`, `name`, `file_url`, `file_path`, `display_order`)
SELECT 'c3000000-0000-0000-0000-000000000001', 'Grand Finale Brochure', '/documents/telentfest-grand-finale-brochure.pdf', 'legacy/telentfest-grand-finale-brochure.pdf', 1
WHERE NOT EXISTS (SELECT 1 FROM `sponsorship_documents` WHERE `file_url` = '/documents/telentfest-grand-finale-brochure.pdf');
INSERT INTO `sponsorship_documents` (`id`, `name`, `file_url`, `file_path`, `display_order`)
SELECT 'c3000000-0000-0000-0000-000000000002', 'Employee Award Ceremony Brochure', '/documents/employee-award-ceremony-brochure.pdf', 'legacy/employee-award-ceremony-brochure.pdf', 2
WHERE NOT EXISTS (SELECT 1 FROM `sponsorship_documents` WHERE `file_url` = '/documents/employee-award-ceremony-brochure.pdf');
