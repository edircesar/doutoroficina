CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nome` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `senha` VARCHAR(255) NOT NULL,
  `creditos` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reclamacoes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `tipo_veiculo` VARCHAR(50) NOT NULL,
  `marca` VARCHAR(100) NOT NULL,
  `modelo` VARCHAR(100) NOT NULL,
  `ano` VARCHAR(20) NOT NULL,
  `km` VARCHAR(50),
  `titulo` VARCHAR(255) NOT NULL,
  `descricao` TEXT NOT NULL,
  `categoria` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'aberto',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Novas colunas para validação de e-mail
ALTER TABLE `usuarios` ADD COLUMN `status` VARCHAR(20) DEFAULT 'pendente';
ALTER TABLE `usuarios` ADD COLUMN `token_verificacao` VARCHAR(100) DEFAULT NULL;

-- Tabela para recuperação de senha
CREATE TABLE IF NOT EXISTS `recuperacao_senha` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `token` VARCHAR(100) NOT NULL,
  `expiracao` DATETIME NOT NULL,
  FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
