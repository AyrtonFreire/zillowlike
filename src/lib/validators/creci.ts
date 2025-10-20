/**
 * Validação Avançada de CRECI - 100% Gratuito
 * Baseado em regras públicas conhecidas
 */

interface CRECIValidation {
  valid: boolean;
  message?: string;
  warnings?: string[];
}

// Regras conhecidas por estado (informação pública)
const CRECI_RULES: Record<string, { minDigits: number; maxDigits: number }> = {
  SP: { minDigits: 4, maxDigits: 6 },
  RJ: { minDigits: 4, maxDigits: 6 },
  MG: { minDigits: 4, maxDigits: 6 },
  BA: { minDigits: 4, maxDigits: 6 },
  PE: { minDigits: 4, maxDigits: 6 },
  RS: { minDigits: 4, maxDigits: 6 },
  PR: { minDigits: 4, maxDigits: 6 },
  SC: { minDigits: 4, maxDigits: 6 },
  // Outros estados seguem padrão similar
};

/**
 * Valida formato básico do CRECI
 */
export function validateCRECIFormat(creci: string): boolean {
  // Formato aceito: 4-6 dígitos, opcionalmente seguido de -F (física) ou -J (jurídica)
  const creciRegex = /^\d{4,6}(-[FJ])?$/i;
  return creciRegex.test(creci);
}

/**
 * Valida CRECI com regras específicas do estado
 */
export function validateCRECI(creci: string, state: string): CRECIValidation {
  const warnings: string[] = [];

  // Remove espaços
  creci = creci.trim().toUpperCase();
  state = state.trim().toUpperCase();

  // Validação básica de formato
  if (!validateCRECIFormat(creci)) {
    return {
      valid: false,
      message: 'Formato inválido. Use: 12345 ou 12345-F',
    };
  }

  // Extrai número e sufixo
  const match = creci.match(/^(\d{4,6})(-[FJ])?$/i);
  if (!match) {
    return { valid: false, message: 'Formato inválido' };
  }

  const number = match[1];
  const suffix = match[2];

  // Verifica regras do estado
  const stateRules = CRECI_RULES[state];
  if (stateRules) {
    const numDigits = number.length;
    
    if (numDigits < stateRules.minDigits || numDigits > stateRules.maxDigits) {
      return {
        valid: false,
        message: `CRECI do ${state} deve ter entre ${stateRules.minDigits} e ${stateRules.maxDigits} dígitos`,
      };
    }
  }

  // Avisos (não impedem aprovação, mas alertam)
  if (!suffix) {
    warnings.push('CRECI sem sufixo -F ou -J. Verifique se é pessoa física ou jurídica.');
  }

  if (parseInt(number) < 1000) {
    warnings.push('Número muito baixo. CRECIs antigos podem estar inativos.');
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Formata CRECI para exibição
 */
export function formatCRECI(creci: string, state: string): string {
  creci = creci.trim().toUpperCase();
  state = state.trim().toUpperCase();
  return `${creci}/${state}`;
}

/**
 * Verifica se CRECI está próximo de expirar
 */
export function checkCRECIExpiry(expiryDate: Date): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysUntilExpiry: number;
} {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isExpired: diffDays < 0,
    isExpiringSoon: diffDays >= 0 && diffDays <= 90, // 3 meses
    daysUntilExpiry: diffDays,
  };
}

/**
 * Lista de CRECIs conhecidos como inválidos (pode ser expandida)
 */
const KNOWN_INVALID_CRECIS = new Set([
  '0000',
  '1111',
  '9999',
  '12345', // Exemplo comum de teste
]);

/**
 * Verifica se CRECI está em lista de inválidos conhecidos
 */
export function isKnownInvalidCRECI(creci: string): boolean {
  const number = creci.replace(/[^\d]/g, '');
  return KNOWN_INVALID_CRECIS.has(number);
}
