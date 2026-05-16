<?php
header('Content-Type: application/json');
require_once '../includes/db.php';

try {
    $stmt = $pdo->query("
        SELECT r.*, u.nome as usuario_nome 
        FROM reclamacoes r 
        JOIN usuarios u ON r.usuario_id = u.id 
        ORDER BY r.created_at DESC
    ");
    $complaints = $stmt->fetchAll();
    
    echo json_encode($complaints);
} catch (PDOException $e) {
    echo json_encode(["error" => "Erro ao buscar reclamações: " . $e->getMessage()]);
}
?>
