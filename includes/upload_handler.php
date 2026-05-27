<?php
// includes/upload_handler.php
// Upload seguro de documentos de empresas

define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB
define('UPLOAD_BASE_DIR', __DIR__ . '/../uploads/empresas');

/**
 * Tipos MIME permitidos por tipo de documento.
 */
function getAllowedMimes() {
    return [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg'
    ];
}

/**
 * Extensões permitidas.
 */
function getAllowedExtensions() {
    return ['pdf', 'jpg', 'jpeg', 'png'];
}

/**
 * Mapeia tipo de documento para subdiretório.
 */
function getUploadSubdir($tipoDocumento) {
    $map = [
        'cnpj_card' => 'cnpj',
        'documento_responsavel' => 'documentos',
        'selfie' => 'selfies'
    ];
    return $map[$tipoDocumento] ?? 'outros';
}

/**
 * Cria diretórios de upload se não existirem.
 */
function ensureUploadDirs() {
    $dirs = [
        UPLOAD_BASE_DIR,
        UPLOAD_BASE_DIR . '/cnpj',
        UPLOAD_BASE_DIR . '/documentos',
        UPLOAD_BASE_DIR . '/selfies'
    ];
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
}

/**
 * Processa upload de um arquivo.
 * 
 * @param array $file       $_FILES['campo']
 * @param string $tipoDoc   Tipo: cnpj_card, documento_responsavel, selfie
 * @param int $empresaId    ID da empresa
 * @param PDO $pdo          Conexão PDO
 * @return array             ['success' => bool, 'path' => string, 'error' => string]
 */
function handleUpload($file, $tipoDoc, $empresaId, $pdo) {
    // Verificar se upload foi feito
    if (!isset($file) || $file['error'] === UPLOAD_ERR_NO_FILE) {
        return ['success' => false, 'error' => "Arquivo de {$tipoDoc} é obrigatório."];
    }
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'Arquivo excede o tamanho máximo do servidor.',
            UPLOAD_ERR_FORM_SIZE => 'Arquivo excede o tamanho máximo do formulário.',
            UPLOAD_ERR_PARTIAL => 'Upload incompleto.',
            UPLOAD_ERR_NO_TMP_DIR => 'Diretório temporário não encontrado.',
            UPLOAD_ERR_CANT_WRITE => 'Erro ao gravar arquivo.',
            UPLOAD_ERR_EXTENSION => 'Upload bloqueado por extensão.'
        ];
        $errorMsg = $errors[$file['error']] ?? 'Erro desconhecido no upload.';
        return ['success' => false, 'error' => $errorMsg];
    }
    
    // Verificar tamanho
    if ($file['size'] > UPLOAD_MAX_SIZE) {
        return ['success' => false, 'error' => "Arquivo excede o limite de 5MB."];
    }
    
    // Verificar tipo MIME real (usando finfo)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);
    
    if (!in_array($mimeType, getAllowedMimes())) {
        return ['success' => false, 'error' => "Tipo de arquivo não permitido ({$mimeType}). Use PDF, JPG ou PNG."];
    }
    
    // Verificar extensão
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, getAllowedExtensions())) {
        return ['success' => false, 'error' => "Extensão .{$extension} não permitida. Use .pdf, .jpg, .jpeg ou .png."];
    }
    
    // Gerar nome único
    $uniqueName = bin2hex(random_bytes(16)) . '_' . time() . '.' . $extension;
    
    // Garantir diretórios
    ensureUploadDirs();
    
    // Caminho de destino
    $subdir = getUploadSubdir($tipoDoc);
    $destPath = UPLOAD_BASE_DIR . '/' . $subdir . '/' . $uniqueName;
    $relativePath = 'uploads/empresas/' . $subdir . '/' . $uniqueName;
    
    // Mover arquivo
    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        return ['success' => false, 'error' => 'Erro ao salvar arquivo no servidor.'];
    }
    
    // Registrar no banco
    $stmt = $pdo->prepare("INSERT INTO empresa_documentos (empresa_id, tipo_documento, arquivo) VALUES (?, ?, ?)");
    $stmt->execute([$empresaId, $tipoDoc, $relativePath]);
    
    return ['success' => true, 'path' => $relativePath];
}

/**
 * Processa todos os uploads de uma vez.
 * 
 * @param array $files       $_FILES
 * @param int $empresaId     ID da empresa
 * @param PDO $pdo           Conexão PDO
 * @return array             ['success' => bool, 'errors' => array]
 */
function handleAllUploads($files, $empresaId, $pdo) {
    $required = [
        'doc_cnpj' => 'cnpj_card',
        'doc_responsavel' => 'documento_responsavel',
        'doc_selfie' => 'selfie'
    ];
    
    $errors = [];
    $uploaded = [];
    
    foreach ($required as $fieldName => $tipoDoc) {
        if (!isset($files[$fieldName])) {
            $errors[$fieldName] = "Arquivo de {$tipoDoc} é obrigatório.";
            continue;
        }
        
        $result = handleUpload($files[$fieldName], $tipoDoc, $empresaId, $pdo);
        
        if (!$result['success']) {
            $errors[$fieldName] = $result['error'];
        } else {
            $uploaded[$fieldName] = $result['path'];
        }
    }
    
    if (!empty($errors)) {
        return ['success' => false, 'errors' => $errors];
    }
    
    return ['success' => true, 'uploaded' => $uploaded];
}

/**
 * Obtém documentos de uma empresa.
 */
function getEmpresaDocumentos($pdo, $empresaId) {
    $stmt = $pdo->prepare("SELECT * FROM empresa_documentos WHERE empresa_id = ? ORDER BY created_at DESC");
    $stmt->execute([$empresaId]);
    return $stmt->fetchAll();
}
?>
