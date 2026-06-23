import { describe, it, expect } from 'vitest';
import { buildClientMessage } from '../../src/services/whatsapp-templates.js';

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

  it('inclui cliente, data, hora e link de booking no APPOINTMENT_CREATED', () => {
    const msg = buildClientMessage('APPOINTMENT_CREATED', ctx)!;
    expect(msg).toContain('Marcelo');
    expect(msg).toContain('24/06/2026');
    expect(msg).toContain('11:30');
    expect(msg).toContain('https://aimarco.com.br/p/regina-s-hair');
  });

  it('monta CANCELLED e RESCHEDULED com o link correto', () => {
    expect(buildClientMessage('APPOINTMENT_CANCELLED', ctx)).toContain('cancelado');
    expect(buildClientMessage('APPOINTMENT_RESCHEDULED', ctx)).toContain('remarcado');
  });

  it('retorna null para template_key desconhecido', () => {
    expect(buildClientMessage('UNKNOWN_KEY', ctx)).toBeNull();
  });
});
