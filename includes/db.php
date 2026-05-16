<?php
// includes/db.php
$host = 'localhost'; // Geralmente localhost na Hostinger
$db   = 'u861144328_reclamacoes';
$user = 'u861144328_aksander';
$pass = 'Aksander@2026';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Em produção, não mostramos o erro detalhado
     die(json_encode(["error" => "Erro ao conectar com o banco de dados."]));
}
?>
