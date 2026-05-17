<?php
header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/mail.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

if (empty($email)) {
    echo json_encode(['error' => 'Preencha o e-mail.']);
    exit;
}

$stmt = $pdo->prepare("SELECT id, nome FROM usuarios WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $token = bin2hex(random_bytes(16));
    $expiracao = date('Y-m-d H:i:s', strtotime('+1 hour'));
    
    $stmt = $pdo->prepare("INSERT INTO recuperacao_senha (usuario_id, token, expiracao) VALUES (?, ?, ?)");
    $stmt->execute([$user['id'], $token, $expiracao]);
    
    // Envia e-mail
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $link = "$protocol://$host/?reset_token=$token";
    
    $subject = "Recuperação de Senha - Doutor Oficina";
    $body = "<h1>Olá, {$user['nome']}!</h1>
             <p>Você solicitou a recuperação de senha.</p>
             <p>Clique no link abaixo para criar uma nova senha (válido por 1 hora):</p>
             <p><a href='$link' style='padding:10px 20px;background:#00a878;color:white;text-decoration:none;border-radius:5px;'>Resetar Senha</a></p>
             <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
             <p>$link</p>";
    
    sendMail($email, $subject, $body);
}

// Sempre retornamos sucesso para evitar que descubram e-mails cadastrados
echo json_encode([
    'success' => true,
    'message' => 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.'
]);
?>
