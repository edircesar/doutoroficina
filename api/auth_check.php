<?php
session_start();
if (isset($_SESSION['user_id'])) {
    echo json_encode(['user' => [
        'id' => $_SESSION['user_id'], 
        'name' => $_SESSION['user_name'], 
        'email' => $_SESSION['user_email'],
        'is_admin' => isset($_SESSION['is_admin']) ? (int) $_SESSION['is_admin'] : 0
    ]]);
} else {
    echo json_encode(['user' => null]);
}
?>
