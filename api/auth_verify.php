<?php
require_once '../includes/db.php';

$token = $_GET['token'] ?? '';

if (empty($token)) {
    header("Location: ../?error=token_invalido");
    exit;
}

$stmt = $pdo->prepare("SELECT id FROM usuarios WHERE token_verificacao = ? AND status = 'pendente'");
$stmt->execute([$token]);
$user = $stmt->fetch();

if ($user) {
    $stmt = $pdo->prepare("UPDATE usuarios SET status = 'ativo', token_verificacao = NULL WHERE id = ?");
    $stmt->execute([$user['id']]);
    
    header("Location: ../?verified=1");
    exit;
} else {
    header("Location: ../?error=token_invalido_ou_ja_ativo");
    exit;
}
?>
