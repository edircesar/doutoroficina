<?php
// includes/security.php
// Funções de segurança centralizadas para o módulo de empresas

/**
 * Gera um token CSRF e armazena na sessão.
 */
function generateCsrfToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Valida o token CSRF recebido.
 */
function validateCsrfToken($token) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['csrf_token']) || empty($token)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Regenera o token CSRF (após uso bem-sucedido).
 */
function regenerateCsrfToken() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf_token'];
}

/**
 * Verifica rate limit por IP e ação.
 * Retorna true se a ação é permitida, false se excedeu o limite.
 */
function checkRateLimit($pdo, $action, $maxAttempts = 10, $windowSeconds = 3600) {
    $ip = getClientIp();
    
    // Limpar registros antigos
    $stmt = $pdo->prepare("DELETE FROM rate_limits WHERE action = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? SECOND)");
    $stmt->execute([$action, $windowSeconds]);
    
    // Contar tentativas recentes
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM rate_limits WHERE ip = ? AND action = ? AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)");
    $stmt->execute([$ip, $action, $windowSeconds]);
    $result = $stmt->fetch();
    
    if ($result['total'] >= $maxAttempts) {
        return false;
    }
    
    // Registrar tentativa
    $stmt = $pdo->prepare("INSERT INTO rate_limits (ip, action) VALUES (?, ?)");
    $stmt->execute([$ip, $action]);
    
    return true;
}

/**
 * Sanitiza uma string de input.
 */
function sanitizeInput($input) {
    if (is_array($input)) {
        return array_map('sanitizeInput', $input);
    }
    $input = trim($input);
    $input = stripslashes($input);
    $input = htmlspecialchars($input, ENT_QUOTES, 'UTF-8');
    return $input;
}

/**
 * Obtém o IP real do cliente.
 */
function getClientIp() {
    $headers = ['HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_FORWARDED', 'HTTP_FORWARDED_FOR', 'HTTP_FORWARDED', 'REMOTE_ADDR'];
    foreach ($headers as $header) {
        if (!empty($_SERVER[$header])) {
            $ip = explode(',', $_SERVER[$header])[0];
            $ip = trim($ip);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

/**
 * Registra uma ação no log de verificação.
 */
function logVerificacao($pdo, $empresaId, $acao, $detalhes = null, $adminId = null) {
    $ip = getClientIp();
    $stmt = $pdo->prepare("INSERT INTO empresa_logs_verificacao (empresa_id, acao, detalhes, ip, admin_id) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$empresaId, $acao, $detalhes, $ip, $adminId]);
}

/**
 * Verifica se o usuário logado é admin.
 */
function isAdmin($pdo) {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (empty($_SESSION['user_id'])) {
        return false;
    }
    $stmt = $pdo->prepare("SELECT is_admin FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();
    return $user && $user['is_admin'] == 1;
}

/**
 * Retorna resposta JSON padronizada de erro e encerra.
 */
function jsonError($message, $validationErrors = null, $httpCode = 400) {
    http_response_code($httpCode);
    $response = ['success' => false, 'error' => $message];
    if ($validationErrors) {
        $response['validation_errors'] = $validationErrors;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Retorna resposta JSON padronizada de sucesso e encerra.
 */
function jsonSuccess($message, $data = null, $verificationStatus = null) {
    $response = ['success' => true, 'message' => $message];
    if ($data !== null) {
        $response['data'] = $data;
    }
    if ($verificationStatus !== null) {
        $response['verification_status'] = $verificationStatus;
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Valida formato de telefone brasileiro.
 */
function validatePhone($phone) {
    $clean = preg_replace('/[^0-9]/', '', $phone);
    return strlen($clean) >= 10 && strlen($clean) <= 11;
}

/**
 * Valida formato de email.
 */
function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Verifica se o email usa domínio genérico (gmail, hotmail, etc).
 */
function isGenericEmail($email) {
    $genericDomains = [
        'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
        'hotmail.com.br', 'live.com', 'msn.com', 'aol.com', 'icloud.com',
        'protonmail.com', 'mail.com', 'zoho.com', 'uol.com.br', 'bol.com.br',
        'terra.com.br', 'ig.com.br', 'globo.com', 'r7.com'
    ];
    $domain = strtolower(substr(strrchr($email, "@"), 1));
    return in_array($domain, $genericDomains);
}

/**
 * Compara o domínio do email com o domínio do site.
 */
function checkDomainMatch($email, $site) {
    if (empty($site)) {
        return false;
    }
    $emailDomain = strtolower(substr(strrchr($email, "@"), 1));
    $siteDomain = strtolower(preg_replace('#^https?://(www\.)?#', '', rtrim($site, '/')));
    $siteDomain = explode('/', $siteDomain)[0];
    
    return $emailDomain === $siteDomain;
}
?>
