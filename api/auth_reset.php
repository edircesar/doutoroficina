<?php
header('Content-Type: application/json');
require_once '../includes/db.php';

$data = json_decode(file_get_contents('php://input'), true);
$token = $data['token'] ?? '';
$nova_senha = $data['senha'] ?? '';

if (empty($token) || empty($nova_senha)) {
    echo json_encode(['error' => 'Preencha todos os campos.']);
    exit;
}

if (strlen($nova_senha) < 6) {
    echo json_encode(['error' => 'Senha deve ter no mínimo 6 caracteres.']);
    exit;
}

// Verifica se o token é válido e não expirou
$stmt = $pdo->prepare("
    SELECT id, usuario_id 
    FROM recuperacao_senha 
    WHERE token = ? AND expiracao > NOW()
");
$stmt->execute([$token]);
$reset = $stmt->fetch();

if ($reset) {
    $hash = password_hash($nova_senha, PASSWORD_DEFAULT);
    
    // Atualiza a senha do usuário
    $stmt = $pdo->prepare("UPDATE usuarios SET senha = ? WHERE id = ?");
    $stmt->execute([$hash, $reset['usuario_id']]);
    
    // Deleta o token para não ser usado de novo
    $stmt = $pdo->prepare("DELETE FROM recuperacao_senha WHERE id = ?");
    $stmt->execute([$reset['id']]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Senha alterada com sucesso! Você já pode fazer login.'
    ]);
} else {
    echo json_encode(['error' => 'Token inválido ou expirado.']);
}
?>
