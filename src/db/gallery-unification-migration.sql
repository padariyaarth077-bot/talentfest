-- MySQL 8+ / MariaDB gallery migration.
-- It creates database records for the 70 existing /public/gallery files only.
-- It neither copies nor deletes those files, and can be run more than once.

INSERT INTO `gallery_cities` (`id`, `name`, `slug`, `display_order`, `is_active`)
VALUES
  (UUID(), 'Vadodara', 'vadodara', 1, 1), (UUID(), 'Surat', 'surat', 2, 1),
  (UUID(), 'Rajkot', 'rajkot', 3, 1), (UUID(), 'Ahmedabad', 'ahmedabad', 4, 1),
  (UUID(), 'Somnath', 'somnath', 5, 1), (UUID(), 'Kutch', 'kutch', 6, 1),
  (UUID(), 'Bhavnagar', 'bhavnagar', 7, 1), (UUID(), 'Junagadh', 'junagadh', 8, 1)
ON DUPLICATE KEY UPDATE `name` = `name`;

INSERT INTO `gallery_media` (
  `id`, `city_id`, `title`, `media_type`, `category`, `storage_path`, `media_url`, `thumbnail_url`, `display_order`, `is_active`
)
SELECT UUID(), c.id, CONCAT(c.name, ' ', a.title), 'photo', a.category,
  CONCAT('legacy:/gallery/', c.slug, '/', c.slug, '-', a.file_key, '-01.webp'),
  CONCAT('/gallery/', c.slug, '/', c.slug, '-', a.file_key, '-01.webp'),
  CONCAT('/gallery/', c.slug, '/', c.slug, '-', a.file_key, '-01.webp'),
  a.source_order + IF(c.slug IN ('vadodara', 'surat'), 3, 0), 1
FROM `gallery_cities` c
CROSS JOIN (
  SELECT 'dance' AS file_key, 'dance' AS category, 'Dance Performance' AS title, 1 AS source_order
  UNION ALL SELECT 'singing', 'singing', 'Singing Spotlight', 2
  UNION ALL SELECT 'music', 'music', 'Instrumental Music', 3
  UNION ALL SELECT 'painting', 'painting', 'Painting and Arts', 4
  UNION ALL SELECT 'acting', 'acting', 'Acting and Theatre', 5
  UNION ALL SELECT 'writing', 'creative-writing', 'Creative Writing', 6
  UNION ALL SELECT 'photography', 'photography', 'Photography Moment', 7
  UNION ALL SELECT 'award', 'highlights', 'Awards and Highlights', 8
) a
WHERE c.slug IN ('vadodara', 'surat', 'rajkot', 'ahmedabad', 'somnath', 'kutch', 'bhavnagar', 'junagadh')
  AND NOT EXISTS (
    SELECT 1 FROM `gallery_media` gm
    WHERE gm.city_id = c.id
      AND gm.media_url = CONCAT('/gallery/', c.slug, '/', c.slug, '-', a.file_key, '-01.webp')
  );

INSERT INTO `gallery_media` (
  `id`, `city_id`, `title`, `media_type`, `category`, `storage_path`, `media_url`, `thumbnail_url`, `display_order`, `is_active`
)
SELECT UUID(), c.id, a.title, 'photo', 'highlights',
  CONCAT('legacy:/gallery/', a.slug, '/', a.filename),
  CONCAT('/gallery/', a.slug, '/', a.filename),
  CONCAT('/gallery/', a.slug, '/', a.filename), a.display_order, 1
FROM `gallery_cities` c
JOIN (
  SELECT 'vadodara' AS slug, 'vadodara-real-01.jpg' AS filename, 'Vadodara Guest Felicitation' AS title, 1 AS display_order
  UNION ALL SELECT 'vadodara', 'vadodara-real-02.jpg', 'Vadodara Award Welcome Moment', 2
  UNION ALL SELECT 'vadodara', 'vadodara-real-03.jpg', 'Vadodara Stage Performance', 3
  UNION ALL SELECT 'surat', 'surat-real-01.jpg', 'Surat Guest Felicitation', 1
  UNION ALL SELECT 'surat', 'surat-real-02.jpg', 'Surat Event Welcome Moment', 2
  UNION ALL SELECT 'surat', 'surat-real-03.jpg', 'Surat Ceremony Highlight', 3
) a ON a.slug = c.slug
WHERE NOT EXISTS (
  SELECT 1 FROM `gallery_media` gm
  WHERE gm.city_id = c.id
    AND gm.media_url = CONCAT('/gallery/', a.slug, '/', a.filename)
);
