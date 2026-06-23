/**
 * Templates das mensagens de WhatsApp enviadas ao CLIENTE.
 *
 * Centraliza o texto e a interpolação num só lugar (antes estavam inline no worker
 * com placeholders frágeis ¹! ²!). Usa o nome PÚBLICO do profissional (`display_name`),
 * nunca o `full_name` interno.
 */

/** Base da URL pública de booking. Domínio estável do produto. */
const BOOKING_BASE_URL = 'https://aimarco.com.br/p/';

export interface AppointmentMessageContext {
  /** Nome do cliente (destinatário). */
  clientName: string;
  /** Nome público do profissional (`professionals.display_name`). */
  professionalName: string;
  /** Data formatada pt-BR (dd/mm/aaaa). */
  date: string;
  /** Hora formatada (HH:mm). */
  time: string;
  /** Slug público do profissional, usado no link de reagendar/cancelar. */
  slug: string;
}

type ClientTemplateKey =
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED';

const bookingUrl = (slug: string): string => `${BOOKING_BASE_URL}${slug}`;

const templates: Record<ClientTemplateKey, (c: AppointmentMessageContext) => string> = {
  APPOINTMENT_CREATED: (c) =>
    `Olá ${c.clientName}! Confirmamos seu horário na ${c.professionalName} para o dia ${c.date} às ${c.time}. Link para reagendar/cancelar: ${bookingUrl(c.slug)}`,
  APPOINTMENT_CANCELLED: (c) =>
    `Olá ${c.clientName}! Informamos que seu agendamento com ${c.professionalName} foi cancelado. Para agendar novamente, acesse: ${bookingUrl(c.slug)}`,
  APPOINTMENT_RESCHEDULED: (c) =>
    `Olá ${c.clientName}! Seu horário com ${c.professionalName} foi remarcado para o dia ${c.date} às ${c.time}. Confirme ou altere em: ${bookingUrl(c.slug)}`,
};

/**
 * Monta a mensagem de cliente para um `template_key`.
 * Retorna `null` se o template não for de cliente (ex.: notificação de profissional)
 * ou for desconhecido — o worker trata isso como "não enviar".
 */
export function buildClientMessage(
  templateKey: string,
  ctx: AppointmentMessageContext,
): string | null {
  const builder = templates[templateKey as ClientTemplateKey];
  return builder ? builder(ctx) : null;
}
