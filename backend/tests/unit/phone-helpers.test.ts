/**
 * Testes adicionais — Phone Helper Functions (cobertura extra)
 */

import { describe, it, expect } from 'vitest';
import {
  cleanPhone,
  getPhoneNumber,
  getAreaCode,
  isMobilePhone,
  isLandlinePhone,
} from '../../src/validators/phone.js';

describe('Phone Helpers', () => {

  describe('cleanPhone', () => {
    it('deve remover todos os não-dígitos', () => {
      expect(cleanPhone('(11) 99999-9999')).toBe('11999999999');
      expect(cleanPhone('+55 11 99999-9999')).toBe('5511999999999');
      expect(cleanPhone('11-9999-9999')).toBe('1199999999'); // 2+4+4=10 dígitos
    });
  });

  describe('getAreaCode', () => {
    it('deve extrair DDD de +5511999999999', () => {
      expect(getAreaCode('+5511999999999')).toBe('11');
    });
    it('deve extrair DDD de 11999999999', () => {
      expect(getAreaCode('11999999999')).toBe('11');
    });
  });

  describe('getPhoneNumber', () => {
    it('deve extrair número sem DDD de +5511999999999', () => {
      expect(getPhoneNumber('+5511999999999')).toBe('999999999');
    });
  });

  describe('isMobilePhone', () => {
    it('deve identificar celular +5511999999999', () => {
      expect(isMobilePhone('+5511999999999')).toBe(true);
    });
    it('deve identificar fixo +551133334444 como não celular', () => {
      expect(isMobilePhone('+551133334444')).toBe(false);
    });
  });

  describe('isLandlinePhone', () => {
    it('deve identificar fixo +551133334444', () => {
      expect(isLandlinePhone('+551133334444')).toBe(true);
    });
    it('deve identificar celular +5511999999999 como não fixo', () => {
      expect(isLandlinePhone('+5511999999999')).toBe(false);
    });
  });

});
