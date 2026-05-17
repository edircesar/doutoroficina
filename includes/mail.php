<?php
// includes/mail.php

function sendMail($to, $subject, $body) {
    // Por padrão, em hospedagens como a Hostinger, a função mail() do PHP
    // já envia e-mails usando o servidor local configurado.
    // Se por acaso não funcionar, precisaremos subir a biblioteca PHPMailer
    // para usar a senha que você passou.
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= 'From: Doutor Oficina <contato@doutoroficina.app.br>' . "\r\n";

    return mail($to, $subject, $body, $headers);
}
?>
