-- MySQL Administrator dump 1.4
--
-- ------------------------------------------------------
-- Server version	8.0.45


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


--
-- Create schema basic_schema
--

--
-- Definition of table `bulk_action`
--

DROP TABLE IF EXISTS `bulk_action`;
CREATE TABLE  `bulk_action` (
  `BAC_ID` varchar(128) NOT NULL,
  `BAC_SESSION_INFO` varchar(2000) NOT NULL,
  `BAC_STATUS` int NOT NULL,
  `BAC_MODULE` varchar(200) NOT NULL,
  `BAC_METHOD` varchar(200) NOT NULL,
  `BAC_DATA` text NOT NULL,
  `BAC_INFO` text NOT NULL,
  `BAC_CREATED_ON` datetime NOT NULL,
  `BAC_COMPLETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`BAC_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `bulk_action`
--

/*!40000 ALTER TABLE `bulk_action` DISABLE KEYS */;
/*!40000 ALTER TABLE `bulk_action` ENABLE KEYS */;


--
-- Definition of table `cache_version`
--

DROP TABLE IF EXISTS `cache_version`;
CREATE TABLE `cache_version` (
  `CVR_TABLE` varchar(100) NOT NULL,
  `CVR_VERSION` int unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`CVR_TABLE`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `cache_version`
--

/*!40000 ALTER TABLE `cache_version` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_version` ENABLE KEYS */;


--
-- Definition of table `change_log`
--

DROP TABLE IF EXISTS `change_log`;
CREATE TABLE `change_log` (
  `CHL_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `CHL_TABLE` varchar(100) NOT NULL,
  `CHL_RECORD_ID` varchar(1000) NOT NULL,
  `CHL_OPERATION_TYPE` varchar(16) NOT NULL,
  `CHL_OLD_VALUES` json,
  `CHL_NEW_VALUES` json,
  `CHL_CREATED_ON` datetime NOT NULL,
  PRIMARY KEY (`CHL_ID`),
  KEY `IX_CHL_TABLE` (`CHL_TABLE`),
  KEY `XI_CHL_RECORD_ID` (`CHL_RECORD_ID`),
  KEY `IX_CHL_CREATED_ON` (`CHL_CREATED_ON`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `change_log`
--

/*!40000 ALTER TABLE `change_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `change_log` ENABLE KEYS */;


--
-- Definition of table `community`
--

DROP TABLE IF EXISTS `community`;
CREATE TABLE `community` (
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

--
-- Dumping data for table `community`
--

/*!40000 ALTER TABLE `community` DISABLE KEYS */;
/*!40000 ALTER TABLE `community` ENABLE KEYS */;


--
-- Definition of table `featured_officer`
--

DROP TABLE IF EXISTS `featured_officer`;
CREATE TABLE `featured_officer` (
  `FTO_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `FTO_COM_ID` bigint unsigned NOT NULL,
  `FTO_IMAGE` varchar(200) NOT NULL DEFAULT '',
  `FTO_DESCRIPTION` text NOT NULL,
  `FTO_CREATED_ON` datetime NOT NULL,
  `FTO_LAST_UPDATE` datetime DEFAULT NULL,
  `FTO_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`FTO_ID`),
  UNIQUE KEY `UQ_FTO_COM_ID` (`FTO_COM_ID`),
  CONSTRAINT `FK_FTO_COM_ID` FOREIGN KEY (`FTO_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `featured_officer`
--

/*!40000 ALTER TABLE `featured_officer` DISABLE KEYS */;
/*!40000 ALTER TABLE `featured_officer` ENABLE KEYS */;


--
-- Definition of table `data_item`
--

DROP TABLE IF EXISTS `data_item`;
CREATE TABLE `data_item` (
  `DIT_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `DIT_TABLE` varchar(100) NOT NULL,
  `DIT_KEY` varchar(100) NOT NULL,
  `DIT_NAME` varchar(200) NOT NULL,
  `DIT_EXTRA` text,
  `DIT_CREATED_ON` datetime NOT NULL,
  `DIT_LAST_UPDATE` datetime DEFAULT NULL,
  `DIT_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`DIT_ID`),
  UNIQUE KEY `UQ_DIT_TABLE_KEY` (`DIT_TABLE`, `DIT_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `data_item`
--

/*!40000 ALTER TABLE `data_item` DISABLE KEYS */;
-- Seed: service_type
INSERT IGNORE INTO `data_item` (DIT_TABLE, DIT_KEY, DIT_NAME, DIT_EXTRA, DIT_CREATED_ON) VALUES
('service_type', 'dumpsters_recovery',  'Dumpsters Recovery',   NULL, NOW()),
('service_type', 'welfare_check',       'Welfare Check',        NULL, NOW()),
('service_type', 'property_walk',       'Property Walk',        NULL, NOW()),
('service_type', 'package_recovery',    'Package Recovery',     NULL, NOW()),
('service_type', 'package_delivery',    'Package Delivery',     NULL, NOW());

-- Seed: task_type
INSERT IGNORE INTO `data_item` (DIT_TABLE, DIT_KEY, DIT_NAME, DIT_EXTRA, DIT_CREATED_ON) VALUES
('task_type', 'lights',             'Lights',               NULL, NOW()),
('task_type', 'sprinklers',         'Sprinklers',           NULL, NOW()),
('task_type', 'leaks',              'Leaks',                NULL, NOW()),
('task_type', 'damaged_property',   'Damaged Property',     NULL, NOW()),
('task_type', 'maintenance',        'Maintenance',          NULL, NOW()),
('task_type', 'inspection',         'Inspection Required',  NULL, NOW()),
('task_type', 'damaged_equipment',  'Damaged Equipment',    NULL, NOW()),
('task_type', 'operational_report', 'Operational Report',   NULL, NOW()),
('task_type', 'supply_request',     'Supply Request',       NULL, NOW());

-- Seed: asset_type
INSERT IGNORE INTO `data_item` (DIT_TABLE, DIT_KEY, DIT_NAME, DIT_EXTRA, DIT_CREATED_ON) VALUES
('asset_type', 'camera',            'Camera',               NULL, NOW()),
('asset_type', 'door',              'Door',                 NULL, NOW()),
('asset_type', 'gate',              'Gate',                 NULL, NOW()),
('asset_type', 'fence',             'Fence',                NULL, NOW()),
('asset_type', 'light',             'Light',                NULL, NOW()),
('asset_type', 'alarm',             'Alarm',                NULL, NOW()),
('asset_type', 'fire_extinguisher', 'Fire Extinguisher',    NULL, NOW()),
('asset_type', 'aed',               'AED',                  NULL, NOW()),
('asset_type', 'other',             'Other',                NULL, NOW());

-- Seed: po_section_type
INSERT IGNORE INTO `data_item` (DIT_TABLE, DIT_KEY, DIT_NAME, DIT_EXTRA, DIT_CREATED_ON) VALUES
('po_section_type', 'general_info',         'General Information',              '{"client_visible":true}',  NOW()),
('po_section_type', 'duties',               'Duties & Responsibilities',        '{"client_visible":true}',  NOW()),
('po_section_type', 'emergency',            'Emergency Procedures',             '{"client_visible":true}',  NOW()),
('po_section_type', 'access_control',       'Access Control Rules',             '{"client_visible":true}',  NOW()),
('po_section_type', 'patrol',               'Patrol Instructions',              '{"client_visible":false}', NOW()),
('po_section_type', 'use_of_force',         'Use of Force & Legal Guidance',    '{"client_visible":false}', NOW()),
('po_section_type', 'reporting',            'Reporting Requirements',           '{"client_visible":true}',  NOW()),
('po_section_type', 'equipment',            'Equipment & Uniform',              '{"client_visible":false}', NOW()),
('po_section_type', 'communication',        'Communication Protocols',          '{"client_visible":false}', NOW()),
('po_section_type', 'poi',                  'Persons of Interest',              '{"client_visible":false}', NOW()),
('po_section_type', 'client_instructions',  'Client-Specific Instructions',     '{"client_visible":true}',  NOW()),
('po_section_type', 'vendor',               'Vendor & Contractor Rules',        '{"client_visible":true}',  NOW());
/*!40000 ALTER TABLE `data_item` ENABLE KEYS */;


--
-- Definition of table `debug_log`
--

DROP TABLE IF EXISTS `debug_log`;
CREATE TABLE  `debug_log` (
  `DLG_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `DLG_CREATED_ON` datetime NOT NULL,
  `DLG_REQUEST_NAME` varchar(128) NOT NULL,
  `DLG_REQUEST_UID` varchar(128) NOT NULL,
  `DLG_STRING` longtext NOT NULL,
  `DLG_DB_TIME` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`DLG_ID`),
  KEY `IX_DLG_REQUEST_NAME` (`DLG_REQUEST_NAME`),
  KEY `IX_DLG_CREATED_ON` (`DLG_CREATED_ON`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `debug_log`
--

/*!40000 ALTER TABLE `debug_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `debug_log` ENABLE KEYS */;


--
-- Definition of table `entity_lock`
--

DROP TABLE IF EXISTS `entity_lock`;
CREATE TABLE `entity_lock` (
  `ENL_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ENL_TABLE` varchar(100) NOT NULL,
  `ENL_RECORD_ID` varchar(255) NOT NULL,
  `ENL_USR_ID` varchar(128) NOT NULL,
  `ENL_LOCKED_ON` datetime NOT NULL,
  `ENL_EXPIRES_ON` datetime NOT NULL,
  PRIMARY KEY (`ENL_ID`),
  UNIQUE KEY `UQ_ENL_TABLE_RECORD` (`ENL_TABLE`, `ENL_RECORD_ID`),
  KEY `IX_ENL_EXPIRES_ON` (`ENL_EXPIRES_ON`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `entity_lock`
--

/*!40000 ALTER TABLE `entity_lock` DISABLE KEYS */;
/*!40000 ALTER TABLE `entity_lock` ENABLE KEYS */;


--
-- Definition of table `officer`
--

DROP TABLE IF EXISTS `officer`;
CREATE TABLE `officer` (
  `OFC_USR_ID` varchar(128) NOT NULL,
  `OFC_TITLE` varchar(200) NOT NULL DEFAULT '',
  `OFC_DESCRIPTION` text,
  `OFC_ADDRESS` varchar(500) NOT NULL DEFAULT '',
  `OFC_ROLES` json DEFAULT NULL,
  `OFC_CERTIFICATION_BADGES` json DEFAULT NULL,
  `OFC_CREATED_ON` datetime NOT NULL,
  `OFC_LAST_UPDATE` datetime DEFAULT NULL,
  `OFC_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`OFC_USR_ID`),
  CONSTRAINT `FK_OFC_USR_ID` FOREIGN KEY (`OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `officer`
--

/*!40000 ALTER TABLE `officer` DISABLE KEYS */;
/*!40000 ALTER TABLE `officer` ENABLE KEYS */;


--
-- Definition of table `officer_evaluation`
--

DROP TABLE IF EXISTS `officer_evaluation`;
CREATE TABLE `officer_evaluation` (
  `OFE_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `OFE_OFC_USR_ID` varchar(128) NOT NULL,
  `OFE_TEXT` text NOT NULL,
  `OFE_DATE` date NOT NULL,
  `OFE_EVALUATOR_NAME` varchar(200) NOT NULL,
  `OFE_CREATED_ON` datetime NOT NULL,
  `OFE_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`OFE_ID`),
  KEY `IX_OFE_OFC_USR_ID` (`OFE_OFC_USR_ID`),
  CONSTRAINT `FK_OFE_OFC_USR_ID` FOREIGN KEY (`OFE_OFC_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `officer_evaluation`
--

/*!40000 ALTER TABLE `officer_evaluation` DISABLE KEYS */;
/*!40000 ALTER TABLE `officer_evaluation` ENABLE KEYS */;


--
-- Definition of table `resident`
--

DROP TABLE IF EXISTS `resident`;
CREATE TABLE `resident` (
  `RES_USR_ID` varchar(128) NOT NULL,
  `RES_ADDRESS` varchar(500) NOT NULL DEFAULT '',
  `RES_VEHICLES` json DEFAULT NULL,
  `RES_INSTRUCTIONS` text,
  `RES_IMAGES` json DEFAULT NULL,
  `RES_COMMUNICATION_TEST` tinyint unsigned NOT NULL DEFAULT '0',
  `RES_CREATED_ON` datetime NOT NULL,
  `RES_LAST_UPDATE` datetime DEFAULT NULL,
  `RES_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`RES_USR_ID`),
  CONSTRAINT `FK_RES_USR_ID` FOREIGN KEY (`RES_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `resident`
--

/*!40000 ALTER TABLE `resident` DISABLE KEYS */;
/*!40000 ALTER TABLE `resident` ENABLE KEYS */;


--
-- Definition of table `file`
--

DROP TABLE IF EXISTS `file`;
CREATE TABLE `file` (
  `FIL_ID` varchar(128) NOT NULL,
  `FIL_USR_ID` varchar(128) DEFAULT NULL,
  `FIL_CREATED_ON` datetime NOT NULL,
  `FIL_FILE_NAME` varchar(1000) DEFAULT NULL,
  `FIL_ORIG_FILE_NAME` varchar(250) DEFAULT NULL,
  `FIL_FILE_SIZE` int unsigned NOT NULL DEFAULT '0',
  `FIL_MIME_TYPE` varchar(200) NOT NULL DEFAULT '',
  `FIL_ACCESS_LEVEL` varchar(32) NOT NULL,
  PRIMARY KEY (`FIL_ID`),
  KEY `FK_FIL_USR_ID` (`FIL_USR_ID`),
  KEY `IX_FIL_FILE_NAME` (`FIL_FILE_NAME`),
  CONSTRAINT `FK_FIL_USR_ID` FOREIGN KEY (`FIL_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `file`
--

/*!40000 ALTER TABLE `file` DISABLE KEYS */;
/*!40000 ALTER TABLE `file` ENABLE KEYS */;


--
-- Definition of table `file_multipart`
--

DROP TABLE IF EXISTS `file_multipart`;
CREATE TABLE `file_multipart` (
  `FMP_ID` varchar(128) NOT NULL,
  `FMP_USR_ID` varchar(128) DEFAULT NULL,
  `FMP_PARTS` text NOT NULL,
  `FMP_METADATA` text NOT NULL,
  `FMP_FILE_NAME` varchar(1000) NOT NULL,
  `FMP_ORIG_FILE_NAME` varchar(200) NOT NULL,
  `FMP_CREATED_ON` datetime NOT NULL,
  PRIMARY KEY (`FMP_ID`),
  KEY `FK_FMP_USR_ID` (`FMP_USR_ID`),
  CONSTRAINT `FK_FMP_USR_ID` FOREIGN KEY (`FMP_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `file_multipart`
--

/*!40000 ALTER TABLE `file_multipart` DISABLE KEYS */;
/*!40000 ALTER TABLE `file_multipart` ENABLE KEYS */;


--
-- Definition of table `key_value`
--

DROP TABLE IF EXISTS `key_value`;
CREATE TABLE `key_value` (
  `KVL_KEY` varchar(200) NOT NULL,
  `KVL_VALUE` text NOT NULL,
  PRIMARY KEY (`KVL_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `key_value`
--

/*!40000 ALTER TABLE `key_value` DISABLE KEYS */;
/*!40000 ALTER TABLE `key_value` ENABLE KEYS */;


--
-- Definition of table `log`
--

DROP TABLE IF EXISTS `log`;
CREATE TABLE `log` (
  `LOG_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `LOG_CREATED_ON` datetime NOT NULL,
  `LOG_IP_ADDRESS` varchar(64) NOT NULL,
  `LOG_TYPE` varchar(32) NOT NULL,
  `LOG_REQUEST_NAME` varchar(128) NOT NULL,
  `LOG_REQUEST_UID` varchar(128) NOT NULL,
  `LOG_STRING` longtext NOT NULL,
  `LOG_INTERNAL_STATUS` smallint unsigned NOT NULL DEFAULT '1',
  `LOG_DB_TIME` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LOG_ID`),
  KEY `IX_LOG_REQUEST_UID` (`LOG_REQUEST_UID`),
  KEY `IX_LOG_REQUEST_NAME` (`LOG_REQUEST_NAME`),
  KEY `IX_LOG_INTERNAL_STATUS` (`LOG_INTERNAL_STATUS`),
  KEY `IX_LOG_CREATED_ON` (`LOG_CREATED_ON`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `log`
--

/*!40000 ALTER TABLE `log` DISABLE KEYS */;
/*!40000 ALTER TABLE `log` ENABLE KEYS */;


--
-- Definition of table `login_log`
--

DROP TABLE IF EXISTS `login_log`;
CREATE TABLE `login_log` (
  `LOL_ID` int unsigned NOT NULL AUTO_INCREMENT,
  `LOL_USR_ID` varchar(128) NOT NULL,
  `LOL_USR_TOKEN` varchar(512) NOT NULL,
  `LOL_CREATED_ON` datetime NOT NULL,
  PRIMARY KEY (`LOL_ID`),
  KEY `IX_LOL_USR_ID` (`LOL_USR_ID`),
  KEY `IX_LOL_USR_TOKEN` (`LOL_USR_TOKEN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `login_log`
--

/*!40000 ALTER TABLE `login_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `login_log` ENABLE KEYS */;


--
-- Definition of table `mailer_queue`
--

DROP TABLE IF EXISTS `mailer_queue`;
CREATE TABLE `mailer_queue` (
  `MQU_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `MQU_EMAIL_TYPE` varchar(100) NOT NULL,
  `MQU_DATA` text NOT NULL,
  `MQU_TRIAL` smallint unsigned NOT NULL DEFAULT '0',
  `MQU_IS_FAILED` tinyint unsigned NOT NULL DEFAULT '0',
  `MQU_CREATED_ON` datetime NOT NULL,
  PRIMARY KEY (`MQU_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `mailer_queue`
--

/*!40000 ALTER TABLE `mailer_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `mailer_queue` ENABLE KEYS */;


--
-- Definition of table `notification`
--

DROP TABLE IF EXISTS `notification`;
CREATE TABLE `notification` (
  `NTF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `NTF_USR_ID` varchar(128) NOT NULL COMMENT 'Recipient user ID',
  `NTF_TYPE` varchar(50) NOT NULL COMMENT 'Notification type key (e.g. call_accepted, new_emergency)',
  `NTF_TITLE` varchar(200) NOT NULL,
  `NTF_MESSAGE` varchar(1000) NOT NULL,
  `NTF_PAYLOAD` json DEFAULT NULL COMMENT 'Additional data for deep linking (entity_type, entity_id, etc.)',
  `NTF_IS_READ` tinyint NOT NULL DEFAULT 0,
  `NTF_READ_ON` datetime DEFAULT NULL,
  `NTF_SENDER_ID` varchar(128) DEFAULT NULL COMMENT 'User who triggered the notification',
  `NTF_COMMUNITY_ID` bigint unsigned DEFAULT NULL,
  `NTF_CREATED_ON` datetime NOT NULL,
  `NTF_DELETED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`NTF_ID`),
  KEY `IX_NTF_USR_ID` (`NTF_USR_ID`),
  KEY `IX_NTF_USR_READ` (`NTF_USR_ID`, `NTF_IS_READ`, `NTF_DELETED_ON`),
  KEY `IX_NTF_CREATED_ON` (`NTF_CREATED_ON`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `notification`
--

/*!40000 ALTER TABLE `notification` DISABLE KEYS */;
/*!40000 ALTER TABLE `notification` ENABLE KEYS */;


--
-- Definition of table `otp_auth`
--

DROP TABLE IF EXISTS `otp_auth`;
CREATE TABLE `otp_auth` (
  `OTP_FIELD` varchar(200) NOT NULL,
  `OTP_VERIFICATION` varchar(45) NOT NULL,
  `OTP_VALID_THRU` datetime NOT NULL,
  `OTP_AUTH_KEY` varchar(128) NOT NULL,
  `OTP_TRY_NUM` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`OTP_FIELD`) USING BTREE,
  KEY `IX_OTP_AUTH_KEY` (`OTP_AUTH_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `otp_auth`
--

/*!40000 ALTER TABLE `otp_auth` DISABLE KEYS */;
/*!40000 ALTER TABLE `otp_auth` ENABLE KEYS */;


--
-- Definition of table `queue`
--

DROP TABLE IF EXISTS `queue`;
CREATE TABLE `queue` (
  `QUE_MSG_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `QUE_ID` int unsigned NOT NULL,
  `QUE_CREATED_ON` datetime NOT NULL,
  `QUE_TEXT` varchar(4096) NOT NULL,
  `QUE_LOCK_ID` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`QUE_MSG_ID`),
  KEY `IX_QUE_ID` (`QUE_ID`),
  KEY `IX_QUE_LOCK_ID` (`QUE_LOCK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `queue`
--

/*!40000 ALTER TABLE `queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `queue` ENABLE KEYS */;


--
-- Definition of table `service`
--

DROP TABLE IF EXISTS `service`;
CREATE TABLE `service` (
  `SRV_ID` int unsigned NOT NULL,
  `SRV_ACTIVE` tinyint unsigned NOT NULL,
  `SRV_HEARTBEAT` bigint unsigned NOT NULL,
  `SRV_METADATA` text NOT NULL,
  PRIMARY KEY (`SRV_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `service`
--

/*!40000 ALTER TABLE `service` DISABLE KEYS */;
/*!40000 ALTER TABLE `service` ENABLE KEYS */;


--
-- Definition of table `social_auth`
--

DROP TABLE IF EXISTS `social_auth`;
CREATE TABLE  `social_auth` (
  `SCA_USER_ID_HASH` varchar(128) NOT NULL,
  `SCA_LOGIN_AUTHORITY` smallint unsigned NOT NULL,
  `SCA_VALID_THRU` datetime NOT NULL,
  `SCA_AUTH_KEY` varchar(128) NOT NULL,
  PRIMARY KEY (`SCA_USER_ID_HASH`,`SCA_LOGIN_AUTHORITY`) USING BTREE,
  KEY `IX_SCA_AUTH_KEY` (`SCA_AUTH_KEY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `social_auth`
--

/*!40000 ALTER TABLE `social_auth` DISABLE KEYS */;
/*!40000 ALTER TABLE `social_auth` ENABLE KEYS */;


--
-- Definition of table `system_user`
--

DROP TABLE IF EXISTS `system_user`;
CREATE TABLE  `system_user` (
  `STU_USER_NAME` varchar(128) NOT NULL,
  `STU_PASSWORD` varchar(128) NOT NULL,
  `STU_CREATED_ON` datetime NOT NULL,
  `STU_TOKEN` varchar(512) NOT NULL DEFAULT '',
  `STU_LAST_FAILED_LOGIN` datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
  `STU_FAILED_LOGIN_COUNT` smallint unsigned NOT NULL DEFAULT '0',
  `STU_STATUS` tinyint unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`STU_USER_NAME`),
  KEY `IX_STU_TOKEN` (`STU_TOKEN`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `system_user`
--

/*!40000 ALTER TABLE `system_user` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_user` ENABLE KEYS */;


--
-- Definition of table `timed_message`
--

DROP TABLE IF EXISTS `timed_message`;
CREATE TABLE  `timed_message` (
  `TIM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `TIM_TYPE` int unsigned NOT NULL,
  `TIM_CREATED_ON` datetime NOT NULL,
  `TIM_DUE` datetime DEFAULT NULL,
  `TIM_TEXT` varchar(4096) NOT NULL,
  `TIM_LOCK_ID` varchar(128) DEFAULT NULL,
  `TIM_EXTRA_INDEX_INT` bigint unsigned DEFAULT NULL,
  `TIM_EXTRA_INDEX_STR` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`TIM_ID`),
  KEY `IX_TIM_TYPE` (`TIM_TYPE`),
  KEY `IX_TIM_DUE` (`TIM_DUE`),
  KEY `IX_TIM_EXTRA_INDEX_INT` (`TIM_EXTRA_INDEX_INT`),
  KEY `IX_TIM_EXTRA_INDEX_STR` (`TIM_EXTRA_INDEX_STR`),
  KEY `IX_TIM_LOCK_ID` (`TIM_LOCK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `timed_message`
--

/*!40000 ALTER TABLE `timed_message` DISABLE KEYS */;
/*!40000 ALTER TABLE `timed_message` ENABLE KEYS */;


--
-- Definition of table `user`
--

DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `USR_ID` varchar(128) NOT NULL,
  `USR_EMAIL` varchar(250) NOT NULL,
  `USR_PASSWORD` varchar(128) NOT NULL,
  `USR_CREATED_ON` datetime NOT NULL,
  `USR_LAST_LOGIN` datetime DEFAULT NULL,
  `USR_LAST_ACCESS` datetime DEFAULT NULL,
  `USR_TYPE` smallint unsigned NOT NULL,
  `USR_TOKEN` varchar(512) NOT NULL DEFAULT '',
  `USR_RESET_CODE` varchar(128) DEFAULT NULL,
  `USR_DELETED_ON` datetime DEFAULT NULL,
  `USR_STATUS` tinyint unsigned NOT NULL DEFAULT '1',
  `USR_LOGIN_AUTHORITY` smallint unsigned NOT NULL DEFAULT '1',
  `USR_LAST_FAILED_LOGIN` datetime NOT NULL DEFAULT '2000-01-01 00:00:00',
  `USR_FAILED_LOGIN_COUNT` smallint unsigned NOT NULL DEFAULT '0',
  `USR_DEVICE_ID` varchar(250) DEFAULT NULL,
  `USR_OS_TYPE` smallint unsigned NOT NULL DEFAULT '0',
  `USR_OS_VERSION` varchar(45) DEFAULT NULL,
  `USR_DEVICE_MODEL` varchar(45) DEFAULT NULL,
  `USR_APP_VERSION` varchar(45) DEFAULT NULL,
  `USR_PHONE_NUM` varchar(45) NOT NULL DEFAULT '',
  `USR_LANG` varchar(16) NOT NULL DEFAULT 'en',
  `USR_ROLE_ALLOW` int unsigned NOT NULL DEFAULT '0',
  `USR_ROLE_DENY` int unsigned NOT NULL DEFAULT '0',
  `USR_2ND_FACTOR_KEY` varchar(128) DEFAULT NULL,
  `USR_2ND_FACTOR_KEY_VALID_THRU` datetime DEFAULT NULL,
  `USR_2ND_FACTOR_VERIFICATION` varchar(250) DEFAULT NULL,
  `USR_PENDING_FACTOR` varchar(250) DEFAULT NULL,
  `USR_PASSWORD_CREATED_ON` datetime DEFAULT NULL,
  PRIMARY KEY (`USR_ID`),
  KEY `IX_USR_EMAIL` (`USR_EMAIL`),
  KEY `IX_USR_TOKEN` (`USR_TOKEN`),
  KEY `IX_USR_PHONE` (`USR_PHONE_NUM`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `user`
--

/*!40000 ALTER TABLE `user` DISABLE KEYS */;
/*!40000 ALTER TABLE `user` ENABLE KEYS */;


--
-- Definition of trigger `deny_update_user_details_from_user`
--

DROP TRIGGER /*!50030 IF EXISTS */ `deny_update_user_details_from_user`;

DELIMITER $$

CREATE TRIGGER `deny_update_user_details_from_user` BEFORE UPDATE ON `user` FOR EACH ROW BEGIN

    IF @skip_user_update IS NULL THEN
        IF NEW.USR_TYPE               <> OLD.USR_TYPE               THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_TYPE. Must update from user_details'; END IF;
        IF NEW.USR_EMAIL              <> OLD.USR_EMAIL              THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_EMAIL. Must update from user_details'; END IF;
        IF NEW.USR_PHONE_NUM          <> OLD.USR_PHONE_NUM          THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_PHONE_NUM. Must update from user_details'; END IF;
        IF NEW.USR_STATUS             <> OLD.USR_STATUS             THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_STATUS. Must update from user_details'; END IF;
        IF NEW.USR_ROLE_ALLOW         <> OLD.USR_ROLE_ALLOW         THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_ROLE_ALLOW. Must update from user_details'; END IF;
        IF NEW.USR_ROLE_DENY          <> OLD.USR_ROLE_DENY          THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_ROLE_DENY. Must update from user_details'; END IF;

        IF (NEW.USR_DELETED_ON <> OLD.USR_DELETED_ON OR (NEW.USR_DELETED_ON is null AND OLD.USR_DELETED_ON is not null) OR (NEW.USR_DELETED_ON is not null AND  OLD.USR_DELETED_ON is null)) THEN
          SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot update USR_DELETED_ON. Must update from user_details';
        END IF;
    END IF;

END $$

DELIMITER ;

--
-- Definition of table `user_details`
--

DROP TABLE IF EXISTS `user_details`;
CREATE TABLE `user_details` (
  `USD_USR_ID` varchar(128) NOT NULL,
  `USD_TYPE` smallint unsigned NOT NULL,
  `USD_EMAIL` varchar(250) NOT NULL,
  `USD_PHONE_NUM` varchar(45) NOT NULL DEFAULT '',
  `USD_DELETED_ON` datetime DEFAULT NULL,
  `USD_STATUS` tinyint unsigned NOT NULL DEFAULT '1',
  `USD_ROLE_ALLOW` int unsigned NOT NULL DEFAULT '0',
  `USD_ROLE_DENY` int unsigned NOT NULL DEFAULT '0',
  `USD_FIRST_NAME` varchar(100) NOT NULL,
  `USD_LAST_NAME` varchar(100) NOT NULL,
  `USD_IMAGE` varchar(200) NOT NULL DEFAULT '',
  `USD_COM_ID` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`USD_USR_ID`),
  KEY `IX_USD_EMAIL` (`USD_EMAIL`),
  KEY `IX_USD_PHONE_NUM` (`USD_PHONE_NUM`),
  KEY `IX_USD_COM_ID` (`USD_COM_ID`),
  CONSTRAINT `FK_USD_USR_ID` FOREIGN KEY (`USD_USR_ID`) REFERENCES `user` (`USR_ID`),
  CONSTRAINT `FK_USD_COM_ID` FOREIGN KEY (`USD_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `user_details`
--

/*!40000 ALTER TABLE `user_details` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_details` ENABLE KEYS */;


--
-- Definition of trigger `update_user_from_details`
--

DROP TRIGGER /*!50030 IF EXISTS */ `update_user_from_details`;

DELIMITER $$

CREATE TRIGGER `update_user_from_details` BEFORE UPDATE ON `user_details` FOR EACH ROW BEGIN

    SET @skip_user_update = 1;

    IF NEW.USD_TYPE               <> OLD.USD_TYPE               THEN UPDATE `user` SET USR_TYPE               = NEW.USD_TYPE               WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_EMAIL              <> OLD.USD_EMAIL              THEN UPDATE `user` SET USR_EMAIL              = NEW.USD_EMAIL              WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_PHONE_NUM          <> OLD.USD_PHONE_NUM          THEN UPDATE `user` SET USR_PHONE_NUM          = NEW.USD_PHONE_NUM          WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_STATUS             <> OLD.USD_STATUS             THEN UPDATE `user` SET USR_STATUS             = NEW.USD_STATUS             WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_ROLE_ALLOW         <> OLD.USD_ROLE_ALLOW         THEN UPDATE `user` SET USR_ROLE_ALLOW         = NEW.USD_ROLE_ALLOW         WHERE USR_ID = NEW.USD_USR_ID; END IF;
    IF NEW.USD_ROLE_DENY          <> OLD.USD_ROLE_DENY          THEN UPDATE `user` SET USR_ROLE_DENY          = NEW.USD_ROLE_DENY          WHERE USR_ID = NEW.USD_USR_ID; END IF;

    IF (NEW.USD_DELETED_ON <> OLD.USD_DELETED_ON OR (NEW.USD_DELETED_ON is null AND OLD.USD_DELETED_ON is not null) OR (NEW.USD_DELETED_ON is not null AND  OLD.USD_DELETED_ON is null)) THEN
      UPDATE `user` SET USR_DELETED_ON = NEW.USD_DELETED_ON WHERE USR_ID = NEW.USD_USR_ID;
    END IF;

    SET @skip_user_update = NULL;

END $$

DELIMITER ;

--
-- Definition of table `user_mem`
--

DROP TABLE IF EXISTS `user_mem`;
CREATE TABLE `user_mem` (
  `USR_ID` varchar(128) NOT NULL,
  `USR_TYPE` smallint unsigned NOT NULL,
  `USR_TOKEN` varchar(512) NOT NULL,
  `USR_LAST_LOGIN` datetime DEFAULT NULL,
  `USR_LAST_ACCESS` datetime DEFAULT NULL,
  `USR_LANG` varchar(16) NOT NULL DEFAULT 'en',
  `USR_ROLE_ALLOW` int unsigned NOT NULL DEFAULT '0',
  `USR_ROLE_DENY` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`USR_ID`) USING HASH,
  KEY `IX_MUSR_TOKEN` (`USR_TOKEN`) USING HASH
) ENGINE=MEMORY DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `user_mem`
--

/*!40000 ALTER TABLE `user_mem` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_mem` ENABLE KEYS */;


--
-- Definition of table `user_online_log`
--

DROP TABLE IF EXISTS `user_online_log`;
CREATE TABLE `user_online_log` (
  `UOL_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `UOL_USR_ID` varchar(128) NOT NULL,
  `UOL_SERVICE_ID` int unsigned NOT NULL,
  `UOL_DATETINE` datetime NOT NULL,
  `UOL_ACTION` varchar(64) NOT NULL,
  PRIMARY KEY (`UOL_ID`),
  KEY `FK_UOL_USR_ID` (`UOL_USR_ID`),
  CONSTRAINT `FK_UOL_USR_ID` FOREIGN KEY (`UOL_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `user_online_log`
--

/*!40000 ALTER TABLE `user_online_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_online_log` ENABLE KEYS */;


--
-- Definition of table `user_online_status`
--

DROP TABLE IF EXISTS `user_online_status`;
CREATE TABLE `user_online_status` (
  `UOS_USR_ID` varchar(128) NOT NULL,
  `UOS_SERVICE_ID` int unsigned NOT NULL,
  `UOS_CONNECTED_ON` datetime NOT NULL,
  PRIMARY KEY (`UOS_USR_ID`,`UOS_SERVICE_ID`),
  KEY `FK_UOS_USR_ID` (`UOS_USR_ID`),
  CONSTRAINT `FK_UOS_USR_ID` FOREIGN KEY (`UOS_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

--
-- Dumping data for table `user_online_status`
--

/*!40000 ALTER TABLE `user_online_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_online_status` ENABLE KEYS */;


--
-- Definition of procedure `prc_entity_lock_acquire`
--

DROP PROCEDURE IF EXISTS `prc_entity_lock_acquire`;

DELIMITER $$

/*!50003 SET @TEMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ $$
CREATE PROCEDURE `prc_entity_lock_acquire`(p_table VARCHAR(100), p_record_id VARCHAR(255), p_usr_id VARCHAR(128), p_ttl_seconds INT)
BEGIN

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
          ROLLBACK;
    END;

    START TRANSACTION;

      -- Remove expired lock for this specific record (if any)
      DELETE FROM `entity_lock`
      WHERE ENL_TABLE = p_table AND ENL_RECORD_ID = p_record_id AND ENL_EXPIRES_ON < NOW();

      -- Acquire or refresh lock (ON DUPLICATE KEY UPDATE only fires if same user owns the lock)
      INSERT INTO `entity_lock` (ENL_TABLE, ENL_RECORD_ID, ENL_USR_ID, ENL_LOCKED_ON, ENL_EXPIRES_ON)
      VALUES (p_table, p_record_id, p_usr_id, NOW(), DATE_ADD(NOW(), INTERVAL p_ttl_seconds SECOND))
      ON DUPLICATE KEY UPDATE
        ENL_LOCKED_ON = IF(ENL_USR_ID = p_usr_id, NOW(), ENL_LOCKED_ON),
        ENL_EXPIRES_ON = IF(ENL_USR_ID = p_usr_id, DATE_ADD(NOW(), INTERVAL p_ttl_seconds SECOND), ENL_EXPIRES_ON);

    COMMIT;

END $$
/*!50003 SET SESSION SQL_MODE=@TEMP_SQL_MODE */  $$

DELIMITER ;

--
-- Definition of procedure `prc_entity_lock_release`
--

DROP PROCEDURE IF EXISTS `prc_entity_lock_release`;

DELIMITER $$

/*!50003 SET @TEMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ $$
CREATE PROCEDURE `prc_entity_lock_release`(p_table VARCHAR(100), p_record_id VARCHAR(255), p_usr_id VARCHAR(128))
BEGIN

    DELETE FROM `entity_lock`
    WHERE ENL_TABLE = p_table AND ENL_RECORD_ID = p_record_id AND ENL_USR_ID = p_usr_id;

END $$
/*!50003 SET SESSION SQL_MODE=@TEMP_SQL_MODE */  $$

DELIMITER ;


--
-- Definition of procedure `prc_queue_set_lock`
--

DROP PROCEDURE IF EXISTS `prc_queue_set_lock`;

DELIMITER $$

/*!50003 SET @TEMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ $$
CREATE PROCEDURE `prc_queue_set_lock`(queueId INTEGER, lockId VARCHAR(128))
BEGIN

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
          ROLLBACK;
    END;

    START TRANSACTION;

      UPDATE `queue` q1
        JOIN (SELECT QUE_MSG_ID FROM `queue` WHERE QUE_ID=queueId AND QUE_LOCK_ID is null ORDER BY QUE_MSG_ID ASC LIMIT 1) q2 ON q1.QUE_MSG_ID=q2.QUE_MSG_ID
      SET QUE_LOCK_ID=lockId;

  COMMIT;

END $$
/*!50003 SET SESSION SQL_MODE=@TEMP_SQL_MODE */  $$

DELIMITER ;

--
-- Definition of procedure `prc_queue_set_lock_all`
--

DROP PROCEDURE IF EXISTS `prc_queue_set_lock_all`;

DELIMITER $$

/*!50003 SET @TEMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ $$
CREATE PROCEDURE `prc_queue_set_lock_all`(queueId INTEGER, lockId VARCHAR(128))
BEGIN
   DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
          ROLLBACK;
    END;

    START TRANSACTION;

      UPDATE `queue` q1
        JOIN (SELECT QUE_MSG_ID FROM `queue` WHERE QUE_ID=queueId AND QUE_LOCK_ID is null ORDER BY QUE_MSG_ID ASC) q2 ON q1.QUE_MSG_ID=q2.QUE_MSG_ID
      SET QUE_LOCK_ID=lockId;

  COMMIT;

END $$
/*!50003 SET SESSION SQL_MODE=@TEMP_SQL_MODE */  $$

DELIMITER ;

--
-- Definition of procedure `prc_timed_message_set_lock`
--

DROP PROCEDURE IF EXISTS `prc_timed_message_set_lock`;

DELIMITER $$

/*!50003 SET @TEMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ $$
CREATE PROCEDURE `prc_timed_message_set_lock`(msgType INTEGER, lockId VARCHAR(128), nowTime DATETIME)
BEGIN

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
          ROLLBACK;
    END;

    START TRANSACTION;

      UPDATE `timed_message` q1
        JOIN (SELECT TIM_ID FROM `timed_message` WHERE TIM_TYPE=msgType AND TIM_DUE<=nowTime AND TIM_LOCK_ID is null ORDER BY TIM_DUE ASC LIMIT 1) q2 ON q1.TIM_ID=q2.TIM_ID
      SET TIM_LOCK_ID=lockId;

  COMMIT;

END $$
/*!50003 SET SESSION SQL_MODE=@TEMP_SQL_MODE */  $$

DELIMITER ;

--
-- Definition of procedure `prc_timed_message_set_lock_all`
--

DROP PROCEDURE IF EXISTS `prc_timed_message_set_lock_all`;

DELIMITER $$

/*!50003 SET @TEMP_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ $$
CREATE PROCEDURE `prc_timed_message_set_lock_all`(msgType INTEGER, lockId VARCHAR(128), nowTime DATETIME)
BEGIN
   DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
          ROLLBACK;
    END;

    START TRANSACTION;

      UPDATE `timed_message` q1
        JOIN (SELECT TIM_ID FROM `timed_message` WHERE TIM_TYPE=msgType AND TIM_DUE<=nowTime AND TIM_LOCK_ID is null ORDER BY TIM_DUE ASC) q2 ON q1.TIM_ID=q2.TIM_ID
      SET TIM_LOCK_ID=lockId;

  COMMIT;

END $$
/*!50003 SET SESSION SQL_MODE=@TEMP_SQL_MODE */  $$

DELIMITER ;


/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
