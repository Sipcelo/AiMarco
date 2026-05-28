/**
 * Testes Unitários — Phone Validator (B3)
 *
 * Validação E.164 brasileira:
 * - +55 + DDD (11-99) + número (9 dígitos celular / 8 fixo)
 * - Máscara visual: (11) 99999-9999 ou (11) 3333-4444
 *
 * Regras em pt-BR (planejamento_marcaai.md):
 * - Celular: 9 dígitos, começa com 9
 * - Fixo: 8 dígitos, começa com 2-5
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBRPhone,
  validateE164,
  formatBRPhone,
  validateBRPhone,
} from '../../src/shared/utils/phone-validator.js';

describe('Phone Validator — Validação BR', () => {

  // =================== NORMALIZAÇÃO ===================

  describe('normalizeBRPhone', () => {
    it('deve normalizar (11) 99999-9999 → +5511999999999', () => {
      expect(normalizeBRPhone('(11) 99999-9999')).toBe('+5511999999999');
    });

    it('deve normalizar 11999999999 → +5511999999999', () => {
      expect(normalizeBRPhone('11999999999')).toBe('+5511999999999');
    });

    it('deve normalizar +55 11 99999-9999 → +5511999999999', () => {
      expect(normalizeBRPhone('+55 11 99999-9999')).toBe('+5511999999999');
    });

    it('deve retornar null para número muito curto', () => {
      expect(normalizeBRPhone('111')).toBeNull();
    });

    it('deve retornar null para número muito longo', () => {
      expect(normalizeBRPhone('119999999999')).toBeNull(); // 12 dígitos
    });

    it('deve retornar null para string vazia', () => {
      expect(normalizeBRPhone('')).toBeNull();
    });
  });

  // =================== VALIDAÇÃO E.164 ===================

  describe('validateE164', () => {
    it('deve aceitar +5511999999999 (celular SP)', () => {
      expect(validateE164('+5511999999999')).toBe(true);
    });

    it('deve rejeitar +551199999999 (apenas 10 dígitos)', () => {
      expect(validateE164('+551199999999')).toBe(false);
    });

    it('deve rejeitar +55113333333333 (muitos dígitos)', () => {
      expect(validateE164('+55113333333333')).toBe(false);
    });

    it('deve rejeitar DDD inválido (ex: +5500)', () => {
      expect(validateE164('+5500123456789')).toBe(false);
    });

    it('deve rejeitar fixo que não começa com 2-5', () => {
      expect(validateE164('+5511999999999')).toBe(true); // ok, celular
      expect(validateE164('+5511111111111')).toBe(false); // fixo começa com 1? inválido
    });

    it('deve rejeitar sem +55', () => {
      expect(validateE164('5511999999999')).toBe(false);
    });
  });

  // =================== FORMATAÇÃO ===================

  describe('formatBRPhone', () => {
    it('deve formatar celular: +5511999999999 → (11) 99999-9999', () => {
      expect(formatBRPhone('+5511999999999')).toBe('(11) 99999-9999');
    });

    it('deve formatar fixo: +551133334444 → (11) 3333-4444', () => {
      expect(formatBRPhone('+551133334444')).toBe('(11) 3333-4444');
    });

    it('deve retornar null para E.164 inválido', () => {
      expect(formatBRPhone('+5511')).toBeNull();
    });

    it('deve retornar null sem +55', () => {
      expect(formatBRPhone('11999999999')).toBeNull();
    });
  });

  // =================== VALIDAÇÃO COMPLETA ===================

  describe('validateBRPhone (função completa)', () => {
    it('deve validar celular SP e retornar resultado completo', () => {
      const result = validateBRPhone('(11) 99999-9999');

      expect(result.valid).toBe(true);
      expect(result.raw).toBe('(11) 99999-9999');
      expect(result.e164).toBe('+5511999999999');
      expect(result.formatted).toBe('(11) 99999-9999');
    });

    it('deve validar fixo RJ sem máscara', () => {
      const result = validateBRPhone('2133334444');

      expect(result.valid).toBe(true);
      expect(result.e164).toBe('+552133334444');
      expect(result.formatted).toBe('(21) 3333-4444');
    });

    it('deve retornar erro para DDD inexistente', () => {
      const result = validateBRPhone('(00) 99999-9999');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('DDD');
    });

    it('deve retornar erro para número com 7 dígitos', () => {
      const result = validateBRPhone('119999999');

      expect(result.valid).toBe(false);
    });

    it('deve retornar erro para string vazia', () => {
      const result = validateBRPhone('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

});
