<?php
// api/admin_empresas_list.php
// Lista empresas para painel administrativo

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';

session_start();

// Verificar se é admin
if (!isAdmin($pdo)) {
    jsonError('Acesso negado. Apenas administradores.', null, 403);
}

$status = $_GET['status'] ?? '';
$page = max(1, intval($_GET['page'] ?? 1));
$perPage = 20;
$offset = ($page - 1) * $perPage;

// Query base
$where = "1=1";
$params = [];

if (!empty($status) && in_array($status, ['PENDENTE','CNPJ_VALIDADO','DOCUMENTOS_ENVIADOS','VERIFICADA','REJEITADA'])) {
    $where .= " AND e.status_verificacao = ?";
    $params[] = $status;
}

// Contar total
$countSql = "SELECT COUNT(*) as total FROM empresas e WHERE {$where}";
$stmt = $pdo->prepare($countSql);
$stmt->execute($params);
$total = $stmt->fetch()['total'];

// Buscar empresas
$sql = "
    SELECT 
        e.id, e.razao_social, e.nome_fantasia, e.cnpj, e.email, e.telefone,
        e.site, e.responsavel_nome, e.responsavel_cargo,
        e.status_verificacao, e.selo_verificado, e.score_confianca,
        e.dominio_match, e.email_generico, e.api_response_json,
        e.created_at, e.updated_at,
        (SELECT COUNT(*) FROM empresa_documentos WHERE empresa_id = e.id) as total_docs
    FROM empresas e
    WHERE {$where}
    ORDER BY 
        CASE e.status_verificacao 
            WHEN 'DOCUMENTOS_ENVIADOS' THEN 1
            WHEN 'CNPJ_VALIDADO' THEN 2
            WHEN 'PENDENTE' THEN 3
            WHEN 'VERIFICADA' THEN 4
            WHEN 'REJEITADA' THEN 5
        END,
        e.created_at DESC
    LIMIT {$perPage} OFFSET {$offset}
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$empresas = $stmt->fetchAll();

// Decodificar JSON da API para cada empresa
foreach ($empresas as &$empresa) {
    if ($empresa['api_response_json']) {
        $apiData = json_decode($empresa['api_response_json'], true);
        $empresa['api_data'] = [
            'razao_social' => $apiData['razao_social'] ?? '',
            'situacao' => $apiData['situacao_cadastral'] ?? '',
            'cnae' => $apiData['cnae_principal'] ?? '',
            'data_abertura' => $apiData['data_abertura'] ?? '',
            'municipio' => $apiData['municipio'] ?? '',
            'uf' => $apiData['uf'] ?? ''
        ];
        unset($empresa['api_response_json']); // Não enviar JSON bruto
    }
}
unset($empresa);

echo json_encode([
    'success' => true,
    'data' => [
        'empresas' => $empresas,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage)
        ]
    ]
], JSON_UNESCAPED_UNICODE);
?>
