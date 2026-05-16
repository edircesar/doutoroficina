<?php
header('Content-Type: application/json');
require_once '../includes/db.php';

session_start();

$data = json_decode(file_get_contents('php://input'), true);
$nome = trim($data['nome'] ?? '');
$email = trim($data['email'] ?? '');
$senha = $data['senha'] ?? '';

if (empty($nome) || empty($email) || empty($senha)) {
    echo json_encode(['error' => 'Preencha todos os campos.']);
    exit;
}

if (strlen($senha) < 6) {
    echo json_encode(['error' => 'Senha deve ter no mínimo 6 caracteres.']);
    exit;
}

// Verifica se já existe
$stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    echo json_encode(['error' => 'E-mail já cadastrado.']);
    exit;
}

$hash = password_hash($senha, PASSWORD_DEFAULT);

$stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, creditos) VALUES (?, ?, ?, 0)");
if ($stmt->execute([$nome, $email, $hash])) {
    $userId = $pdo->lastInsertId();
    
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $nome;
    $_SESSION['user_email'] = $email;

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $userId,
            'name' => $nome,
            'email' => $email,
            'creditos' => 0
        ]
    ]);
} else {
    echo json_encode(['error' => 'Erro ao criar conta.']);
}
?>
