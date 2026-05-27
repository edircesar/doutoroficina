<?php
// api/cnpj_consulta.php
// Endpoint auxiliar para consulta de CNPJ em tempo real (usado no front)

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';
require_once '../includes/cnpj_validator.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Método não permitido.', null, 405);
}

// Rate limit: 10 consultas por IP por minuto
if (!checkRateLimit($pdo, 'cnpj_consulta', 10, 60)) {
    jsonError('Muitas consultas. Aguarde um momento.', null, 429);
}

$cnpj = $_GET['cnpj'] ?? '';

if (empty($cnpj)) {
    jsonError('CNPJ é obrigatório.');
}

$cnpjClean = cleanCnpj($cnpj);

// Validar formato
if (!validateCnpjFormat($cnpjClean)) {
    jsonError('CNPJ inválido.', ['cnpj' => 'Verifique os dígitos do CNPJ.']);
}

// Verificar se já está cadastrado
$cnpjFormatted = formatCnpj($cnpjClean);
$stmt = $pdo->prepare("SELECT id, nome_fantasia, status_verificacao FROM empresas WHERE cnpj = ?");
$stmt->execute([$cnpjFormatted]);
$existente = $stmt->fetch();

if ($existente) {
    jsonError('Este CNPJ já está cadastrado na plataforma.', [
        'cnpj' => 'CNPJ já cadastrado.',
        'empresa_existente' => $existente['nome_fantasia']
    ]);
}

// Consultar API
$apiResponse = consultCnpjApi($cnpjClean);

if ($apiResponse === null) {
    jsonError('Não foi possível consultar o CNPJ. Tente novamente.');
}

if (!isCnpjActive($apiResponse)) {
    jsonError(
        'CNPJ não está ativo.',
        ['cnpj' => 'Situação: ' . ($apiResponse['descricao_situacao'] ?? 'Não disponível')]
    );
}

// Calcular idade
$idade = getCompanyAgeYears($apiResponse['data_abertura']);

jsonSuccess('CNPJ válido e ativo.', [
    'razao_social' => $apiResponse['razao_social'],
    'nome_fantasia' => $apiResponse['nome_fantasia'],
    'situacao' => $apiResponse['situacao_cadastral'],
    'cnae' => $apiResponse['cnae_principal'],
    'data_abertura' => $apiResponse['data_abertura'],
    'idade_anos' => $idade,
    'endereco' => [
        'logradouro' => $apiResponse['logradouro'],
        'numero' => $apiResponse['numero'],
        'complemento' => $apiResponse['complemento'],
        'bairro' => $apiResponse['bairro'],
        'municipio' => $apiResponse['municipio'],
        'uf' => $apiResponse['uf'],
        'cep' => $apiResponse['cep']
    ]
]);
?>
