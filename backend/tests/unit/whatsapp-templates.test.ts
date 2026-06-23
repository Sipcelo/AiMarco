import { describe, it, expect } from 'vitest';
import {
  buildClientMessage,
  formatAppointmentDateTime,
} from '../../src/services/whatsapp-templates.js';

const ctx = {
  clientName: 'Marcelo',
  professionalName: 'Regina S. Hair',
  date: '24/06/2026',
  time: '11:30',
  slug: 'regina-s-hair',
};

describe('buildClientMessage', () => {
  it('usa o nome público do profissional (display_name), não full_name', () => {
    const msg = buildClientMessage('APPOINTMENT_CREATED', ctx);
    expect(msg).toContain('Regina S. Hair');
    expect(msg).not.toContain('Demo Professional');
  });

  it('inclui cliente, data e hora no APPOINTMENT_CREATED, SEM link de reagendar/cancelar', () => {
    const msg = buildClientMessage('APPOINTMENT_CREATED', ctx)!;
    expect(msg).toContain('Marcelo');
    expect(msg).toContain('24/06/2026');
    expect(msg).toContain('11:30');
    // Não existe página self-service do cliente → nenhum link no CREATED
    expect(msg).not.toContain('http');
  });

  it('CANCELLED mantém link de agendar novamente; RESCHEDULED sem link', () => {
    const cancelled = buildClientMessage('APPOINTMENT_CANCELLED', ctx)!;
    expect(cancelled).toContain('cancelado');
    expect(cancelled).toContain('https://auralynne.up.railway.app/p/regina-s-hair');

    const rescheduled = buildClientMessage('APPOINTMENT_RESCHEDULED', ctx)!;
    expect(rescheduled).toContain('remarcado');
    expect(rescheduled).not.toContain('http');
  });

  it('retorna null para template_key desconhecido', () => {
    expect(buildClientMessage('UNKNOWN_KEY', ctx)).toBeNull();
  });
});

describe('formatAppointmentDateTime', () => {
  it('formata no fuso America/Sao_Paulo, não no do servidor (17:00 UTC -> 14:00)', () => {
    const { date, time } = formatAppointmentDateTime('2026-06-24T17:00:00+00:00');
    expect(date).toBe('24/06/2026');
    expect(time).toBe('14:00');
  });
});
