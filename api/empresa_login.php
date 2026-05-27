<?php
// api/empresa_login.php
// Login de empresa com CNPJ + senha

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';
require_once '../includes/cnpj_validator.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método não permitido.', null, 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$cnpj = $data['cnpj'] ?? '';
$senha = $data['senha'] ?? '';
$csrfToken = $data['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';

// Validar CSRF
if (!validateCsrfToken($csrfToken)) {
    jsonError('Token de segurança inválido.', null, 403);
}

// Rate limit: 10 tentativas por IP por 15 minutos
if (!checkRateLimit($pdo, 'empresa_login', 10, 900)) {
    jsonError('Muitas tentativas de login. Aguarde 15 minutos.', null, 429);
}

if (empty($cnpj) || empty($senha)) {
    jsonError('CNPJ e senha são obrigatórios.');
}

// Limpar e formatar CNPJ
$cnpjClean = cleanCnpj($cnpj);
$cnpjFormatted = formatCnpj($cnpjClean);

// Buscar empresa
$stmt = $pdo->prepare("SELECT * FROM empresas WHERE cnpj = ?");
$stmt->execute([$cnpjFormatted]);
$empresa = $stmt->fetch();

if (!$empresa || !password_verify($senha, $empresa['senha'])) {
    jsonError('CNPJ ou senha incorretos.');
}

// Verificar se empresa foi rejeitada
if ($empresa['status_verificacao'] === 'REJEITADA') {
    jsonError('Esta empresa foi rejeitada. Entre em contato com o suporte.');
}

// Criar sessão da empresa
$_SESSION['empresa_id'] = $empresa['id'];
$_SESSION['empresa_cnpj'] = $empresa['cnpj'];
$_SESSION['empresa_nome'] = $empresa['nome_fantasia'];
$_SESSION['empresa_status'] = $empresa['status_verificacao'];
$_SESSION['empresa_selo'] = $empresa['selo_verificado'];

// Log de login
logVerificacao($pdo, $empresa['id'], 'LOGIN', 'Login realizado com sucesso.');

// Regenerar CSRF
$newToken = regenerateCsrfToken();

jsonSuccess('Login realizado com sucesso.', [
    'empresa' => [
        'id' => $empresa['id'],
        'razao_social' => $empresa['razao_social'],
        'nome_fantasia' => $empresa['nome_fantasia'],
        'cnpj' => $empresa['cnpj'],
        'email' => $empresa['email'],
        'status_verificacao' => $empresa['status_verificacao'],
        'selo_verificado' => (bool) $empresa['selo_verificado'],
        'score_confianca' => $empresa['score_confianca']
    ],
    'csrf_token' => $newToken
], $empresa['status_verificacao']);
?>
