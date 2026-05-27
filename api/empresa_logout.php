<?php
// api/empresa_logout.php
// Encerra sessão da empresa

header('Content-Type: application/json');
session_start();

// Limpar dados da sessão de empresa
unset(
    $_SESSION['empresa_id'],
    $_SESSION['empresa_cnpj'],
    $_SESSION['empresa_nome'],
    $_SESSION['empresa_status'],
    $_SESSION['empresa_selo']
);

echo json_encode([
    'success' => true,
    'message' => 'Logout realizado com sucesso.'
], JSON_UNESCAPED_UNICODE);
?>
