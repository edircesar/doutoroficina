<?php
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/mail.php';

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
$token = bin2hex(random_bytes(16));

$stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, creditos, status, token_verificacao) VALUES (?, ?, ?, 0, 'pendente', ?)");
if ($stmt->execute([$nome, $email, $hash, $token])) {
    
    // Envia e-mail
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $link = "$protocol://$host/api/auth_verify.php?token=$token";
    
    $subject = "Confirme seu cadastro - Doutor Oficina";
    $body = "<h1>Olá, $nome!</h1>
             <p>Obrigado por se cadastrar no Doutor Oficina.</p>
             <p>Para que seu cadastro seja válido e você possa logar, clique no link abaixo para ativar sua conta:</p>
             <p><a href='$link' style='padding:10px 20px;background:#00a878;color:white;text-decoration:none;border-radius:5px;'>Ativar Minha Conta</a></p>
             <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
             <p>$link</p>";
    
    sendMail($email, $subject, $body);

    echo json_encode([
        'success' => true,
        'message' => 'Cadastro realizado com sucesso! Verifique seu e-mail para ativar sua conta.'
    ]);
} else {
    echo json_encode(['error' => 'Erro ao criar conta.']);
}
?>
