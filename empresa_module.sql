-- ============================================
-- MÓDULO DE VERIFICAÇÃO DE EMPRESAS
-- Doutor Oficina
-- ============================================

-- Adicionar flag de admin na tabela de usuários
ALTER TABLE `usuarios` ADD COLUMN `is_admin` TINYINT(1) DEFAULT 0;

-- ============================================
-- TABELA: empresas
-- ============================================
CREATE TABLE IF NOT EXISTS `empresas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NULL,
  `razao_social` VARCHAR(255) NOT NULL,
  `nome_fantasia` VARCHAR(255) NOT NULL,
  `cnpj` VARCHAR(18) NOT NULL UNIQUE,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `telefone` VARCHAR(20) NOT NULL,
  `senha` VARCHAR(255) NOT NULL,
  `site` VARCHAR(255) DEFAULT NULL,
  `responsavel_nome` VARCHAR(150) NOT NULL,
  `responsavel_cargo` VARCHAR(100) NOT NULL,
  `status_verificacao` ENUM('PENDENTE','CNPJ_VALIDADO','DOCUMENTOS_ENVIADOS','VERIFICADA','REJEITADA') DEFAULT 'PENDENTE',
  `selo_verificado` TINYINT(1) DEFAULT 0,
  `score_confianca` INT DEFAULT 0,
  `api_response_json` JSON DEFAULT NULL,
  `dominio_match` TINYINT(1) DEFAULT 0,
  `email_generico` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: empresa_documentos
-- ============================================
CREATE TABLE IF NOT EXISTS `empresa_documentos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `empresa_id` INT NOT NULL,
  `tipo_documento` ENUM('cnpj_card','documento_responsavel','selfie') NOT NULL,
  `arquivo` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: empresa_logs_verificacao
-- ============================================
CREATE TABLE IF NOT EXISTS `empresa_logs_verificacao` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `empresa_id` INT NOT NULL,
  `acao` VARCHAR(100) NOT NULL,
  `detalhes` TEXT DEFAULT NULL,
  `ip` VARCHAR(45) DEFAULT NULL,
  `admin_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`empresa_id`) REFERENCES `empresas`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `usuarios`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABELA: rate_limits (para controle de taxa)
-- ============================================
CREATE TABLE IF NOT EXISTS `rate_limits` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip` VARCHAR(45) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_rate_limits_lookup` (`ip`, `action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
