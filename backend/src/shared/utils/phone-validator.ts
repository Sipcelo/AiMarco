/**
 * Phone Validator Utility (shared layer)
 *
 * Centraliza a lógica de validação de telefone brasileiro.
 * Formato E.164: +55DDNNNNNNNNN
 */

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46,
  47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64,
  65, 66, 67,
  68, 69,
  71, 73, 74, 75, 76, 77, 79,
  81, 82, 83, 84, 85, 86, 87,
  88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

/**
 * Extrai apenas os dígitos de uma string
 */
function digitsOnly(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * Normaliza para E.164: aceita varios formatos e retorna +55DDNNNNNNNNN
 */
export function normalizeBRPhone(input: string): string | null {
  if (!input) return null;

  const digits = digitsOnly(input);

  // Se começa com 55 (sem +), remova o 55
  let numberPart;
  if (digits.startsWith('55')) {
    numberPart = digits.substring(2);
  } else {
    numberPart = digits;
  }

  // numberPart deve ter 10 ou 11 dígitos (DDD + número)
  if (numberPart.length < 10 || numberPart.length > 11) {
    return null;
  }

  const ddd = parseInt(numberPart.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) {
    return null;
  }

  const num = numberPart.slice(2);
  const isMobile = num.length === 9 && num.startsWith('9');
  const isLandline = num.length === 8 && num[0] >= '2' && num[0] <= '5';

  if (!isMobile && !isLandline) {
    return null;
  }

  return `+55${numberPart}`;
}

/**
 * Valida se está no formato E.164 correto
 */
export function validateE164(e164: string): boolean {
  if (!e164.startsWith('+55')) return false;
  const rest = e164.slice(3);
  if (rest.length < 10 || rest.length > 11) return false;

  const ddd = parseInt(rest.slice(0, 2), 10);
  if (!VALID_DDDS.has(ddd)) return false;

  const num = rest.slice(2);
  const isMobile = num.length === 9 && num.startsWith('9');
  const isLandline = num.length === 8 && num[0] >= '2' && num[0] <= '5';

  return isMobile || isLandline;
}

/**
 * Formata E.164 para máscara visual
 */
export function formatBRPhone(e164: string): string | null {
  if (!validateE164(e164)) return null;
  const rest = e164.slice(3);
  const ddd = rest.slice(0, 2);
  const num = rest.slice(2);

  if (num.length === 9) {
    return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  } else {
    return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  }
}

/**
 * Resultado completo da validação
 */
export interface PhoneValidationResult {
  valid: boolean;
  raw: string;
  formatted?: string;
  e164?: string;
  error?: string;
}

/**
 * Validação completa em uma chamada
 */
export function validateBRPhone(raw: string): PhoneValidationResult {
  const normalized = normalizeBRPhone(raw);

  if (!normalized) {
    return {
      valid: false,
      raw,
      error: 'Número de telefone inválido. Use o formato brasileiro com DDD.',
    };
  }

  const formatted = formatBRPhone(normalized);
  if (!formatted) {
    return {
      valid: false,
      raw,
      error: 'Formato de número não reconhecido.',
    };
  }

  return {
    valid: true,
    raw,
    formatted,
    e164: normalized,
  };
}
