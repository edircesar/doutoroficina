<?php
// includes/cnpj_validator.php
// Validação e consulta de CNPJ via API externa

/**
 * Remove formatação do CNPJ, mantendo apenas dígitos.
 */
function cleanCnpj($cnpj) {
    return preg_replace('/[^0-9]/', '', $cnpj);
}

/**
 * Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX.
 */
function formatCnpj($cnpj) {
    $cnpj = cleanCnpj($cnpj);
    if (strlen($cnpj) !== 14) {
        return $cnpj;
    }
    return substr($cnpj, 0, 2) . '.' .
           substr($cnpj, 2, 3) . '.' .
           substr($cnpj, 5, 3) . '/' .
           substr($cnpj, 8, 4) . '-' .
           substr($cnpj, 12, 2);
}

/**
 * Valida o formato e os dígitos verificadores do CNPJ.
 * Retorna true se o CNPJ é matematicamente válido.
 */
function validateCnpjFormat($cnpj) {
    $cnpj = cleanCnpj($cnpj);
    
    if (strlen($cnpj) !== 14) {
        return false;
    }
    
    // Rejeitar CNPJs com todos os dígitos iguais
    if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
        return false;
    }
    
    // Validar primeiro dígito verificador
    $sum = 0;
    $weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for ($i = 0; $i < 12; $i++) {
        $sum += intval($cnpj[$i]) * $weights1[$i];
    }
    $remainder = $sum % 11;
    $digit1 = ($remainder < 2) ? 0 : 11 - $remainder;
    
    if (intval($cnpj[12]) !== $digit1) {
        return false;
    }
    
    // Validar segundo dígito verificador
    $sum = 0;
    $weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    for ($i = 0; $i < 13; $i++) {
        $sum += intval($cnpj[$i]) * $weights2[$i];
    }
    $remainder = $sum % 11;
    $digit2 = ($remainder < 2) ? 0 : 11 - $remainder;
    
    if (intval($cnpj[13]) !== $digit2) {
        return false;
    }
    
    return true;
}

/**
 * Consulta CNPJ na BrasilAPI (primária) com fallback para ReceitaWS.
 * Retorna array com dados da empresa ou null em caso de erro.
 */
function consultCnpjApi($cnpj) {
    $cnpj = cleanCnpj($cnpj);
    
    // Tentar BrasilAPI primeiro
    $result = consultBrasilApi($cnpj);
    if ($result !== null) {
        return $result;
    }
    
    // Fallback para ReceitaWS
    $result = consultReceitaWs($cnpj);
    return $result;
}

/**
 * Consulta BrasilAPI.
 */
function consultBrasilApi($cnpj) {
    $url = "https://brasilapi.com.br/api/cnpj/v1/{$cnpj}";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: DoutorOficina/1.0\r\n",
            'timeout' => 10,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
        return null;
    }
    
    // Verificar se retornou erro
    if (isset($data['status']) && $data['status'] >= 400) {
        return null;
    }
    
    // Normalizar resposta da BrasilAPI
    return [
        'source' => 'brasilapi',
        'cnpj' => $cnpj,
        'razao_social' => $data['razao_social'] ?? '',
        'nome_fantasia' => $data['nome_fantasia'] ?? '',
        'situacao_cadastral' => mapSituacaoBrasilApi($data['descricao_situacao_cadastral'] ?? ''),
        'descricao_situacao' => $data['descricao_situacao_cadastral'] ?? '',
        'cnae_principal' => ($data['cnae_fiscal'] ?? '') . ' - ' . ($data['cnae_fiscal_descricao'] ?? ''),
        'data_abertura' => $data['data_inicio_atividade'] ?? '',
        'logradouro' => $data['logradouro'] ?? '',
        'numero' => $data['numero'] ?? '',
        'complemento' => $data['complemento'] ?? '',
        'bairro' => $data['bairro'] ?? '',
        'municipio' => $data['municipio'] ?? '',
        'uf' => $data['uf'] ?? '',
        'cep' => $data['cep'] ?? '',
        'raw' => $data
    ];
}

/**
 * Mapeia situação cadastral da BrasilAPI.
 */
function mapSituacaoBrasilApi($descricao) {
    $descricao = mb_strtoupper(trim($descricao));
    if (strpos($descricao, 'ATIVA') !== false) return 'ATIVA';
    if (strpos($descricao, 'BAIXADA') !== false) return 'BAIXADA';
    if (strpos($descricao, 'INAPTA') !== false) return 'INAPTA';
    if (strpos($descricao, 'SUSPENSA') !== false) return 'SUSPENSA';
    if (strpos($descricao, 'NULA') !== false) return 'NULA';
    return $descricao;
}

/**
 * Consulta ReceitaWS (fallback).
 */
function consultReceitaWs($cnpj) {
    $url = "https://www.receitaws.com.br/v1/cnpj/{$cnpj}";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: DoutorOficina/1.0\r\n",
            'timeout' => 15,
            'ignore_errors' => true
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true
        ]
    ]);
    
    $response = @file_get_contents($url, false, $context);
    
    if ($response === false) {
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (json_last_error() !== JSON_ERROR_NONE || empty($data)) {
        return null;
    }
    
    if (isset($data['status']) && $data['status'] === 'ERROR') {
        return null;
    }
    
    // Normalizar resposta da ReceitaWS
    return [
        'source' => 'receitaws',
        'cnpj' => $cnpj,
        'razao_social' => $data['nome'] ?? '',
        'nome_fantasia' => $data['fantasia'] ?? '',
        'situacao_cadastral' => mb_strtoupper($data['situacao'] ?? ''),
        'descricao_situacao' => $data['situacao'] ?? '',
        'cnae_principal' => ($data['atividade_principal'][0]['code'] ?? '') . ' - ' . ($data['atividade_principal'][0]['text'] ?? ''),
        'data_abertura' => $data['abertura'] ?? '',
        'logradouro' => $data['logradouro'] ?? '',
        'numero' => $data['numero'] ?? '',
        'complemento' => $data['complemento'] ?? '',
        'bairro' => $data['bairro'] ?? '',
        'municipio' => $data['municipio'] ?? '',
        'uf' => $data['uf'] ?? '',
        'cep' => $data['cep'] ?? '',
        'raw' => $data
    ];
}

/**
 * Verifica se a situação cadastral é ATIVA.
 */
function isCnpjActive($apiResponse) {
    if ($apiResponse === null) {
        return false;
    }
    return $apiResponse['situacao_cadastral'] === 'ATIVA';
}

/**
 * Calcula a idade da empresa em anos a partir da data de abertura.
 */
function getCompanyAgeYears($dataAbertura) {
    if (empty($dataAbertura)) {
        return 0;
    }
    try {
        // Tentar formato dd/mm/yyyy (ReceitaWS)
        $date = DateTime::createFromFormat('d/m/Y', $dataAbertura);
        if (!$date) {
            // Tentar formato yyyy-mm-dd (BrasilAPI)
            $date = new DateTime($dataAbertura);
        }
        $now = new DateTime();
        $diff = $now->diff($date);
        return $diff->y;
    } catch (Exception $e) {
        return 0;
    }
}
?>
