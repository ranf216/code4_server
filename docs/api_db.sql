-- ============================================================
-- Code4 Security Operations Platform - Proposed DB Structure
-- ============================================================
-- This file contains the proposed database tables for the
-- Code4 project. It extends the base schema in db/db.sql.
-- ============================================================

-- ============================================================
-- COMMUNITY
-- ============================================================

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

-- ============================================================
-- FEATURED OFFICER (banner per community)
-- ============================================================

DROP TABLE IF EXISTS `featured_officer`;
CREATE TABLE `featured_officer` (
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

-- ============================================================
-- RESIDENT (extends user_details)
-- ============================================================

DROP TABLE IF EXISTS `resident`;
CREATE TABLE `resident` (
    `RES_USR_ID` varchar(128) NOT NULL,
    `RES_COM_ID` bigint unsigned NOT NULL,
    `RES_ADDRESS` varchar(500) NOT NULL DEFAULT '',
    `RES_VEHICLE_NUMBERS` varchar(500) NOT NULL DEFAULT '',
    `RES_COMMUNICATION_TEST` tinyint unsigned NOT NULL DEFAULT '0',
    `RES_LATITUDE` decimal(10,7) DEFAULT NULL,
    `RES_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `RES_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `RES_CREATED_ON` datetime NOT NULL,
    `RES_LAST_UPDATE` datetime DEFAULT NULL,
    PRIMARY KEY (`RES_USR_ID`),
    KEY `IX_RES_COM_ID` (`RES_COM_ID`),
    CONSTRAINT `FK_RES_USR_ID` FOREIGN KEY (`RES_USR_ID`) REFERENCES `user` (`USR_ID`),
    CONSTRAINT `FK_RES_COM_ID` FOREIGN KEY (`RES_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- OFFICER (extends user_details)
-- ============================================================

DROP TABLE IF EXISTS `officer`;
CREATE TABLE `officer` (
    `OFC_USR_ID` varchar(128) NOT NULL,
    `OFC_COM_ID` bigint unsigned NOT NULL,
    `OFC_TITLE` varchar(100) NOT NULL DEFAULT '',
    `OFC_ADDRESS` varchar(500) NOT NULL DEFAULT '',
    `OFC_DESCRIPTION` text,
    `OFC_ROLES` varchar(500) NOT NULL DEFAULT '',
    `OFC_CERTIFICATIONS` varchar(500) NOT NULL DEFAULT '',
    `OFC_IS_ON_DUTY` tinyint unsigned NOT NULL DEFAULT '0',
    `OFC_LATITUDE` decimal(10,7) DEFAULT NULL,
    `OFC_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `OFC_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `OFC_LOCATION_UPDATED_ON` datetime DEFAULT NULL,
    `OFC_CREATED_ON` datetime NOT NULL,
    `OFC_LAST_UPDATE` datetime DEFAULT NULL,
    PRIMARY KEY (`OFC_USR_ID`),
    KEY `IX_OFC_COM_ID` (`OFC_COM_ID`),
    KEY `IX_OFC_IS_ON_DUTY` (`OFC_IS_ON_DUTY`),
    CONSTRAINT `FK_OFC_USR_ID` FOREIGN KEY (`OFC_USR_ID`) REFERENCES `user` (`USR_ID`),
    CONSTRAINT `FK_OFC_COM_ID` FOREIGN KEY (`OFC_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- OFFICER EVALUATION
-- ============================================================

DROP TABLE IF EXISTS `officer_evaluation`;
CREATE TABLE `officer_evaluation` (
    `OEV_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `OEV_OFC_USR_ID` varchar(128) NOT NULL,
    `OEV_EVALUATOR_USR_ID` varchar(128) NOT NULL,
    `OEV_TEXT` text NOT NULL,
    `OEV_EVALUATION_DATE` date NOT NULL,
    `OEV_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`OEV_ID`),
    KEY `IX_OEV_OFC_USR_ID` (`OEV_OFC_USR_ID`),
    CONSTRAINT `FK_OEV_OFC_USR_ID` FOREIGN KEY (`OEV_OFC_USR_ID`) REFERENCES `user` (`USR_ID`),
    CONSTRAINT `FK_OEV_EVALUATOR_USR_ID` FOREIGN KEY (`OEV_EVALUATOR_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CALL (service, emergency, panic, test)
-- ============================================================

DROP TABLE IF EXISTS `call`;
CREATE TABLE `call` (
    `CAL_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `CAL_COM_ID` bigint unsigned NOT NULL,
    `CAL_CREATOR_USR_ID` varchar(128) NOT NULL,
    `CAL_OFFICER_USR_ID` varchar(128) DEFAULT NULL,
    `CAL_CATEGORY` smallint unsigned NOT NULL COMMENT '1=Security Emergency, 2=Medical Emergency, 3=Concierge Service, 4=Panic, 5=Test',
    `CAL_SERVICE_TYPE_ID` varchar(100) NOT NULL DEFAULT '' COMMENT 'References $DataItems service_type key',
    `CAL_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=New, 2=Accepted, 3=Resolved, 4=Canceled',
    `CAL_PRIORITY` smallint unsigned NOT NULL DEFAULT '3' COMMENT '1=Urgent, 2=Important, 3=Normal, 4=Low',
    `CAL_DESCRIPTION` text,
    `CAL_ADDRESS` varchar(500) NOT NULL DEFAULT '',
    `CAL_LATITUDE` decimal(10,7) DEFAULT NULL,
    `CAL_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `CAL_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `CAL_CURRENT_LATITUDE` decimal(10,7) DEFAULT NULL,
    `CAL_CURRENT_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `CAL_CURRENT_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `CAL_SCHEDULED_ON` datetime DEFAULT NULL,
    `CAL_ACCEPTED_ON` datetime DEFAULT NULL,
    `CAL_RESOLVED_ON` datetime DEFAULT NULL,
    `CAL_CANCELED_ON` datetime DEFAULT NULL,
    `CAL_OFFICER_COMMENTS` text,
    `CAL_LIKE_REACTION` tinyint unsigned NOT NULL DEFAULT '0',
    `CAL_RESIDENT_COMMENTS` text,
    `CAL_ETA_MINUTES` int unsigned DEFAULT NULL,
    `CAL_ETA_UPDATED_ON` datetime DEFAULT NULL,
    `CAL_CREATED_ON` datetime NOT NULL,
    `CAL_LAST_UPDATE` datetime DEFAULT NULL,
    `CAL_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`CAL_ID`),
    KEY `IX_CAL_COM_ID` (`CAL_COM_ID`),
    KEY `IX_CAL_CREATOR_USR_ID` (`CAL_CREATOR_USR_ID`),
    KEY `IX_CAL_OFFICER_USR_ID` (`CAL_OFFICER_USR_ID`),
    KEY `IX_CAL_STATUS` (`CAL_STATUS`),
    KEY `IX_CAL_CATEGORY` (`CAL_CATEGORY`),
    KEY `IX_CAL_CREATED_ON` (`CAL_CREATED_ON`),
    KEY `IX_CAL_SCHEDULED_ON` (`CAL_SCHEDULED_ON`),
    CONSTRAINT `FK_CAL_COM_ID` FOREIGN KEY (`CAL_COM_ID`) REFERENCES `community` (`COM_ID`),
    CONSTRAINT `FK_CAL_CREATOR_USR_ID` FOREIGN KEY (`CAL_CREATOR_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CALL MEDIA (images, video, audio, confirmation images)
-- ============================================================

DROP TABLE IF EXISTS `call_media`;
CREATE TABLE `call_media` (
    `CLM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `CLM_CAL_ID` bigint unsigned NOT NULL,
    `CLM_USR_ID` varchar(128) NOT NULL,
    `CLM_TYPE` smallint unsigned NOT NULL COMMENT '1=Image, 2=Video, 3=Audio, 4=Confirmation Image, 5=Confirmation Video',
    `CLM_FILE_NAME` varchar(200) NOT NULL,
    `CLM_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`CLM_ID`),
    KEY `IX_CLM_CAL_ID` (`CLM_CAL_ID`),
    CONSTRAINT `FK_CLM_CAL_ID` FOREIGN KEY (`CLM_CAL_ID`) REFERENCES `call` (`CAL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CALL DOCUMENT (police reports, body cam, etc.)
-- ============================================================

DROP TABLE IF EXISTS `call_document`;
CREATE TABLE `call_document` (
    `CLD_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `CLD_CAL_ID` bigint unsigned NOT NULL,
    `CLD_USR_ID` varchar(128) NOT NULL,
    `CLD_FILE_NAME` varchar(200) NOT NULL,
    `CLD_ORIG_FILE_NAME` varchar(250) NOT NULL DEFAULT '',
    `CLD_TRANSCRIPTION` text,
    `CLD_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`CLD_ID`),
    KEY `IX_CLD_CAL_ID` (`CLD_CAL_ID`),
    CONSTRAINT `FK_CLD_CAL_ID` FOREIGN KEY (`CLD_CAL_ID`) REFERENCES `call` (`CAL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CALL COMMENT (two-way communication for panic calls)
-- ============================================================

DROP TABLE IF EXISTS `call_comment`;
CREATE TABLE `call_comment` (
    `CCM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `CCM_CAL_ID` bigint unsigned NOT NULL,
    `CCM_USR_ID` varchar(128) NOT NULL,
    `CCM_TEXT` text NOT NULL,
    `CCM_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`CCM_ID`),
    KEY `IX_CCM_CAL_ID` (`CCM_CAL_ID`),
    CONSTRAINT `FK_CCM_CAL_ID` FOREIGN KEY (`CCM_CAL_ID`) REFERENCES `call` (`CAL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TASK (maintenance reports)
-- ============================================================

DROP TABLE IF EXISTS `task`;
CREATE TABLE `task` (
    `TSK_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `TSK_COM_ID` bigint unsigned NOT NULL,
    `TSK_CREATOR_USR_ID` varchar(128) NOT NULL,
    `TSK_ASSIGNEE_USR_ID` varchar(128) DEFAULT NULL,
    `TSK_TYPE_ID` varchar(100) NOT NULL DEFAULT '' COMMENT 'References $DataItems task_type key',
    `TSK_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=New, 2=Accepted, 3=Approved, 4=Completed, 5=Rejected, 6=Canceled',
    `TSK_PRIORITY` smallint unsigned NOT NULL DEFAULT '4' COMMENT '1=Urgent, 2=Important, 3=Normal, 4=Low',
    `TSK_DESCRIPTION` varchar(200) NOT NULL,
    `TSK_ADDRESS` varchar(500) NOT NULL DEFAULT '',
    `TSK_ETA` datetime DEFAULT NULL,
    `TSK_CREATED_ON` datetime NOT NULL,
    `TSK_LAST_UPDATE` datetime DEFAULT NULL,
    `TSK_COMPLETED_ON` datetime DEFAULT NULL,
    `TSK_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`TSK_ID`),
    KEY `IX_TSK_COM_ID` (`TSK_COM_ID`),
    KEY `IX_TSK_CREATOR_USR_ID` (`TSK_CREATOR_USR_ID`),
    KEY `IX_TSK_ASSIGNEE_USR_ID` (`TSK_ASSIGNEE_USR_ID`),
    KEY `IX_TSK_STATUS` (`TSK_STATUS`),
    KEY `IX_TSK_CREATED_ON` (`TSK_CREATED_ON`),
    CONSTRAINT `FK_TSK_COM_ID` FOREIGN KEY (`TSK_COM_ID`) REFERENCES `community` (`COM_ID`),
    CONSTRAINT `FK_TSK_CREATOR_USR_ID` FOREIGN KEY (`TSK_CREATOR_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TASK COMMENT
-- ============================================================

DROP TABLE IF EXISTS `task_comment`;
CREATE TABLE `task_comment` (
    `TCM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `TCM_TSK_ID` bigint unsigned NOT NULL,
    `TCM_USR_ID` varchar(128) NOT NULL,
    `TCM_TEXT` text NOT NULL,
    `TCM_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`TCM_ID`),
    KEY `IX_TCM_TSK_ID` (`TCM_TSK_ID`),
    CONSTRAINT `FK_TCM_TSK_ID` FOREIGN KEY (`TCM_TSK_ID`) REFERENCES `task` (`TSK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TASK MEDIA (images, video, documents)
-- ============================================================

DROP TABLE IF EXISTS `task_media`;
CREATE TABLE `task_media` (
    `TKM_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `TKM_TSK_ID` bigint unsigned NOT NULL,
    `TKM_USR_ID` varchar(128) NOT NULL,
    `TKM_TYPE` smallint unsigned NOT NULL COMMENT '1=Image, 2=Video, 3=Document, 4=Confirmation Image, 5=Confirmation Video',
    `TKM_FILE_NAME` varchar(200) NOT NULL,
    `TKM_ORIG_FILE_NAME` varchar(250) NOT NULL DEFAULT '',
    `TKM_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`TKM_ID`),
    KEY `IX_TKM_TSK_ID` (`TKM_TSK_ID`),
    CONSTRAINT `FK_TKM_TSK_ID` FOREIGN KEY (`TKM_TSK_ID`) REFERENCES `task` (`TSK_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POST (physical posts within a community)
-- ============================================================

DROP TABLE IF EXISTS `post`;
CREATE TABLE `post` (
    `PST_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PST_COM_ID` bigint unsigned NOT NULL,
    `PST_NAME` varchar(60) NOT NULL,
    `PST_DESCRIPTION` varchar(200) NOT NULL DEFAULT '',
    `PST_PRIORITY` smallint unsigned NOT NULL DEFAULT '3' COMMENT '1=Urgent, 2=Important, 3=Normal, 4=Low',
    `PST_LATITUDE` decimal(10,7) DEFAULT NULL,
    `PST_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `PST_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `PST_EQUIPMENT` text,
    `PST_SHAPE_TYPE` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Point, 2=Circle, 3=Line',
    `PST_SHAPE_DATA` text,
    `PST_IS_ACTIVE` tinyint unsigned NOT NULL DEFAULT '1',
    `PST_CREATED_ON` datetime NOT NULL,
    `PST_LAST_UPDATE` datetime DEFAULT NULL,
    `PST_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`PST_ID`),
    KEY `IX_PST_COM_ID` (`PST_COM_ID`),
    KEY `IX_PST_IS_ACTIVE` (`PST_IS_ACTIVE`),
    UNIQUE KEY `UQ_PST_COM_NAME` (`PST_COM_ID`, `PST_NAME`),
    CONSTRAINT `FK_PST_COM_ID` FOREIGN KEY (`PST_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ASSET (cameras, doors, windows, etc.)
-- ============================================================

DROP TABLE IF EXISTS `asset`;
CREATE TABLE `asset` (
    `AST_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `AST_COM_ID` bigint unsigned NOT NULL,
    `AST_TYPE_ID` varchar(100) NOT NULL DEFAULT '' COMMENT 'References $DataItems asset_type key',
    `AST_DESCRIPTION` varchar(500) NOT NULL DEFAULT '',
    `AST_LATITUDE` decimal(10,7) DEFAULT NULL,
    `AST_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `AST_LOCATION_NAME` varchar(500) DEFAULT NULL,
    `AST_SHAPE_TYPE` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Point, 2=Circle, 3=Line',
    `AST_SHAPE_DATA` text,
    `AST_INSTALLATION_DATE` date DEFAULT NULL,
    `AST_REPLACEMENT_DATE` date DEFAULT NULL,
    `AST_CREATED_ON` datetime NOT NULL,
    `AST_LAST_UPDATE` datetime DEFAULT NULL,
    `AST_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`AST_ID`),
    KEY `IX_AST_COM_ID` (`AST_COM_ID`),
    KEY `IX_AST_TYPE_ID` (`AST_TYPE_ID`),
    CONSTRAINT `FK_AST_COM_ID` FOREIGN KEY (`AST_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MAP ZONE (entry/exit points, high priority zones)
-- ============================================================

DROP TABLE IF EXISTS `map_zone`;
CREATE TABLE `map_zone` (
    `MZN_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `MZN_COM_ID` bigint unsigned NOT NULL,
    `MZN_TYPE` smallint unsigned NOT NULL COMMENT '1=Entry/Exit Point, 2=High Priority Zone',
    `MZN_NAME` varchar(200) NOT NULL,
    `MZN_LATITUDE` decimal(10,7) DEFAULT NULL,
    `MZN_LONGITUDE` decimal(10,7) DEFAULT NULL,
    `MZN_POLYGON_DATA` text,
    `MZN_CREATED_ON` datetime NOT NULL,
    `MZN_LAST_UPDATE` datetime DEFAULT NULL,
    `MZN_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`MZN_ID`),
    KEY `IX_MZN_COM_ID` (`MZN_COM_ID`),
    CONSTRAINT `FK_MZN_COM_ID` FOREIGN KEY (`MZN_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHIFT
-- ============================================================

DROP TABLE IF EXISTS `shift`;
CREATE TABLE `shift` (
    `SHF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `SHF_COM_ID` bigint unsigned NOT NULL,
    `SHF_DATE` date NOT NULL,
    `SHF_START_TIME` time NOT NULL,
    `SHF_END_TIME` time NOT NULL,
    `SHF_IS_OVERNIGHT` tinyint unsigned NOT NULL DEFAULT '0',
    `SHF_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Draft, 2=Published, 3=Active, 4=Completed, 5=Cancelled',
    `SHF_NOTES` varchar(500) NOT NULL DEFAULT '',
    `SHF_RECURRING_SERIES_ID` bigint unsigned DEFAULT NULL,
    `SHF_CREATED_BY` varchar(128) NOT NULL,
    `SHF_CREATED_ON` datetime NOT NULL,
    `SHF_LAST_UPDATE` datetime DEFAULT NULL,
    `SHF_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`SHF_ID`),
    KEY `IX_SHF_COM_ID` (`SHF_COM_ID`),
    KEY `IX_SHF_DATE` (`SHF_DATE`),
    KEY `IX_SHF_STATUS` (`SHF_STATUS`),
    KEY `IX_SHF_RECURRING_SERIES_ID` (`SHF_RECURRING_SERIES_ID`),
    CONSTRAINT `FK_SHF_COM_ID` FOREIGN KEY (`SHF_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHIFT RECURRING SERIES
-- ============================================================

DROP TABLE IF EXISTS `shift_series`;
CREATE TABLE `shift_series` (
    `SHS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `SHS_COM_ID` bigint unsigned NOT NULL,
    `SHS_PATTERN` smallint unsigned NOT NULL COMMENT '1=Daily, 2=Specific Days, 3=Every X Days',
    `SHS_REPEAT_DAYS` varchar(50) NOT NULL DEFAULT '' COMMENT 'Comma-separated day numbers (1=Mon..7=Sun)',
    `SHS_REPEAT_INTERVAL` int unsigned DEFAULT NULL COMMENT 'Every X days',
    `SHS_END_CONDITION` smallint unsigned NOT NULL COMMENT '1=End Date, 2=Occurrences, 3=No End',
    `SHS_END_DATE` date DEFAULT NULL,
    `SHS_OCCURRENCES` int unsigned DEFAULT NULL,
    `SHS_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`SHS_ID`),
    KEY `IX_SHS_COM_ID` (`SHS_COM_ID`),
    CONSTRAINT `FK_SHS_COM_ID` FOREIGN KEY (`SHS_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHIFT OFFICER (allocation)
-- ============================================================

DROP TABLE IF EXISTS `shift_officer`;
CREATE TABLE `shift_officer` (
    `SFO_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `SFO_SHF_ID` bigint unsigned NOT NULL,
    `SFO_USR_ID` varchar(128) NOT NULL,
    `SFO_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`SFO_ID`),
    UNIQUE KEY `UQ_SFO_SHIFT_OFFICER` (`SFO_SHF_ID`, `SFO_USR_ID`),
    KEY `IX_SFO_USR_ID` (`SFO_USR_ID`),
    CONSTRAINT `FK_SFO_SHF_ID` FOREIGN KEY (`SFO_SHF_ID`) REFERENCES `shift` (`SHF_ID`),
    CONSTRAINT `FK_SFO_USR_ID` FOREIGN KEY (`SFO_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHIFT POST ASSIGNMENT (officer -> post within a shift)
-- ============================================================

DROP TABLE IF EXISTS `shift_post`;
CREATE TABLE `shift_post` (
    `SHP_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `SHP_SFO_ID` bigint unsigned NOT NULL,
    `SHP_PST_ID` bigint unsigned NOT NULL,
    `SHP_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`SHP_ID`),
    KEY `IX_SHP_SFO_ID` (`SHP_SFO_ID`),
    KEY `IX_SHP_PST_ID` (`SHP_PST_ID`),
    CONSTRAINT `FK_SHP_SFO_ID` FOREIGN KEY (`SHP_SFO_ID`) REFERENCES `shift_officer` (`SFO_ID`),
    CONSTRAINT `FK_SHP_PST_ID` FOREIGN KEY (`SHP_PST_ID`) REFERENCES `post` (`PST_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SHIFT CHECK-IN/OUT
-- ============================================================

DROP TABLE IF EXISTS `shift_checkin`;
CREATE TABLE `shift_checkin` (
    `SCK_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `SCK_SHF_ID` bigint unsigned NOT NULL,
    `SCK_USR_ID` varchar(128) NOT NULL,
    `SCK_CHECK_IN_ON` datetime NOT NULL,
    `SCK_CHECK_OUT_ON` datetime DEFAULT NULL,
    `SCK_TOTAL_HOURS` decimal(5,2) DEFAULT NULL,
    `SCK_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`SCK_ID`),
    KEY `IX_SCK_SHF_ID` (`SCK_SHF_ID`),
    KEY `IX_SCK_USR_ID` (`SCK_USR_ID`),
    CONSTRAINT `FK_SCK_SHF_ID` FOREIGN KEY (`SCK_SHF_ID`) REFERENCES `shift` (`SHF_ID`),
    CONSTRAINT `FK_SCK_USR_ID` FOREIGN KEY (`SCK_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PATROL ROUTE
-- ============================================================

DROP TABLE IF EXISTS `patrol_route`;
CREATE TABLE `patrol_route` (
    `PRT_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PRT_SHF_ID` bigint unsigned NOT NULL,
    `PRT_USR_ID` varchar(128) NOT NULL,
    `PRT_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Generated, 2=Modified, 3=Pushed',
    `PRT_GENERATED_ON` datetime NOT NULL,
    `PRT_PUSHED_ON` datetime DEFAULT NULL,
    `PRT_CREATED_ON` datetime NOT NULL,
    `PRT_LAST_UPDATE` datetime DEFAULT NULL,
    PRIMARY KEY (`PRT_ID`),
    KEY `IX_PRT_SHF_ID` (`PRT_SHF_ID`),
    KEY `IX_PRT_USR_ID` (`PRT_USR_ID`),
    CONSTRAINT `FK_PRT_SHF_ID` FOREIGN KEY (`PRT_SHF_ID`) REFERENCES `shift` (`SHF_ID`),
    CONSTRAINT `FK_PRT_USR_ID` FOREIGN KEY (`PRT_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PATROL WAYPOINT
-- ============================================================

DROP TABLE IF EXISTS `patrol_waypoint`;
CREATE TABLE `patrol_waypoint` (
    `PWP_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PWP_PRT_ID` bigint unsigned NOT NULL,
    `PWP_ORDER_NUM` int unsigned NOT NULL,
    `PWP_LOCATION_NAME` varchar(200) NOT NULL,
    `PWP_LATITUDE` decimal(10,7) NOT NULL,
    `PWP_LONGITUDE` decimal(10,7) NOT NULL,
    `PWP_ETA_MINUTES` int unsigned DEFAULT NULL,
    `PWP_DWELL_MINUTES` int unsigned DEFAULT NULL,
    `PWP_PRIORITY` smallint unsigned NOT NULL DEFAULT '3' COMMENT '1=Urgent, 2=Important, 3=Normal, 4=Low',
    `PWP_NOTES` varchar(500) NOT NULL DEFAULT '',
    `PWP_PST_ID` bigint unsigned DEFAULT NULL,
    PRIMARY KEY (`PWP_ID`),
    KEY `IX_PWP_PRT_ID` (`PWP_PRT_ID`),
    CONSTRAINT `FK_PWP_PRT_ID` FOREIGN KEY (`PWP_PRT_ID`) REFERENCES `patrol_route` (`PRT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- WAYPOINT VISIT (officer tracking)
-- ============================================================

DROP TABLE IF EXISTS `waypoint_visit`;
CREATE TABLE `waypoint_visit` (
    `WPV_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `WPV_PWP_ID` bigint unsigned NOT NULL,
    `WPV_USR_ID` varchar(128) NOT NULL,
    `WPV_LATITUDE` decimal(10,7) NOT NULL,
    `WPV_LONGITUDE` decimal(10,7) NOT NULL,
    `WPV_VISITED_ON` datetime NOT NULL,
    `WPV_IS_MANUAL` tinyint unsigned NOT NULL DEFAULT '0',
    PRIMARY KEY (`WPV_ID`),
    KEY `IX_WPV_PWP_ID` (`WPV_PWP_ID`),
    KEY `IX_WPV_USR_ID` (`WPV_USR_ID`),
    CONSTRAINT `FK_WPV_PWP_ID` FOREIGN KEY (`WPV_PWP_ID`) REFERENCES `patrol_waypoint` (`PWP_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- GPS LOG (location history)
-- ============================================================

DROP TABLE IF EXISTS `gps_log`;
CREATE TABLE `gps_log` (
    `GPL_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `GPL_USR_ID` varchar(128) NOT NULL,
    `GPL_LATITUDE` decimal(10,7) NOT NULL,
    `GPL_LONGITUDE` decimal(10,7) NOT NULL,
    `GPL_ACCURACY` decimal(6,2) DEFAULT NULL,
    `GPL_SPEED` decimal(6,2) DEFAULT NULL,
    `GPL_RECORDED_ON` datetime NOT NULL,
    `GPL_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`GPL_ID`),
    KEY `IX_GPL_USR_ID` (`GPL_USR_ID`),
    KEY `IX_GPL_RECORDED_ON` (`GPL_RECORDED_ON`),
    CONSTRAINT `FK_GPL_USR_ID` FOREIGN KEY (`GPL_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POST ORDER
-- ============================================================

DROP TABLE IF EXISTS `post_order`;
CREATE TABLE `post_order` (
    `PTO_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PTO_PST_ID` bigint unsigned NOT NULL,
    `PTO_COM_ID` bigint unsigned NOT NULL,
    `PTO_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Draft, 2=Published, 3=Archived',
    `PTO_VERSION_MAJOR` int unsigned NOT NULL DEFAULT '1',
    `PTO_VERSION_MINOR` int unsigned NOT NULL DEFAULT '0',
    `PTO_AUTHOR_USR_ID` varchar(128) NOT NULL,
    `PTO_LAST_PUBLISHED_BY` varchar(128) DEFAULT NULL,
    `PTO_EFFECTIVE_DATE` date DEFAULT NULL,
    `PTO_REVIEW_DUE_DATE` date DEFAULT NULL,
    `PTO_LAST_PUBLISHED_ON` datetime DEFAULT NULL,
    `PTO_CREATED_ON` datetime NOT NULL,
    `PTO_LAST_UPDATE` datetime DEFAULT NULL,
    `PTO_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`PTO_ID`),
    KEY `IX_PTO_PST_ID` (`PTO_PST_ID`),
    KEY `IX_PTO_COM_ID` (`PTO_COM_ID`),
    KEY `IX_PTO_STATUS` (`PTO_STATUS`),
    CONSTRAINT `FK_PTO_PST_ID` FOREIGN KEY (`PTO_PST_ID`) REFERENCES `post` (`PST_ID`),
    CONSTRAINT `FK_PTO_COM_ID` FOREIGN KEY (`PTO_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POST ORDER SECTION
-- ============================================================

DROP TABLE IF EXISTS `post_order_section`;
CREATE TABLE `post_order_section` (
    `POS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `POS_PTO_ID` bigint unsigned NOT NULL,
    `POS_SECTION_TYPE_ID` varchar(100) NOT NULL DEFAULT '' COMMENT 'References $DataItems po_section_type key',
    `POS_TITLE` varchar(80) NOT NULL,
    `POS_DESCRIPTION` text NOT NULL,
    `POS_ORDER_NUM` int unsigned NOT NULL DEFAULT '0',
    `POS_IS_CLIENT_VISIBLE` tinyint unsigned NOT NULL DEFAULT '1',
    `POS_NOTES` varchar(2000) NOT NULL DEFAULT '',
    `POS_CREATED_ON` datetime NOT NULL,
    `POS_LAST_UPDATE` datetime DEFAULT NULL,
    PRIMARY KEY (`POS_ID`),
    KEY `IX_POS_PTO_ID` (`POS_PTO_ID`),
    CONSTRAINT `FK_POS_PTO_ID` FOREIGN KEY (`POS_PTO_ID`) REFERENCES `post_order` (`PTO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POST ORDER SECTION ATTACHMENT
-- ============================================================

DROP TABLE IF EXISTS `post_order_attachment`;
CREATE TABLE `post_order_attachment` (
    `POA_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `POA_POS_ID` bigint unsigned NOT NULL,
    `POA_FILE_NAME` varchar(200) NOT NULL,
    `POA_ORIG_FILE_NAME` varchar(250) NOT NULL DEFAULT '',
    `POA_MIME_TYPE` varchar(200) NOT NULL DEFAULT '',
    `POA_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`POA_ID`),
    KEY `IX_POA_POS_ID` (`POA_POS_ID`),
    CONSTRAINT `FK_POA_POS_ID` FOREIGN KEY (`POA_POS_ID`) REFERENCES `post_order_section` (`POS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POST ORDER VERSION HISTORY
-- ============================================================

DROP TABLE IF EXISTS `post_order_version`;
CREATE TABLE `post_order_version` (
    `POV_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `POV_PTO_ID` bigint unsigned NOT NULL,
    `POV_VERSION_MAJOR` int unsigned NOT NULL,
    `POV_VERSION_MINOR` int unsigned NOT NULL,
    `POV_VERSION_TYPE` smallint unsigned NOT NULL COMMENT '1=Minor, 2=Major',
    `POV_CHANGE_SUMMARY` varchar(200) NOT NULL,
    `POV_PUBLISHED_BY` varchar(128) NOT NULL,
    `POV_EFFECTIVE_DATE` date NOT NULL,
    `POV_CONTENT_SNAPSHOT` longtext NOT NULL COMMENT 'JSON snapshot of all sections at publish time',
    `POV_PUBLISHED_ON` datetime NOT NULL,
    PRIMARY KEY (`POV_ID`),
    KEY `IX_POV_PTO_ID` (`POV_PTO_ID`),
    CONSTRAINT `FK_POV_PTO_ID` FOREIGN KEY (`POV_PTO_ID`) REFERENCES `post_order` (`PTO_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POST ORDER ACKNOWLEDGEMENT
-- ============================================================

DROP TABLE IF EXISTS `post_order_ack`;
CREATE TABLE `post_order_ack` (
    `PKA_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PKA_PTO_ID` bigint unsigned NOT NULL,
    `PKA_POV_ID` bigint unsigned NOT NULL,
    `PKA_USR_ID` varchar(128) NOT NULL,
    `PKA_ACKNOWLEDGED_ON` datetime NOT NULL,
    PRIMARY KEY (`PKA_ID`),
    UNIQUE KEY `UQ_PKA_VERSION_USER` (`PKA_POV_ID`, `PKA_USR_ID`),
    KEY `IX_PKA_PTO_ID` (`PKA_PTO_ID`),
    CONSTRAINT `FK_PKA_PTO_ID` FOREIGN KEY (`PKA_PTO_ID`) REFERENCES `post_order` (`PTO_ID`),
    CONSTRAINT `FK_PKA_POV_ID` FOREIGN KEY (`PKA_POV_ID`) REFERENCES `post_order_version` (`POV_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POI RECORD (Person of Interest / Trespass / Metro Red Card)
-- ============================================================

DROP TABLE IF EXISTS `poi_record`;
CREATE TABLE `poi_record` (
    `POI_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `POI_RECORD_TYPE` smallint unsigned NOT NULL COMMENT '1=Person of Interest, 2=Trespass Order, 3=Metro Red Card',
    `POI_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Draft, 2=Active, 3=Expired, 4=Inactive, 5=Archived',
    `POI_FIRST_NAME` varchar(60) NOT NULL,
    `POI_LAST_NAME` varchar(60) NOT NULL,
    `POI_ALIASES` varchar(200) NOT NULL DEFAULT '',
    `POI_DATE_OF_BIRTH` date DEFAULT NULL,
    `POI_GENDER` smallint unsigned DEFAULT NULL COMMENT '1=Male, 2=Female, 3=Unknown',
    `POI_PHYSICAL_DESCRIPTION` varchar(500) NOT NULL DEFAULT '',
    `POI_THREAT_LEVEL` smallint unsigned NOT NULL COMMENT '1=Low, 2=Medium, 3=High, 4=Critical',
    `POI_SUMMARY` varchar(300) NOT NULL,
    `POI_INTERNAL_NOTES` varchar(2000) NOT NULL DEFAULT '',
    `POI_INCIDENT_HISTORY` varchar(1000) NOT NULL DEFAULT '',
    `POI_ASSOCIATED_INDIVIDUALS` varchar(500) NOT NULL DEFAULT '',
    `POI_WATCH_REVIEW_DATE` date DEFAULT NULL,
    `POI_TRESPASS_NOTICE_NUM` varchar(100) NOT NULL DEFAULT '',
    `POI_ISSUING_AUTHORITY` varchar(200) NOT NULL DEFAULT '',
    `POI_PROPERTY_COVERED` varchar(500) NOT NULL DEFAULT '',
    `POI_ISSUE_DATE` date DEFAULT NULL,
    `POI_EXPIRY_DATE` date DEFAULT NULL,
    `POI_NOTICE_DOCUMENT` varchar(200) NOT NULL DEFAULT '',
    `POI_RENEWAL_REMINDER_DAYS` int unsigned DEFAULT '14',
    `POI_LAW_ENFORCEMENT_CONTACT` varchar(200) NOT NULL DEFAULT '',
    `POI_CONDITIONS` text,
    `POI_RED_CARD_NUMBER` varchar(100) NOT NULL DEFAULT '',
    `POI_LINES` varchar(500) NOT NULL DEFAULT '',
    `POI_CARD_DOCUMENT` varchar(200) NOT NULL DEFAULT '',
    `POI_INACTIVATE_REASON` text,
    `POI_CREATED_BY` varchar(128) NOT NULL,
    `POI_APPROVED_BY` varchar(128) DEFAULT NULL,
    `POI_APPROVED_ON` datetime DEFAULT NULL,
    `POI_CREATED_ON` datetime NOT NULL,
    `POI_LAST_UPDATE` datetime DEFAULT NULL,
    `POI_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`POI_ID`),
    KEY `IX_POI_RECORD_TYPE` (`POI_RECORD_TYPE`),
    KEY `IX_POI_STATUS` (`POI_STATUS`),
    KEY `IX_POI_THREAT_LEVEL` (`POI_THREAT_LEVEL`),
    KEY `IX_POI_EXPIRY_DATE` (`POI_EXPIRY_DATE`),
    KEY `IX_POI_FIRST_NAME` (`POI_FIRST_NAME`),
    KEY `IX_POI_LAST_NAME` (`POI_LAST_NAME`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POI PHOTO
-- ============================================================

DROP TABLE IF EXISTS `poi_photo`;
CREATE TABLE `poi_photo` (
    `PPH_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PPH_POI_ID` bigint unsigned NOT NULL,
    `PPH_FILE_NAME` varchar(200) NOT NULL,
    `PPH_ORDER_NUM` int unsigned NOT NULL DEFAULT '0',
    `PPH_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`PPH_ID`),
    KEY `IX_PPH_POI_ID` (`PPH_POI_ID`),
    CONSTRAINT `FK_PPH_POI_ID` FOREIGN KEY (`PPH_POI_ID`) REFERENCES `poi_record` (`POI_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POI SITE (which communities/sites the record is active on)
-- ============================================================

DROP TABLE IF EXISTS `poi_site`;
CREATE TABLE `poi_site` (
    `PIS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PIS_POI_ID` bigint unsigned NOT NULL,
    `PIS_COM_ID` bigint unsigned NOT NULL,
    `PIS_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`PIS_ID`),
    UNIQUE KEY `UQ_PIS_POI_COM` (`PIS_POI_ID`, `PIS_COM_ID`),
    KEY `IX_PIS_COM_ID` (`PIS_COM_ID`),
    CONSTRAINT `FK_PIS_POI_ID` FOREIGN KEY (`PIS_POI_ID`) REFERENCES `poi_record` (`POI_ID`),
    CONSTRAINT `FK_PIS_COM_ID` FOREIGN KEY (`PIS_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POI RELATED INCIDENT
-- ============================================================

DROP TABLE IF EXISTS `poi_incident`;
CREATE TABLE `poi_incident` (
    `PIN_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PIN_POI_ID` bigint unsigned NOT NULL,
    `PIN_CAL_ID` bigint unsigned NOT NULL,
    `PIN_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`PIN_ID`),
    KEY `IX_PIN_POI_ID` (`PIN_POI_ID`),
    KEY `IX_PIN_CAL_ID` (`PIN_CAL_ID`),
    CONSTRAINT `FK_PIN_POI_ID` FOREIGN KEY (`PIN_POI_ID`) REFERENCES `poi_record` (`POI_ID`),
    CONSTRAINT `FK_PIN_CAL_ID` FOREIGN KEY (`PIN_CAL_ID`) REFERENCES `call` (`CAL_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POI EXPORT LOG
-- ============================================================

DROP TABLE IF EXISTS `poi_export`;
CREATE TABLE `poi_export` (
    `PEX_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PEX_POI_ID` bigint unsigned NOT NULL,
    `PEX_USR_ID` varchar(128) NOT NULL,
    `PEX_FILE_NAME` varchar(200) NOT NULL,
    `PEX_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`PEX_ID`),
    KEY `IX_PEX_POI_ID` (`PEX_POI_ID`),
    CONSTRAINT `FK_PEX_POI_ID` FOREIGN KEY (`PEX_POI_ID`) REFERENCES `poi_record` (`POI_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- POI VIEW LOG (officer viewed record)
-- ============================================================

DROP TABLE IF EXISTS `poi_view`;
CREATE TABLE `poi_view` (
    `PVW_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `PVW_POI_ID` bigint unsigned NOT NULL,
    `PVW_USR_ID` varchar(128) NOT NULL,
    `PVW_VERSION` int unsigned NOT NULL DEFAULT '1',
    `PVW_VIEWED_ON` datetime NOT NULL,
    PRIMARY KEY (`PVW_ID`),
    UNIQUE KEY `UQ_PVW_POI_USR_VER` (`PVW_POI_ID`, `PVW_USR_ID`, `PVW_VERSION`),
    CONSTRAINT `FK_PVW_POI_ID` FOREIGN KEY (`PVW_POI_ID`) REFERENCES `poi_record` (`POI_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REPORT TEMPLATE
-- ============================================================

DROP TABLE IF EXISTS `report_template`;
CREATE TABLE `report_template` (
    `RPT_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `RPT_NAME` varchar(80) NOT NULL,
    `RPT_CATEGORY` smallint unsigned NOT NULL COMMENT '1=Incident, 2=Daily Activity, 3=Custom',
    `RPT_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Draft, 2=Active, 3=Archived',
    `RPT_TITLE_FORMAT` varchar(300) NOT NULL DEFAULT '',
    `RPT_REVIEW_BEFORE_CLIENT` tinyint unsigned NOT NULL DEFAULT '0',
    `RPT_ALLOW_EDIT_AFTER_SUBMIT` tinyint unsigned NOT NULL DEFAULT '0',
    `RPT_STYLE_LOGO` varchar(200) NOT NULL DEFAULT '',
    `RPT_STYLE_ACCENT_COLOR` varchar(7) NOT NULL DEFAULT '',
    `RPT_STYLE_HEADER_LAYOUT` smallint unsigned NOT NULL DEFAULT '2' COMMENT '1=Compact, 2=Standard, 3=Full-width',
    `RPT_STYLE_FONT` varchar(50) NOT NULL DEFAULT 'Arial',
    `RPT_STYLE_PAGE_NUMBERS` tinyint unsigned NOT NULL DEFAULT '1',
    `RPT_STYLE_FOOTER_TEXT` varchar(200) NOT NULL DEFAULT '',
    `RPT_STYLE_DATE_FORMAT` varchar(20) NOT NULL DEFAULT 'MM/DD/YYYY',
    `RPT_STYLE_SECTION_BREAKS` smallint unsigned NOT NULL DEFAULT '2' COMMENT '1=New Page, 2=Continuous',
    `RPT_STYLE_COVER_PAGE` tinyint unsigned NOT NULL DEFAULT '0',
    `RPT_CREATED_BY` varchar(128) NOT NULL,
    `RPT_CREATED_ON` datetime NOT NULL,
    `RPT_LAST_UPDATE` datetime DEFAULT NULL,
    `RPT_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`RPT_ID`),
    KEY `IX_RPT_STATUS` (`RPT_STATUS`),
    KEY `IX_RPT_CATEGORY` (`RPT_CATEGORY`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REPORT TEMPLATE COMMUNITY (which communities the template is available for)
-- ============================================================

DROP TABLE IF EXISTS `report_template_community`;
CREATE TABLE `report_template_community` (
    `RTC_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `RTC_RPT_ID` bigint unsigned NOT NULL,
    `RTC_COM_ID` bigint unsigned NOT NULL,
    PRIMARY KEY (`RTC_ID`),
    UNIQUE KEY `UQ_RTC_RPT_COM` (`RTC_RPT_ID`, `RTC_COM_ID`),
    CONSTRAINT `FK_RTC_RPT_ID` FOREIGN KEY (`RTC_RPT_ID`) REFERENCES `report_template` (`RPT_ID`),
    CONSTRAINT `FK_RTC_COM_ID` FOREIGN KEY (`RTC_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REPORT TEMPLATE SECTION
-- ============================================================

DROP TABLE IF EXISTS `report_template_section`;
CREATE TABLE `report_template_section` (
    `RTS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `RTS_RPT_ID` bigint unsigned NOT NULL,
    `RTS_TITLE` varchar(80) NOT NULL,
    `RTS_ORDER_NUM` int unsigned NOT NULL DEFAULT '0',
    `RTS_IS_ENABLED` tinyint unsigned NOT NULL DEFAULT '1',
    `RTS_IS_REQUIRED` tinyint unsigned NOT NULL DEFAULT '1',
    `RTS_IS_CLIENT_VISIBLE` tinyint unsigned NOT NULL DEFAULT '1',
    `RTS_CREATED_ON` datetime NOT NULL,
    `RTS_LAST_UPDATE` datetime DEFAULT NULL,
    PRIMARY KEY (`RTS_ID`),
    KEY `IX_RTS_RPT_ID` (`RTS_RPT_ID`),
    CONSTRAINT `FK_RTS_RPT_ID` FOREIGN KEY (`RTS_RPT_ID`) REFERENCES `report_template` (`RPT_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REPORT TEMPLATE FIELD
-- ============================================================

DROP TABLE IF EXISTS `report_template_field`;
CREATE TABLE `report_template_field` (
    `RTF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `RTF_RTS_ID` bigint unsigned NOT NULL,
    `RTF_LABEL` varchar(100) NOT NULL,
    `RTF_DESCRIPTION` varchar(500) NOT NULL DEFAULT '',
    `RTF_TYPE` smallint unsigned NOT NULL COMMENT '1=Text, 2=Date, 3=Location, 4=Dropdown, 5=File Upload, 6=Signature, 7=Incident Field',
    `RTF_INCIDENT_FIELD_NAME` varchar(100) NOT NULL DEFAULT '' COMMENT 'If type=7, references a standard call field',
    `RTF_MAX_CHARS` int unsigned DEFAULT NULL,
    `RTF_MAX_FILES` int unsigned DEFAULT NULL,
    `RTF_DROPDOWN_VALUES` text COMMENT 'JSON array of dropdown options',
    `RTF_IS_MULTI_SELECT` tinyint unsigned NOT NULL DEFAULT '0',
    `RTF_ORDER_NUM` int unsigned NOT NULL DEFAULT '0',
    `RTF_IS_REQUIRED` tinyint unsigned NOT NULL DEFAULT '0',
    `RTF_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`RTF_ID`),
    KEY `IX_RTF_RTS_ID` (`RTF_RTS_ID`),
    CONSTRAINT `FK_RTF_RTS_ID` FOREIGN KEY (`RTF_RTS_ID`) REFERENCES `report_template_section` (`RTS_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INCIDENT REPORT
-- ============================================================

DROP TABLE IF EXISTS `incident_report`;
CREATE TABLE `incident_report` (
    `IRE_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `IRE_RPT_ID` bigint unsigned NOT NULL,
    `IRE_COM_ID` bigint unsigned NOT NULL,
    `IRE_CAL_ID` bigint unsigned DEFAULT NULL COMMENT 'Linked call (NULL for standalone reports)',
    `IRE_OFFICER_USR_ID` varchar(128) NOT NULL,
    `IRE_STATUS` smallint unsigned NOT NULL DEFAULT '1' COMMENT '1=Draft, 2=Submitted, 3=Under Review, 4=Changes Requested, 5=Approved, 6=Delivered',
    `IRE_TITLE` varchar(300) NOT NULL DEFAULT '',
    `IRE_REVIEWER_USR_ID` varchar(128) DEFAULT NULL,
    `IRE_REVIEWER_COMMENTS` varchar(1000) NOT NULL DEFAULT '',
    `IRE_MANAGEMENT_SUMMARY` varchar(1000) NOT NULL DEFAULT '',
    `IRE_SUBMITTED_ON` datetime DEFAULT NULL,
    `IRE_APPROVED_ON` datetime DEFAULT NULL,
    `IRE_DELIVERED_ON` datetime DEFAULT NULL,
    `IRE_DELIVERED_BY` varchar(128) DEFAULT NULL,
    `IRE_CREATED_ON` datetime NOT NULL,
    `IRE_LAST_UPDATE` datetime DEFAULT NULL,
    `IRE_DELETED_ON` datetime DEFAULT NULL,
    PRIMARY KEY (`IRE_ID`),
    KEY `IX_IRE_RPT_ID` (`IRE_RPT_ID`),
    KEY `IX_IRE_COM_ID` (`IRE_COM_ID`),
    KEY `IX_IRE_CAL_ID` (`IRE_CAL_ID`),
    KEY `IX_IRE_OFFICER_USR_ID` (`IRE_OFFICER_USR_ID`),
    KEY `IX_IRE_STATUS` (`IRE_STATUS`),
    KEY `IX_IRE_CREATED_ON` (`IRE_CREATED_ON`),
    CONSTRAINT `FK_IRE_RPT_ID` FOREIGN KEY (`IRE_RPT_ID`) REFERENCES `report_template` (`RPT_ID`),
    CONSTRAINT `FK_IRE_COM_ID` FOREIGN KEY (`IRE_COM_ID`) REFERENCES `community` (`COM_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INCIDENT REPORT SECTION DATA
-- ============================================================

DROP TABLE IF EXISTS `incident_report_section`;
CREATE TABLE `incident_report_section` (
    `IRS_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `IRS_IRE_ID` bigint unsigned NOT NULL,
    `IRS_RTS_ID` bigint unsigned NOT NULL COMMENT 'Reference to template section',
    `IRS_ORDER_NUM` int unsigned NOT NULL DEFAULT '0',
    `IRS_IS_CLIENT_VISIBLE` tinyint unsigned NOT NULL DEFAULT '1',
    `IRS_CONTENT` longtext NOT NULL COMMENT 'JSON object with field values',
    `IRS_CREATED_ON` datetime NOT NULL,
    `IRS_LAST_UPDATE` datetime DEFAULT NULL,
    PRIMARY KEY (`IRS_ID`),
    KEY `IX_IRS_IRE_ID` (`IRS_IRE_ID`),
    CONSTRAINT `FK_IRS_IRE_ID` FOREIGN KEY (`IRS_IRE_ID`) REFERENCES `incident_report` (`IRE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INCIDENT REPORT ATTACHMENT
-- ============================================================

DROP TABLE IF EXISTS `incident_report_attachment`;
CREATE TABLE `incident_report_attachment` (
    `IRA_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `IRA_IRE_ID` bigint unsigned NOT NULL,
    `IRA_IRS_ID` bigint unsigned DEFAULT NULL COMMENT 'Optional section reference',
    `IRA_FILE_NAME` varchar(200) NOT NULL,
    `IRA_ORIG_FILE_NAME` varchar(250) NOT NULL DEFAULT '',
    `IRA_MIME_TYPE` varchar(200) NOT NULL DEFAULT '',
    `IRA_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`IRA_ID`),
    KEY `IX_IRA_IRE_ID` (`IRA_IRE_ID`),
    CONSTRAINT `FK_IRA_IRE_ID` FOREIGN KEY (`IRA_IRE_ID`) REFERENCES `incident_report` (`IRE_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NOTIFICATION
-- ============================================================

DROP TABLE IF EXISTS `notification`;
CREATE TABLE `notification` (
    `NTF_ID` bigint unsigned NOT NULL AUTO_INCREMENT,
    `NTF_USR_ID` varchar(128) NOT NULL,
    `NTF_TYPE` varchar(50) NOT NULL,
    `NTF_TITLE` varchar(200) NOT NULL,
    `NTF_TEXT` varchar(500) NOT NULL DEFAULT '',
    `NTF_DATA` text COMMENT 'JSON payload with entity references',
    `NTF_IS_READ` tinyint unsigned NOT NULL DEFAULT '0',
    `NTF_CREATED_ON` datetime NOT NULL,
    PRIMARY KEY (`NTF_ID`),
    KEY `IX_NTF_USR_ID` (`NTF_USR_ID`),
    KEY `IX_NTF_IS_READ` (`NTF_IS_READ`),
    KEY `IX_NTF_CREATED_ON` (`NTF_CREATED_ON`),
    CONSTRAINT `FK_NTF_USR_ID` FOREIGN KEY (`NTF_USR_ID`) REFERENCES `user` (`USR_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- STATIC LOOKUP LISTS (managed via $DataItems module)
-- ============================================================
-- The following lists are NOT stored as separate DB tables.
-- They are managed via the platform's $DataItems module:
--
--   service_type     - Service/Incident type dropdown (Lockout, Noise Complaint, etc.)
--   task_type        - Maintenance task type dropdown (Lights, Sprinklers, Supply Request, etc.)
--   asset_type       - Asset type with icon/color in DIT_EXTRA JSON
--   po_section_type  - Post Order section type with client_visible flag in DIT_EXTRA JSON
--
-- Admin CRUD for these is handled through the Settings APIs
-- using $DataItems.get(), $DataItems.set(), $DataItems.remove().
-- ============================================================

-- ============================================================
-- USER TYPES
-- ============================================================
-- Officers and Residents use separate user types (not sub-types):
--   USER_TYPE_OFFICER  = 2
--   USER_TYPE_RESIDENT = 3
-- Defined in platform/definitions/user_types.js.
-- No additional columns needed on user_details.
