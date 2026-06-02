-- --------------------------------------------------
-- V 4.0.0 — Code4 Phase 0 Foundation
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS `community` (
  `COM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `COM_NAME` varchar(200) NOT NULL,
  `COM_AREA` varchar(500) NOT NULL DEFAULT '',
  `COM_LATITUDE` decimal(10,7) DEFAULT NULL,
  `COM_LONGITUDE` decimal(10,7) DEFAULT NULL,
  `COM_LOCATION_NAME` varchar(500) DEFAULT NULL,
  `COM_TIMEZONE` varchar(100) DEFAULT NULL,
  `COM_MAP_IMAGE` varchar(200) NOT NULL DEFAULT '',
  `COM_MAP_BOUNDARIES` text,
  `COM_IS_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
  `COM_CREATED_ON` datetime NOT NULL,
  `COM_LAST_UPDATE` datetime DEFAULT NULL,
  `COM_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`COM_ID`),
  KEY `IX_COM_NAME` (`COM_NAME`),
  KEY `IX_COM_IS_ACTIVE` (`COM_IS_ACTIVE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `featured_officer` (
  `FTO_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `FTO_COM_ID` bigint unsigned NOT NULL,
  `FTO_IMAGE` varchar(200) NOT NULL DEFAULT '',
  `FTO_DESCRIPTION` text NOT NULL,
  `FTO_CREATED_ON` datetime NOT NULL,
  `FTO_LAST_UPDATE` datetime DEFAULT NULL,
  PRIMARY KEY (`FTO_ID`),
  UNIQUE KEY `UQ_FTO_COM_ID` (`FTO_COM_ID`),
  CONSTRAINT `FK_FTO_COM_ID` FOREIGN KEY (`FTO_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
