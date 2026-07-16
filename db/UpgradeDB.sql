

-- V "3.12.7

-- Cache version tracking for cross-instance cache invalidation

CREATE TABLE IF NOT EXISTS `cache_version` (
  `CVR_TABLE` varchar(100) NOT NULL,
  `CVR_VERSION` int unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`CVR_TABLE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
