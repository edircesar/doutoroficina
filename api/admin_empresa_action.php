<?php
// api/admin_empresa_action.php
// Aprovar ou rejeitar empresa (requer admin)

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';
require_once '../includes/score_calculator.php';

session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método não permitido.', null, 405);
}

// Verificar admin
if (!isAdmin($pdo)) {
    jsonError('Acesso negado. Apenas administradores.', null, 403);
}

$data = json_decode(file_get_contents('php://input'), true);
$empresaId = intval($data['empresa_id'] ?? 0);
$acao = $data['acao'] ?? '';
$motivo = sanitizeInput($data['motivo'] ?? '');

if (empty($empresaId) || !in_array($acao, ['aprovar', 'rejeitar'])) {
    jsonError('Dados inválidos. Informe empresa_id e ação (aprovar/rejeitar).');
}

// Buscar empresa
$stmt = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
$stmt->execute([$empresaId]);
$empresa = $stmt->fetch();

if (!$empresa) {
    jsonError('Empresa não encontrada.', null, 404);
}

try {
    $pdo->beginTransaction();
    
    $adminId = $_SESSION['user_id'];
    
    if ($acao === 'aprovar') {
        // Aprovar empresa
        $stmt = $pdo->prepare("UPDATE empresas SET status_verificacao = 'VERIFICADA', selo_verificado = 1 WHERE id = ?");
        $stmt->execute([$empresaId]);
        
        logVerificacao($pdo, $empresaId, 'APROVADA', "Empresa aprovada pelo admin #{$adminId}. " . ($motivo ?: ''), $adminId);
        
        // Recalcular score (agora inclui +10 da aprovação manual)
        $score = calculateScore($pdo, $empresaId);
        
        $pdo->commit();
        
        jsonSuccess('Empresa aprovada com sucesso. Selo de verificação ativado.', [
            'empresa_id' => $empresaId,
            'status' => 'VERIFICADA',
            'selo' => true,
            'score' => $score
        ], 'VERIFICADA');
        
    } else {
        // Rejeitar empresa
        if (empty($motivo)) {
            $pdo->rollBack();
            jsonError('Informe o motivo da rejeição.');
        }
        
        $stmt = $pdo->prepare("UPDATE empresas SET status_verificacao = 'REJEITADA', selo_verificado = 0 WHERE id = ?");
        $stmt->execute([$empresaId]);
        
        logVerificacao($pdo, $empresaId, 'REJEITADA', "Rejeitada pelo admin #{$adminId}. Motivo: {$motivo}", $adminId);
        
        // Recalcular score
        $score = calculateScore($pdo, $empresaId);
        
        $pdo->commit();
        
        jsonSuccess('Empresa rejeitada.', [
            'empresa_id' => $empresaId,
            'status' => 'REJEITADA',
            'selo' => false,
            'score' => $score
        ], 'REJEITADA');
    }
    
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError('Erro ao processar ação.');
}
?>
