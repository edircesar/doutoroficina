<?php
header('Content-Type: application/json');
require_once '../includes/db.php';

session_start();
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

$tipo_veiculo = $data['vehicle_type'] ?? 'carro';
$marca = $data['brand'] ?? '';
$modelo = $data['model'] ?? '';
$ano = $data['year'] ?? '';
$km = $data['km'] ?? '';
$titulo = $data['title'] ?? '';
$descricao = $data['text'] ?? '';
$categoria = $data['category'] ?? '';

$stmt = $pdo->prepare("INSERT INTO reclamacoes (usuario_id, tipo_veiculo, marca, modelo, ano, km, titulo, descricao, categoria, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'aberto')");
if ($stmt->execute([$_SESSION['user_id'], $tipo_veiculo, $marca, $modelo, $ano, $km, $titulo, $descricao, $categoria])) {
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['error' => 'Erro ao salvar reclamação.']);
}
?>
