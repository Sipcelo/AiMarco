/**
 * Testes Unitários — Schemas Zod (Validação de Input)
 *
 * Regra de ouro: TODOS os request bodies passam por Zod.
 * Mensagens de erro SEMPRE em pt-BR.
 */

import { describe, it, expect } from 'vitest';
import {
  AppointmentCreateSchema,
  RescheduleRequestSchema,
  ServiceCreateSchema,
  ServiceUpdateSchema,
  ProfessionalUpdateSchema,
  AvailabilityRuleSchema,
} from '../../src/shared/schemas/index.js';

describe('Schemas Zod — Validação de Input', () => {

  // =================== APPOINTMENT CREATE ===================

  describe('AppointmentCreateSchema', () => {
    it('deve aceitar payload válido', () => {
      const payload = {
        professional_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        service_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        scheduled_at: '2025-01-15T10:00:00-03:00',
        client_name: 'João Silva',
        client_phone: '+5511999999999',
      };

      const result = AppointmentCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar professional_id não-UUID', () => {
      const payload = {
        professional_id: 'invalid-uuid',
        service_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        scheduled_at: '2025-01-15T10:00:00-03:00',
        client_name: 'João',
        client_phone: '+5511999999999',
      };

      const result = AppointmentCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const errorMsg = result.error?.issues?.[0]?.message || result.error?.message || '';
      expect(errorMsg).toContain('UUID válido');
    });

    it('deve rejeitar client_name muito curto', () => {
      const payload = {
        professional_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        service_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        scheduled_at: '2025-01-15T10:00:00-03:00',
        client_name: 'J', // ❌ mínimo 2
        client_phone: '+5511999999999',
      };

      const result = AppointmentCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
      const msg1 = result.error?.issues?.[0]?.message || result.error?.message || '';
      expect(msg1).toContain('pelo menos 2 caracteres');
    });

    it('deve aceitar client_phone sem +55 e normalizar', () => {
      const payload = {
        professional_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        service_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        scheduled_at: '2025-01-15T10:00:00-03:00',
        client_name: 'João',
        client_phone: '11999999999', // sem +55, deve normalizar
      };

      const result = AppointmentCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        // O schema deve ter transformado para +5511999999999
        expect(result.data.client_phone).toBe('+5511999999999');
      }
    });

    it('deve aceitar client_phone válido com +55', () => {
      const payload = {
        professional_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        service_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        scheduled_at: '2025-01-15T10:00:00-03:00',
        client_name: 'João',
        client_phone: '+5511999999999',
      };

      const result = AppointmentCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar scheduled_at sem timezone', () => {
      const payload = {
        professional_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        service_id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        scheduled_at: '2025-01-15T10:00:00', // sem offset
        client_name: 'João',
        client_phone: '+5511999999999',
      };

      const result = AppointmentCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  // =================== RESCHEDULE ===================

  describe('RescheduleRequestSchema', () => {
    it('deve aceitar new_scheduled_at válido com timezone', () => {
      const payload = {
        new_scheduled_at: '2025-01-20T14:00:00-03:00',
      };

      const result = RescheduleRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar new_scheduled_at sem offset', () => {
      const payload = {
        new_scheduled_at: '2025-01-20T14:00:00',
      };

      const result = RescheduleRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  // =================== SERVICE CREATE ===================

  describe('ServiceCreateSchema', () => {
    it('deve aceitar serviço válido', () => {
      const payload = {
        name: 'Massagem Relaxante',
        duration_minutes: 60,
        price_cents: 15000,
        description: 'Relaxamento total',
      };

      const result = ServiceCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar duration_minutes negativo', () => {
      const payload = {
        name: 'Serviço',
        duration_minutes: -30,
        price_cents: 10000,
      };

      const result = ServiceCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.[0]?.message).toContain('positivo');
    });

    it('deve rejeitar price_cents negativo', () => {
      const payload = {
        name: 'Serviço',
        duration_minutes: 30,
        price_cents: -100,
      };

      const result = ServiceCreateSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.[0]?.message).toContain('não negativo');
    });

    it('deve aceitar price_cents opcional', () => {
      const payload = {
        name: 'Serviço Grátis',
        duration_minutes: 30,
      };

      const result = ServiceCreateSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  // =================== AVAILABILITY RULE ===================

  describe('AvailabilityRuleSchema', () => {
    it('deve aceitar regra válida (segunda-feira, 09:00-18:00)', () => {
      const payload = {
        day_of_week: 1, // segunda
        start_time: '09:00',
        end_time: '18:00',
      };

      const result = AvailabilityRuleSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar end_time anterior a start_time', () => {
      const payload = {
        day_of_week: 1,
        start_time: '18:00',
        end_time: '09:00', // ❌
      };

      const result = AvailabilityRuleSchema.safeParse(payload);
      expect(result.success).toBe(false);
      expect(result.error?.issues?.[0]?.message).toContain('posterior');
    });

    it('deve rejeitar day_of_week fora de 0-6', () => {
      const payload = {
        day_of_week: 7, // ❌ inválido
        start_time: '09:00',
        end_time: '18:00',
      };

      const result = AvailabilityRuleSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar start_time fora do formato HH:mm', () => {
      const payload = {
        day_of_week: 1,
        start_time: '9:00', // ❌ deve ser 09:00
        end_time: '18:00',
      };

      const result = AvailabilityRuleSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

});
