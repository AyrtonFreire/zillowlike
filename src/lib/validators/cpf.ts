/**
 * Validação de CPF - 100% Gratuito
 * Usa algoritmo matemático oficial
 */

/**
 * Valida CPF usando o algoritmo oficial
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '');

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;
  if (digit1 !== parseInt(cpf.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;
  if (digit2 !== parseInt(cpf.charAt(10))) return false;

  return true;
}

/**
 * Formata CPF: 12345678901 → 123.456.789-01
 */
export function formatCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, '');
  if (cpf.length <= 11) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

/**
 * Valida e retorna mensagem de erro
 */
export function validateCPFWithMessage(cpf: string): { valid: boolean; message?: string } {
  if (!cpf) {
    return { valid: false, message: 'CPF é obrigatório' };
  }

  const cleaned = cpf.replace(/[^\d]/g, '');

  if (cleaned.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' };
  }

  if (/^(\d)\1{10}$/.test(cleaned)) {
    return { valid: false, message: 'CPF inválido (dígitos repetidos)' };
  }

  if (!validateCPF(cleaned)) {
    return { valid: false, message: 'CPF inválido' };
  }

  return { valid: true };
}
