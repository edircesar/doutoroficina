<?php
// includes/score_calculator.php
// Cálculo automático do score de confiança da empresa

require_once __DIR__ . '/cnpj_validator.php';

/**
 * Calcula e atualiza o score de confiança de uma empresa.
 * 
 * Critérios:
 *  - CNPJ ativo via API: +25 pontos
 *  - Domínio corporativo (email = site): +20 pontos
 *  - Empresa com mais de 5 anos: +15 pontos
 *  - Empresa com mais de 2 anos: +10 pontos
 *  - Cartão CNPJ enviado: +10 pontos
 *  - Documento do responsável enviado: +10 pontos
 *  - Selfie com documento enviada: +10 pontos
 *  - Análise manual aprovada: +10 pontos
 *  Total máximo: 100 pontos (5+ anos) ou 95 pontos (2-5 anos)
 * 
 * @param PDO $pdo
 * @param int $empresaId
 * @return int Score calculado
 */
function calculateScore($pdo, $empresaId) {
    $stmt = $pdo->prepare("SELECT * FROM empresas WHERE id = ?");
    $stmt->execute([$empresaId]);
    $empresa = $stmt->fetch();
    
    if (!$empresa) {
        return 0;
    }
    
    $score = 0;
    
    // 1. CNPJ ativo via API (+25)
    $apiData = $empresa['api_response_json'];
    if ($apiData) {
        if (is_string($apiData)) {
            $apiData = json_decode($apiData, true);
        }
        if (isset($apiData['situacao_cadastral']) && $apiData['situacao_cadastral'] === 'ATIVA') {
            $score += 25;
        }
    }
    
    // 2. Domínio corporativo (+20)
    if ($empresa['dominio_match'] == 1) {
        $score += 20;
    }
    
    // 3. Tempo de empresa
    if ($apiData && !empty($apiData['data_abertura'])) {
        $years = getCompanyAgeYears($apiData['data_abertura']);
        if ($years >= 5) {
            $score += 15; // +15 para mais de 5 anos
        } elseif ($years >= 2) {
            $score += 10; // +10 para mais de 2 anos
        }
    }
    
    // 4. Documentos enviados
    $stmt = $pdo->prepare("SELECT tipo_documento FROM empresa_documentos WHERE empresa_id = ?");
    $stmt->execute([$empresaId]);
    $docs = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    if (in_array('cnpj_card', $docs)) {
        $score += 10; // Cartão CNPJ
    }
    if (in_array('documento_responsavel', $docs)) {
        $score += 10; // Documento do responsável
    }
    if (in_array('selfie', $docs)) {
        $score += 10; // Selfie
    }
    
    // 5. Análise manual aprovada (+10)
    if ($empresa['status_verificacao'] === 'VERIFICADA') {
        $score += 10;
    }
    
    // Limitar a 100
    $score = min($score, 100);
    
    // Atualizar no banco
    $stmt = $pdo->prepare("UPDATE empresas SET score_confianca = ? WHERE id = ?");
    $stmt->execute([$score, $empresaId]);
    
    return $score;
}

/**
 * Retorna label textual para o score.
 */
function getScoreLabel($score) {
    if ($score >= 80) return 'Excelente';
    if ($score >= 60) return 'Bom';
    if ($score >= 40) return 'Regular';
    if ($score >= 20) return 'Baixo';
    return 'Muito Baixo';
}

/**
 * Retorna cor CSS para o score.
 */
function getScoreColor($score) {
    if ($score >= 80) return '#00c853';
    if ($score >= 60) return '#00a878';
    if ($score >= 40) return '#ffc107';
    if ($score >= 20) return '#ff9800';
    return '#f44336';
}
?>
