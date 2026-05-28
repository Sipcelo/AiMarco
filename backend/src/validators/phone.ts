import { z } from "zod";

const VALID_AREA_CODES = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46,
  47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64,
  65, 66, 67, 68, 69,
  71, 73, 74, 75, 76, 77, 79,
  81, 82, 83, 84, 85, 86, 87,
  88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99
]);

/**
 * Brazilian Phone Schema — Validação robusta e normalização para E.164
 *
 * Aceita entradas em vários formatos:
 *   "+55 11 99999-9999"
 *   "5511999999999"
 *   "(11) 99999-9999"
 *   "11999999999"
 *
 * Retorna sempre: "+55DDNNNNNNNNN"
 */
export const BrazilianPhoneSchema = z.string()
  .trim()
  .superRefine((val, ctx) => {
    // Extrair apenas dígitos
    const digits = val.replace(/\D/g, '');

    if (digits.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Número de telefone é obrigatório.',
      });
      return;
    }

    // Remover código do país se presente (55)
    const numberPart = digits.startsWith('55') ? digits.substring(2) : digits;

    // Após remover country code, deve ter 10 ou 11 dígitos (DDD + número)
    if (numberPart.length < 10 || numberPart.length > 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Número inválido. Deve conter DDD (2 dígitos) e 8 ou 9 dígitos.',
      });
      return;
    }

    const ddd = parseInt(numberPart.slice(0, 2), 10);
    if (!VALID_AREA_CODES.has(ddd)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DDD (código de área) inválido.',
      });
      return;
    }

    const num = numberPart.slice(2);
    const isMobile = num.length === 9 && num.startsWith('9');
    const isLandline = num.length === 8 && num[0] >= '2' && num[0] <= '5';

    if (!isMobile && !isLandline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Número inválido. Celular: 9XXXXXXXX (9 dígitos). Fixo: 2-5XXXXXXX (8 dígitos).',
      });
      return;
    }
  })
  .transform((val) => {
    // Retornar sempre em formato E.164: +55DDNNNNNNNNN
    const digits = val.replace(/\D/g, '');
    const numberPart = digits.startsWith('55') ? digits.substring(2) : digits;
    return `+55${numberPart}`;
  });

/**
 * Type inference
 */
export type BrazilianPhone = z.infer<typeof BrazilianPhoneSchema>;

/**
 * Format phone for display with visual mask
 */
export function formatPhoneForDisplay(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  // Se tem +55, remove para obter só número nacional
  const national = digitsOnly.startsWith('55') ? digitsOnly.substring(2) : digitsOnly;

  if (national.length === 11) {
    // Celular: (DD) 9XXXX-XXXX
    return `(${national.substring(0, 2)}) ${national.substring(2, 7)}-${national.substring(7)}`;
  }

  if (national.length === 10) {
    // Fixo: (DD) XXXX-XXXX
    return `(${national.substring(0, 2)}) ${national.substring(2, 6)}-${national.substring(6)}`;
  }

  return phone;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function getPhoneNumber(phone: string): string {
  const digits = cleanPhone(phone);
  const national = digits.startsWith('55') ? digits.substring(2) : digits;
  return national.substring(2);
}

export function getAreaCode(phone: string): string {
  const digits = cleanPhone(phone);
  const national = digits.startsWith('55') ? digits.substring(2) : digits;
  return national.substring(0, 2);
}

export function isMobilePhone(phone: string): boolean {
  const digits = cleanPhone(phone);
  const national = digits.startsWith('55') ? digits.substring(2) : digits;
  const num = national.substring(2);
  return num[0] === '9';
}

export function isLandlinePhone(phone: string): boolean {
  const digits = cleanPhone(phone);
  const national = digits.startsWith('55') ? digits.substring(2) : digits;
  const num = national.substring(2);
  return num[0] >= '2' && num[0] <= '5';
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
  const cleaned = raw.replace(/\D/g, '');

  if (!cleaned) {
    return { valid: false, raw, error: 'Número de telefone obrigatório.' };
  }

  // Deve ter 10 ou 11 dígitos (com DDD, sem país)
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { valid: false, raw, error: 'Número de telefone inválido. Verifique o DDD e os dígitos.' };
  }

  const ddd = parseInt(cleaned.substring(0, 2), 10);
  if (!VALID_AREA_CODES.has(ddd)) {
    return { valid: false, raw, error: 'DDD (código de área) inválido.' };
  }

  const numberPart = cleaned.substring(2);
  const isMobile = numberPart.length === 9 && numberPart.startsWith('9');
  const isLandline = numberPart.length === 8 && numberPart[0] >= '2' && numberPart[0] <= '5';

  if (!isMobile && !isLandline) {
    return {
      valid: false,
      raw,
      error: 'Número inválido. Celular: 9XXXXXXXX (9 dígitos). Fixo: 2-5XXXXXXX (8 dígitos).'
    };
  }

  const e164 = `+55${cleaned}`;
  const formatted = formatPhoneForDisplay(e164);

  return {
    valid: true,
    raw,
    e164,
    formatted,
  };
}
