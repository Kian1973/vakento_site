-- Vakento contacten database
-- MySQL / MariaDB

CREATE TABLE IF NOT EXISTS vakento_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  entity_type ENUM('bedrijf','particulier') NOT NULL DEFAULT 'bedrijf',
  contact_type ENUM('klant','leverancier') NOT NULL DEFAULT 'klant',
  customer_number VARCHAR(40) NULL,
  company_name VARCHAR(160) NOT NULL,
  contact_person VARCHAR(160) NULL,
  email VARCHAR(190) NULL,
  invoice_email VARCHAR(190) NULL,
  phone VARCHAR(50) NULL,
  address VARCHAR(190) NULL,
  postal_code VARCHAR(20) NULL,
  city VARCHAR(120) NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'Nederland',
  kvk_number VARCHAR(32) NULL,
  vat_number VARCHAR(40) NULL,
  oin VARCHAR(50) NULL,
  payment_term_days SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contacts_user (user_id),
  KEY idx_contacts_user_type (user_id, contact_type),
  KEY idx_contacts_user_name (user_id, company_name),
  KEY idx_contacts_user_email (user_id, email),
  KEY idx_contacts_user_customer_number (user_id, customer_number),
  UNIQUE KEY uq_contacts_user_customer_number (user_id, customer_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
