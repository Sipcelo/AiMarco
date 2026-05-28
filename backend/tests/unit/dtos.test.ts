/**
 * Testes Unitários — DTO Layer
 *
 * OBJETIVO: Garantir que objetos crus do banco NUNCA vazem na API.
 *
 * Regra de ouro (security-auditor):
 * - auth_user_id NUNCA nos responses
 * - email NUNCA em consultas públicas
 * - Campos de audit (created_at, updated_at) filtrados
 */

import { describe, it, expect } from 'vitest';
import {
  toPublicProfessional,
  toPublicService,
  toAppointmentResponse,
  toPublicProfessionalList,
  toPublicServiceList,
  toAppointmentResponseList,
} from '../../src/dtos/index.js';

describe('DTO Layer — Segurança de Payloads', () => {

  // =================== PROFESSIONAL ===================

  describe('toPublicProfessional', () => {
    it('deve expor apenas campos públicos, NEVER auth_user_id', () => {
      const raw = {
        id: 'prof-123',
        display_name: 'Regina',
        bio: 'Especialista em massagem',
        avatar_url: 'https://example.com/avatar.jpg',
        timezone: 'America/Sao_Paulo',
        slug: 'regina',
        // Campos sensíveis que DEVEM ser removidos:
        auth_user_id: 'auth-uuid-xyz',
        email: 'regina@email.com',
        phone: '+5511999999999',
        full_name: 'Regina Ferreira',
        business_type: 'massagem',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const result = toPublicProfessional(raw);

      expect(result).not.toBeNull();
      expect(result?.auth_user_id).toBeUndefined();
      expect(result?.email).toBeUndefined();
      expect(result?.phone).toBeUndefined();
      expect(result?.full_name).toBeUndefined();
      expect(result?.created_at).toBeUndefined();
      expect(result?.updated_at).toBeUndefined();

      // Campos públicos devem estar presentes:
      expect(result?.id).toBe('prof-123');
      expect(result?.display_name).toBe('Regina');
      expect(result?.slug).toBe('regina');
      expect(result?.timezone).toBe('America/Sao_Paulo');
      expect(result?.business_type).toBe('massagem'); // agora público
    });

    it('deve retornar null se input for null/undefined', () => {
      expect(toPublicProfessional(null)).toBeNull();
      expect(toPublicProfessional(undefined)).toBeNull();
    });

    it('deve usar timezone padrão America/Sao_Paulo se ausente', () => {
      const raw = { id: 'p1', display_name: 'Test', slug: 'test' };
      const result = toPublicProfessional(raw);
      expect(result?.timezone).toBe('America/Sao_Paulo');
    });
  });

  // =================== SERVICE ===================

  describe('toPublicService', () => {
    it('deve remover professional_id e campos de audit', () => {
      const raw = {
        id: 'svc-1',
        name: 'Massagem Relaxante',
        duration_minutes: 60,
        price_cents: 15000,
        description: 'Relaxamento total',
        is_active: true,
        professional_id: 'prof-123',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const result = toPublicService(raw);

      expect(result).not.toBeNull();
      expect(result?.professional_id).toBeUndefined();
      expect(result?.created_at).toBeUndefined();
      expect(result?.updated_at).toBeUndefined();

      expect(result?.id).toBe('svc-1');
      expect(result?.name).toBe('Massagem Relaxante');
      expect(result?.duration_minutes).toBe(60);
      expect(result?.price_cents).toBe(15000);
      expect(result?.description).toBe('Relaxamento total');
      expect(result?.is_active).toBe(true);
    });

    it('deve aceitar price_cents opcional (null)', () => {
      const raw = {
        id: 'svc-2',
        name: 'Consulta',
        duration_minutes: 30,
        price_cents: null,
        is_active: true,
      };
      const result = toPublicService(raw);
      expect(result?.price_cents).toBeUndefined(); // null → undefined via DTO
    });

    it('deve retornar null para input nulo', () => {
      expect(toPublicService(null)).toBeNull();
    });
  });

  // =================== APPOINTMENT ===================

  describe('toAppointmentResponse', () => {
    it('deve incluir snapshots obrigatórios (architecture.md §7.4)', () => {
      const raw = {
        id: 'appt-1',
        professional_id: 'prof-123',
        service_id: 'svc-1',
        client_id: 'cli-1',
        scheduled_at: '2025-01-15T10:00:00-03:00',
        status: 'confirmed',
        service_name: 'Massagem',
        service_duration_minutes: 60,
        client_name: 'João Silva',
        client_phone: '+5511999999999',
        // Campos sensíveis que NÃO devem sair:
        created_at: '2025-01-10T00:00:00Z',
        updated_at: '2025-01-10T00:00:00Z',
        cancellation_reason: null,
        rescheduled_from_appointment_id: null,
      };

      const result = toAppointmentResponse(raw);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('appt-1');
      expect(result?.professional_id).toBe('prof-123');
      expect(result?.service_id).toBe('svc-1');
      expect(result?.client_id).toBe('cli-1');
      expect(result?.scheduled_at).toBe('2025-01-15T10:00:00-03:00');
      expect(result?.status).toBe('confirmed');

      // Snapshots obrigatórios:
      expect(result?.service_name).toBe('Massagem');
      expect(result?.service_duration_minutes).toBe(60);
      expect(result?.client_name).toBe('João Silva');
      expect(result?.client_phone).toBe('+5511999999999');
    });

    it('deve retornar null se appointment for null', () => {
      expect(toAppointmentResponse(null)).toBeNull();
    });
  });

  // =================== LIST HELPERS ===================

  describe('list helpers', () => {
    it('toPublicServiceList deve filtrar nulos', () => {
      const services = [
        { id: 's1', name: 'A', duration_minutes: 30, is_active: true },
        null,
        { id: 's2', name: 'B', duration_minutes: 60, is_active: false },
      ] as any;

      const result = toPublicServiceList(services);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('s1');
      expect(result[1].id).toBe('s2');
    });

    it('toAppointmentResponseList deve filtrar nulos', () => {
      const appointments = [
        { id: 'a1', professional_id: 'p1', service_id: 's1', client_id: 'c1', scheduled_at: '2025-01-01T10:00:00Z', status: 'confirmed', service_name: 'S', service_duration_minutes: 30, client_name: 'C', client_phone: '+55...' },
        null,
      ] as any;

      const result = toAppointmentResponseList(appointments);
      expect(result).toHaveLength(1);
    });
  });

});
