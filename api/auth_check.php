<?php
session_start();
if (isset($_SESSION['user_id'])) {
    echo json_encode(['user' => [
        'id' => $_SESSION['user_id'], 
        'name' => $_SESSION['user_name'], 
        'email' => $_SESSION['user_email']
    ]]);
} else {
    echo json_encode(['user' => null]);
}
?>
