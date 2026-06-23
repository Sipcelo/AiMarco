/**
 * Templates das mensagens de WhatsApp enviadas ao CLIENTE.
 *
 * Centraliza o texto e a interpolação num só lugar (antes estavam inline no worker
 * com placeholders frágeis ¹! ²!). Usa o nome PÚBLICO do profissional (`display_name`),
 * nunca o `full_name` interno.
 */

/** Base da URL pública de booking (marca pública Auralynne). */
const BOOKING_BASE_URL = 'https://auralynne.up.railway.app/p/';

/** Timezone do produto (V1 inteiro em America/Sao_Paulo — ver CLAUDE.md). */
const APP_TIMEZONE = 'America/Sao_Paulo';

/**
 * Formata um instante ISO no fuso do produto.
 * Corrige o bug de formatar no fuso do servidor (Railway=UTC): 17:00Z vira "14:00", não "17:00".
 */
export function formatAppointmentDateTime(
  iso: string,
  timeZone: string = APP_TIMEZONE,
): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('pt-BR', { timeZone }),
    time: d.toLocaleTimeString('pt-BR', { timeZone, hour: '2-digit', minute: '2-digit' }),
  };
}

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
  // Sem link de reagendar/cancelar: não existe página self-service do cliente (decisão 2026-06-23).
  APPOINTMENT_CREATED: (c) =>
    `Olá ${c.clientName}! Confirmamos seu horário na ${c.professionalName} para o dia ${c.date} às ${c.time}.`,
  // Cancelado mantém link: aponta para uma ação que EXISTE — agendar um novo horário.
  APPOINTMENT_CANCELLED: (c) =>
    `Olá ${c.clientName}! Informamos que seu agendamento com ${c.professionalName} foi cancelado. Para agendar novamente, acesse: ${bookingUrl(c.slug)}`,
  APPOINTMENT_RESCHEDULED: (c) =>
    `Olá ${c.clientName}! Seu horário com ${c.professionalName} foi remarcado para o dia ${c.date} às ${c.time}.`,
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
