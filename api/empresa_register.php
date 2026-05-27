<?php
// api/empresa_register.php
// Cadastro completo de empresa com validação de CNPJ e upload de documentos

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';
require_once '../includes/cnpj_validator.php';
require_once '../includes/upload_handler.php';
require_once '../includes/score_calculator.php';

session_start();

// Apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método não permitido.', null, 405);
}

// Validar CSRF
$csrfToken = $_POST['csrf_token'] ?? $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!validateCsrfToken($csrfToken)) {
    jsonError('Token de segurança inválido. Recarregue a página.', null, 403);
}

// Rate limit: 5 cadastros por IP por hora
if (!checkRateLimit($pdo, 'empresa_register', 5, 3600)) {
    jsonError('Muitas tentativas. Aguarde antes de tentar novamente.', null, 429);
}

// Coletar e sanitizar dados
$razaoSocial = sanitizeInput($_POST['razao_social'] ?? '');
$nomeFantasia = sanitizeInput($_POST['nome_fantasia'] ?? '');
$cnpj = $_POST['cnpj'] ?? '';
$email = trim($_POST['email'] ?? '');
$telefone = sanitizeInput($_POST['telefone'] ?? '');
$senha = $_POST['senha'] ?? '';
$senhaConfirm = $_POST['senha_confirm'] ?? '';
$site = sanitizeInput($_POST['site'] ?? '');
$responsavelNome = sanitizeInput($_POST['responsavel_nome'] ?? '');
$responsavelCargo = sanitizeInput($_POST['responsavel_cargo'] ?? '');

// ============================================
// VALIDAÇÕES
// ============================================
$validationErrors = [];

// Campos obrigatórios
if (empty($razaoSocial)) $validationErrors['razao_social'] = 'Razão social é obrigatória.';
if (empty($nomeFantasia)) $validationErrors['nome_fantasia'] = 'Nome fantasia é obrigatório.';
if (empty($cnpj)) $validationErrors['cnpj'] = 'CNPJ é obrigatório.';
if (empty($email)) $validationErrors['email'] = 'Email é obrigatório.';
if (empty($telefone)) $validationErrors['telefone'] = 'Telefone é obrigatório.';
if (empty($senha)) $validationErrors['senha'] = 'Senha é obrigatória.';
if (empty($responsavelNome)) $validationErrors['responsavel_nome'] = 'Nome do responsável é obrigatório.';
if (empty($responsavelCargo)) $validationErrors['responsavel_cargo'] = 'Cargo do responsável é obrigatório.';

// Validar senha
if (!empty($senha)) {
    if (strlen($senha) < 8) {
        $validationErrors['senha'] = 'Senha deve ter no mínimo 8 caracteres.';
    } elseif ($senha !== $senhaConfirm) {
        $validationErrors['senha_confirm'] = 'As senhas não conferem.';
    }
}

// Validar email
if (!empty($email) && !validateEmail($email)) {
    $validationErrors['email'] = 'Email inválido.';
}

// Validar telefone
if (!empty($telefone) && !validatePhone($telefone)) {
    $validationErrors['telefone'] = 'Telefone inválido. Use DDD + número.';
}

// Validar formato CNPJ
$cnpjClean = cleanCnpj($cnpj);
if (!empty($cnpj) && !validateCnpjFormat($cnpjClean)) {
    $validationErrors['cnpj'] = 'CNPJ inválido. Verifique os dígitos.';
}

// Retornar se houver erros de validação básica
if (!empty($validationErrors)) {
    jsonError('Corrija os erros abaixo.', $validationErrors);
}

// ============================================
// VERIFICAR DUPLICATAS
// ============================================
$cnpjFormatted = formatCnpj($cnpjClean);

$stmt = $pdo->prepare("SELECT id FROM empresas WHERE cnpj = ?");
$stmt->execute([$cnpjFormatted]);
if ($stmt->fetch()) {
    jsonError('Este CNPJ já está cadastrado na plataforma.', ['cnpj' => 'CNPJ já cadastrado.']);
}

$stmt = $pdo->prepare("SELECT id FROM empresas WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonError('Este email já está cadastrado.', ['email' => 'Email já cadastrado.']);
}

// ============================================
// CONSULTA API CNPJ
// ============================================
$apiResponse = consultCnpjApi($cnpjClean);

if ($apiResponse === null) {
    jsonError('Não foi possível verificar o CNPJ. Tente novamente em alguns minutos.', ['cnpj' => 'Erro na consulta do CNPJ.']);
}

if (!isCnpjActive($apiResponse)) {
    $situacao = $apiResponse['descricao_situacao'] ?? 'desconhecida';
    jsonError(
        "CNPJ não está ativo na Receita Federal.",
        ['cnpj' => "Situação cadastral: {$situacao}. Apenas empresas com situação ATIVA podem se cadastrar."]
    );
}

// ============================================
// VERIFICAR DOMÍNIO DO EMAIL
// ============================================
$dominioMatch = checkDomainMatch($email, $site) ? 1 : 0;
$emailGenerico = isGenericEmail($email) ? 1 : 0;

// ============================================
// CRIAR EMPRESA
// ============================================
$senhaHash = password_hash($senha, PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();
    
    $stmt = $pdo->prepare("
        INSERT INTO empresas 
        (razao_social, nome_fantasia, cnpj, email, telefone, senha, site, 
         responsavel_nome, responsavel_cargo, status_verificacao, 
         api_response_json, dominio_match, email_generico)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CNPJ_VALIDADO', ?, ?, ?)
    ");
    
    $stmt->execute([
        $razaoSocial,
        $nomeFantasia,
        $cnpjFormatted,
        $email,
        $telefone,
        $senhaHash,
        $site ?: null,
        $responsavelNome,
        $responsavelCargo,
        json_encode($apiResponse, JSON_UNESCAPED_UNICODE),
        $dominioMatch,
        $emailGenerico
    ]);
    
    $empresaId = $pdo->lastInsertId();
    
    // Log de cadastro
    logVerificacao($pdo, $empresaId, 'CADASTRO', 'Empresa cadastrada e CNPJ validado via API.');
    
    // ============================================
    // PROCESSAR UPLOADS
    // ============================================
    $uploadResult = handleAllUploads($_FILES, $empresaId, $pdo);
    
    if (!$uploadResult['success']) {
        $pdo->rollBack();
        jsonError('Erro no upload de documentos.', $uploadResult['errors']);
    }
    
    // Atualizar status para DOCUMENTOS_ENVIADOS
    $stmt = $pdo->prepare("UPDATE empresas SET status_verificacao = 'DOCUMENTOS_ENVIADOS' WHERE id = ?");
    $stmt->execute([$empresaId]);
    
    logVerificacao($pdo, $empresaId, 'DOCUMENTOS_ENVIADOS', 'Todos os documentos foram enviados.');
    
    // Calcular score inicial
    $score = calculateScore($pdo, $empresaId);
    
    $pdo->commit();
    
    // Regenerar CSRF
    regenerateCsrfToken();
    
    jsonSuccess(
        'Empresa cadastrada com sucesso! Seus documentos serão analisados pela nossa equipe.',
        [
            'empresa_id' => $empresaId,
            'score' => $score,
            'dominio_match' => $dominioMatch,
            'email_generico' => $emailGenerico
        ],
        'DOCUMENTOS_ENVIADOS'
    );
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError('Erro interno ao cadastrar empresa. Tente novamente.');
}
?>
