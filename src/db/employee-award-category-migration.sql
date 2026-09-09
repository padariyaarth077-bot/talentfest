ALTER TABLE `employee_award_recipients`
  ADD COLUMN IF NOT EXISTS `award_category` TEXT NULL AFTER `designation`,
  ADD COLUMN IF NOT EXISTS `other_award_category` TEXT NULL AFTER `award_category`;

ALTER TABLE `employee_award_company_registrations`
  ADD COLUMN IF NOT EXISTS `owner_award_category` TEXT NULL AFTER `owner_designation`,
  ADD COLUMN IF NOT EXISTS `owner_other_award_category` TEXT NULL AFTER `owner_award_category`;
