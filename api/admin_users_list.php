<?php
// api/admin_users_list.php
// Lista usuários para o painel administrativo (requer admin)

header('Content-Type: application/json');
require_once '../includes/db.php';
require_once '../includes/security.php';

session_start();

// Verificar se é admin
if (!isAdmin($pdo)) {
    jsonError('Acesso negado. Apenas administradores.', null, 403);
}

try {
    // Buscar todos os usuários ordenados pela data de criação mais recente
    $stmt = $pdo->query("
        SELECT id, nome, email, creditos, status, is_admin, created_at 
        FROM usuarios 
        ORDER BY created_at DESC
    ");
    $users = $stmt->fetchAll();
    
    jsonSuccess('Usuários carregados com sucesso.', [
        'users' => $users,
        'total' => count($users)
    ]);
} catch (PDOException $e) {
    jsonError('Erro ao buscar usuários: ' . $e->getMessage());
}
?>
