<?php
// api/admin_empresa_logs.php
// Histórico de logs de verificação de uma empresa (requer admin)

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';
require_once '../includes/upload_handler.php';

session_start();

// Verificar admin
if (!isAdmin($pdo)) {
    jsonError('Acesso negado. Apenas administradores.', null, 403);
}

$empresaId = intval($_GET['empresa_id'] ?? 0);

if (empty($empresaId)) {
    jsonError('Informe o ID da empresa.');
}

// Verificar se empresa existe
$stmt = $pdo->prepare("SELECT id, razao_social, nome_fantasia, cnpj FROM empresas WHERE id = ?");
$stmt->execute([$empresaId]);
$empresa = $stmt->fetch();

if (!$empresa) {
    jsonError('Empresa não encontrada.', null, 404);
}

// Buscar logs
$stmt = $pdo->prepare("
    SELECT 
        l.id, l.acao, l.detalhes, l.ip, l.created_at,
        u.nome as admin_nome
    FROM empresa_logs_verificacao l
    LEFT JOIN usuarios u ON l.admin_id = u.id
    WHERE l.empresa_id = ?
    ORDER BY l.created_at DESC
    LIMIT 100
");
$stmt->execute([$empresaId]);
$logs = $stmt->fetchAll();

// Buscar documentos
$documentos = getEmpresaDocumentos($pdo, $empresaId);

echo json_encode([
    'success' => true,
    'data' => [
        'empresa' => $empresa,
        'logs' => $logs,
        'documentos' => $documentos
    ]
], JSON_UNESCAPED_UNICODE);
?>
