ALTER TABLE `employee_award_recipients`
  ADD COLUMN IF NOT EXISTS `award_category` TEXT NULL AFTER `designation`,
  ADD COLUMN IF NOT EXISTS `other_award_category` TEXT NULL AFTER `award_category`;
