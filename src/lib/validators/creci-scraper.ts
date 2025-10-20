/**
 * Web Scraping dos sites públicos dos CRECIs
 * ATENÇÃO: Pode quebrar se os sites mudarem
 * Use apenas como validação adicional, não como única fonte
 */

interface CRECIPublicData {
  isActive: boolean;
  name?: string;
  expiryDate?: string;
  status?: string;
  source: string;
}

// URLs públicas de consulta (exemplos - verificar se ainda funcionam)
const CRECI_URLS: Record<string, string> = {
  SP: 'https://www.crecisp.gov.br/consulta-de-credenciados',
  RJ: 'https://www.creci-rj.gov.br/consulta',
  // Adicionar outros estados
};

/**
 * Consulta CRECI no site público (se disponível)
 * GRATUITO mas pode quebrar
 */
export async function checkCRECIPublicDatabase(
  creci: string,
  state: string
): Promise<CRECIPublicData | null> {
  try {
    // IMPORTANTE: Isso precisa rodar no backend (não no browser)
    // devido a CORS e políticas de segurança
    
    const url = CRECI_URLS[state];
    if (!url) {
      return null; // Estado não tem consulta pública conhecida
    }

    // TODO: Implementar scraping específico para cada estado
    // Cada site tem estrutura diferente
    
    // Por enquanto, retorna null (não implementado)
    return null;
  } catch (error) {
    console.error('Erro ao consultar CRECI público:', error);
    return null;
  }
}

/**
 * Verifica se CRECI está em lista pública de suspensos/cassados
 * Alguns CRECIs publicam essas listas
 */
export async function checkCRECIBlacklist(
  creci: string,
  state: string
): Promise<{ isBlacklisted: boolean; reason?: string }> {
  try {
    // TODO: Implementar consulta a listas públicas de suspensos
    // Exemplo: CRECI-SP publica lista de suspensos em PDF
    
    return { isBlacklisted: false };
  } catch (error) {
    return { isBlacklisted: false };
  }
}
