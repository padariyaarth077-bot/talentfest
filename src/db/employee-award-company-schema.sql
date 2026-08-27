CREATE TABLE IF NOT EXISTS `employee_award_sequences` (
  `name` VARCHAR(64) NOT NULL,
  `value` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `employee_award_sequences` (`name`, `value`) VALUES
  ('company', 0),
  ('award', 0),
  ('invoice', 0);

CREATE TABLE IF NOT EXISTS `employee_award_company_registrations` (
  `id` VARCHAR(36) NOT NULL,
  `company_registration_number` VARCHAR(32) NOT NULL,
  `company_name` TEXT NOT NULL,
  `company_logo_path` TEXT NOT NULL,
  `company_logo_url` TEXT NOT NULL,
  `company_email` TEXT NOT NULL,
  `company_mobile` TEXT NOT NULL,
  `company_address` TEXT NOT NULL,
  `city` TEXT NOT NULL,
  `state` TEXT NOT NULL,
  `pincode` TEXT NOT NULL,
  `gst_number` TEXT,
  `company_website` TEXT,
  `owner_name` TEXT NOT NULL,
  `owner_designation` TEXT NOT NULL,
  `owner_email` TEXT NOT NULL,
  `owner_mobile` TEXT NOT NULL,
  `owner_photo_path` TEXT,
  `owner_photo_url` TEXT,
  `employee_count` INT NOT NULL,
  `total_recipients` INT NOT NULL,
  `price_per_recipient` DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `payment_status` TEXT NOT NULL DEFAULT 'pending',
  `invoice_number` VARCHAR(32) NOT NULL,
  `payment_order_id` TEXT,
  `transaction_id` TEXT,
  `payment_method` TEXT,
  `paid_at` TIMESTAMP NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_award_company_reg_unique` (`company_registration_number`),
  UNIQUE KEY `employee_award_company_invoice_unique` (`invoice_number`),
  UNIQUE KEY `employee_award_company_idempotency_unique` (`idempotency_key`),
  KEY `employee_award_company_payment_idx` (`payment_status`(32)),
  KEY `employee_award_company_created_idx` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employee_award_recipients` (
  `id` VARCHAR(36) NOT NULL,
  `company_registration_id` VARCHAR(36) NOT NULL,
  `award_registration_number` VARCHAR(32) NOT NULL,
  `recipient_type` ENUM('owner', 'employee') NOT NULL,
  `display_order` INT NOT NULL,
  `name` TEXT NOT NULL,
  `designation` TEXT NOT NULL,
  `department` TEXT,
  `email` TEXT,
  `mobile` TEXT,
  `photo_path` TEXT,
  `photo_url` TEXT,
  `fee_amount` DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
  `status` TEXT NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_award_recipient_unique` (`award_registration_number`),
  KEY `employee_award_recipient_company_idx` (`company_registration_id`),
  KEY `employee_award_recipient_type_idx` (`recipient_type`),
  CONSTRAINT `employee_award_recipient_company_fk`
    FOREIGN KEY (`company_registration_id`)
    REFERENCES `employee_award_company_registrations` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `employee_award_payments` (
  `id` VARCHAR(36) NOT NULL,
  `company_registration_id` VARCHAR(36) NOT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `transaction_id` TEXT,
  `amount` DECIMAL(10,2) NOT NULL,
  `currency` TEXT NOT NULL DEFAULT 'INR',
  `provider` TEXT NOT NULL DEFAULT 'dummy',
  `payment_mode` TEXT NOT NULL DEFAULT 'test',
  `status` TEXT NOT NULL DEFAULT 'pending',
  `verified_at` TIMESTAMP NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_award_payment_order_unique` (`order_id`),
  UNIQUE KEY `employee_award_payment_idempotency_unique` (`idempotency_key`),
  KEY `employee_award_payment_company_idx` (`company_registration_id`),
  KEY `employee_award_payment_status_idx` (`status`(32)),
  CONSTRAINT `employee_award_payment_company_fk`
    FOREIGN KEY (`company_registration_id`)
    REFERENCES `employee_award_company_registrations` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
