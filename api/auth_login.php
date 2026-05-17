<?php
header('Content-Type: application/json');
require_once '../includes/db.php';

session_start();

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$senha = $data['senha'] ?? '';

if (empty($email) || empty($senha)) {
    echo json_encode(['error' => 'Preencha todos os campos.']);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && password_verify($senha, $user['senha'])) {
    if ($user['status'] !== 'ativo') {
        echo json_encode(['error' => 'Sua conta ainda não foi ativada. Verifique seu e-mail para ativar.']);
        exit;
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['nome'];
    $_SESSION['user_email'] = $user['email'];
    
    echo json_encode([
        'success' => true, 
        'user' => [
            'id' => $user['id'],
            'name' => $user['nome'],
            'email' => $user['email'],
            'creditos' => $user['creditos']
        ]
    ]);
} else {
    echo json_encode(['error' => 'E-mail ou senha incorretos.']);
}
?>
