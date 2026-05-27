<?php
// api/empresa_check.php
// Verifica sessão ativa de empresa

header('Content-Type: application/json');
session_start();

if (isset($_SESSION['empresa_id'])) {
    require_once '../includes/db.php';
    require_once '../includes/security.php';
    
    // Buscar dados atualizados da empresa
    $stmt = $pdo->prepare("SELECT id, razao_social, nome_fantasia, cnpj, email, status_verificacao, selo_verificado, score_confianca FROM empresas WHERE id = ?");
    $stmt->execute([$_SESSION['empresa_id']]);
    $empresa = $stmt->fetch();
    
    if ($empresa) {
        // Atualizar sessão com dados frescos
        $_SESSION['empresa_status'] = $empresa['status_verificacao'];
        $_SESSION['empresa_selo'] = $empresa['selo_verificado'];
        
        echo json_encode([
            'success' => true,
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
            'csrf_token' => generateCsrfToken()
        ], JSON_UNESCAPED_UNICODE);
    } else {
        // Empresa não existe mais, limpar sessão
        unset($_SESSION['empresa_id'], $_SESSION['empresa_cnpj'], $_SESSION['empresa_nome'], $_SESSION['empresa_status'], $_SESSION['empresa_selo']);
        echo json_encode(['success' => false, 'empresa' => null]);
    }
} else {
    echo json_encode(['success' => false, 'empresa' => null]);
}
?>
