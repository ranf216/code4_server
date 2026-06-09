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

-- --------------------------------------------------
-- V 4.1.0 — Settings: data_item table + seed data
-- --------------------------------------------------

CREATE TABLE IF NOT EXISTS `data_item` (
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
