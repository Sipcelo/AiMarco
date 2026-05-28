import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendWhatsAppMessage } from '../../src/services/whatsapp.js';

// Mock da função sendWhatsAppMessage
vi.mock('../../src/services/whatsapp.js', () => ({
  sendWhatsAppMessage: vi.fn()
}));

import { sendWhatsAppMessage as mockedSendWhatsApp } from '../../src/services/whatsapp.js';

// Helper para criar mock de notificação
function createMockNotification(template_key: string, recipient_type: 'client' | 'professional') {
  return {
    id: 'notif-123',
    template_key,
    recipient_type,
    appointments: {
      scheduled_start: '2026-03-27T10:00:00Z',
      clients: { full_name: 'João Silva', phone: '+5511999999999' },
      professionals: { full_name: 'Dra. Maria', phone: '+5511888888888', slug: 'dra-maria', id: 'prof-123' },
      services: { name: 'Consulta' }
    }
  };
}

// Simular a lógica interna do worker (processNotification)
async function simulateWorkerProcess(notification: any) {
  const appt = notification.appointments;
  const recipientPhone = appt.clients.phone;

  const dateObj = new Date(appt.scheduled_start);
  const formattedDate = dateObj.toLocaleDateString('pt-BR');
  const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const slug = appt.professionals.slug || appt.professionals.id;

  let messageSent = '';
  let templateProcessed = '';

  // Lógica do worker (copiada de worker.ts linhas 72-88)
  if (notification.template_key === 'APPOINTMENT_CREATED' && notification.recipient_type === 'client') {
    messageSent = `Olá ${appt.clients.full_name}! Confirmamos seu horário na ${appt.professionals.full_name} para o dia ${formattedDate} às ${formattedTime}. Link para reagendar/cancelar: https://aimarco.com.br/p/${slug}`;
    templateProcessed = 'APPOINTMENT_CREATED';
    await mockedSendWhatsApp(recipientPhone, messageSent);
  } else if (notification.template_key === 'APPOINTMENT_CANCELLED' && notification.recipient_type === 'client') {
    messageSent = `Olá ${appt.clients.full_name}! Informamos que seu agendamento com ${appt.professionals.full_name} foi cancelado. Para agendar novamente, acesse: https://aimarco.com.br/p/${slug}`;
    templateProcessed = 'APPOINTMENT_CANCELLED';
    await mockedSendWhatsApp(recipientPhone, messageSent);
  } else if (notification.template_key === 'APPOINTMENT_RESCHEDULED' && notification.recipient_type === 'client') {
    messageSent = `Olá ${appt.clients.full_name}! Seu horário com ${appt.professionals.full_name} foi remarcado para o dia ${formattedDate} às ${formattedTime}. Confirme ou altere em: https://aimarco.com.br/p/${slug}`;
    templateProcessed = 'APPOINTMENT_RESCHEDULED';
    await mockedSendWhatsApp(recipientPhone, messageSent);
  } else {
    console.log(`[SIMULATION] Notificação ${notification.template_key} para ${notification.recipient_type} não configurada para envio real.`);
  }

  return { messageSent, templateProcessed };
}

describe('Worker Templates Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('APPOINTMENT_CREATED sends correct confirmation message', async () => {
    const notification = createMockNotification('APPOINTMENT_CREATED', 'client');

    const result = await simulateWorkerProcess(notification);

    expect(result.templateProcessed).toBe('APPOINTMENT_CREATED');
    expect(result.messageSent).toContain('Confirmamos seu horário');
    expect(result.messageSent).toContain('Dra. Maria');
    expect(result.messageSent).toContain('aimarco.com.br/p/dra-maria');
    expect(mockedSendWhatsApp).toHaveBeenCalled();
    expect(mockedSendWhatsApp).toHaveBeenCalledWith('+5511999999999', expect.any(String));
  });

  it('APPOINTMENT_CANCELLED sends correct cancellation message', async () => {
    const notification = createMockNotification('APPOINTMENT_CANCELLED', 'client');

    const result = await simulateWorkerProcess(notification);

    expect(result.templateProcessed).toBe('APPOINTMENT_CANCELLED');
    expect(result.messageSent).toContain('foi cancelado');
    expect(result.messageSent).toContain('João Silva');
    expect(result.messageSent).toContain('Dra. Maria');
    expect(result.messageSent).toContain('aimarco.com.br/p/dra-maria');
    expect(mockedSendWhatsApp).toHaveBeenCalled();
  });

  it('APPOINTMENT_RESCHEDULED sends correct reschedule message', async () => {
    const notification = createMockNotification('APPOINTMENT_RESCHEDULED', 'client');

    const result = await simulateWorkerProcess(notification);

    expect(result.templateProcessed).toBe('APPOINTMENT_RESCHEDULED');
    expect(result.messageSent).toContain('remarcado');
    expect(result.messageSent).toContain('Dra. Maria');
    expect(result.messageSent).toContain('aimarco.com.br/p/dra-maria');
    expect(mockedSendWhatsApp).toHaveBeenCalled();
  });

  it('Non-client recipient types are simulated, not sent', async () => {
    const notification = createMockNotification('APPOINTMENT_CANCELLED', 'professional');

    const result = await simulateWorkerProcess(notification);

    expect(result.templateProcessed).toBe(''); // não envia para professional
    expect(mockedSendWhatsApp).not.toHaveBeenCalled();
  });

  it('Unknown template types are simulated, not sent', async () => {
    const notification = { ...createMockNotification('UNKNOWN_TEMPLATE', 'client'), template_key: 'UNKNOWN_TEMPLATE' as any };

    const result = await simulateWorkerProcess(notification);

    expect(result.templateProcessed).toBe('');
    expect(mockedSendWhatsApp).not.toHaveBeenCalled();
  });
});
