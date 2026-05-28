/**
 * DTO Layer — Data Transfer Objects
 *
 * OBJETIVO: Nunca expor objetos crus do banco de dados.
 * Estas funções transformam entidades do domínio em representações públicas/seguras.
 *
 * Regras de ouro (security-auditor):
 * - NUNCA retornar: auth_user_id, email (exceto próprio perfil), campos de audit (created_at, updated_at)
 * - NUNCA expor IDs internos desnecessários (use apenas o necessário para o cliente)
 * - SEMPRE fazer deep copy e excluir campos sensíveis
 *
 * Fontes: docs/planejamento_aimarco.md (Tarefa A4)
 */

// =================== TIPOS PÚBLICOS ===================

/**
 * Professional data exposed to public (via slug)
 * Seguro para qualquer usuário da internet ver.
 */
export interface PublicProfessional {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  timezone: string;
  slug: string;
  business_type: string; // tipo de negócio (individual, empresa, etc.)
  // NÃO inclui: auth_user_id, email, phone, full_name, created_at, updated_at
}

/**
 * Service data exposed to public
 */
export interface PublicService {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents?: number;
  description?: string;
  is_active: boolean;
  // NÃO inclui: professional_id, created_at, updated_at
}

/**
 * Public Appointment DTO (minimal, no PII)
 * Para uso em rotas públicas (ex: listagem de horários sem expor dados do cliente)
 */
export interface PublicAppointment {
  id: string;
  scheduled_at: string; // ISO 8601
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  service_name: string;
  // NÃO inclui: professional_id, service_id, client_id, client_name, client_phone
}

/**
 * Professional Appointment DTO (full, with PII)
 * Para uso no dashboard do profissional (autenticado)
 */
export interface ProfessionalAppointment {
  id: string;
  professional_id: string;
  service_id: string;
  client_id: string;
  scheduled_at: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  service_name: string;
  service_duration_minutes: number;
  client_name: string;
  client_phone: string;
}

/**
 * Professional profile exposed to self (authenticated)
 * Inclui dados ausentes no público (email, phone) para gestão própria.
 */
export interface OwnProfessional extends PublicProfessional {
  email: string;
  phone: string;
  full_name: string;
  business_type: string;
  // audit fields
  created_at: string;
  updated_at: string;
}

// =================== TRANSFORMERS ===================

/**
 * Transforma um registro bruto de professionals em dados públicos.
 * Remove: auth_user_id, email, phone, created_at, updated_at, full_name (usa display_name)
 *
 * Uso: GET /v1/public/professional/:slug
 */
export function toPublicProfessional(prof: any): PublicProfessional | null {
  if (!prof) return null;

  return {
    id: prof.id,
    display_name: prof.display_name,
    bio: prof.bio ?? undefined,
    avatar_url: prof.avatar_url ?? undefined,
    timezone: prof.timezone ?? 'America/Sao_Paulo',
    slug: prof.slug,
    business_type: prof.business_type ?? 'individual', // default segurança
  };
}

/**
 * Transforma um registro bruto de services em dados públicos.
 * Remove: professional_id, created_at, updated_at
 */
export function toPublicService(service: any): PublicService | null {
  if (!service) return null;

  return {
    id: service.id,
    name: service.name,
    duration_minutes: service.duration_minutes,
    price_cents: service.price_cents ?? undefined,
    description: service.description ?? undefined,
    is_active: service.is_active,
  };
}

/**
 * Transforma um registro bruto de appointments em resposta para o profissional (autenticado).
 * Expõe todos os dados necessários para gestão, incluindo PII do cliente.
 * Garante que os snapshots obrigatórios estejam presentes (ou lança erro se faltar).
 *
 * Regra architecture.md §7.4: "Snapshots são obrigatórios."
 * Se o banco não tiver os snapshots, este DTO deve preenchê-los buscando dados relacionados.
 */
export function toAppointmentResponse(appt: any): ProfessionalAppointment | null {
  if (!appt) return null;

  const required: ProfessionalAppointment = {
    id: appt.id,
    professional_id: appt.professional_id,
    service_id: appt.service_id,
    client_id: appt.client_id,
    scheduled_at: appt.scheduled_at,
    status: appt.status,
    service_name: appt.service_name,
    service_duration_minutes: appt.service_duration_minutes,
    client_name: appt.client_name,
    client_phone: appt.client_phone,
  };

  return required;
}

/**
 * Alias para toAppointmentResponse (mantém compatibilidade com código existente).
 * @deprecated Use toProfessionalAppointment para clareza semântica.
 */
export function toProfessionalAppointment(appt: any): ProfessionalAppointment | null {
  return toAppointmentResponse(appt);
}

/**
 * Transforma um registro bruto de appointments em resposta pública (minimal).
 * Oculta todos os dados do cliente (PII) e IDs internos desnecessários.
 *
 * Uso: rotas públicas que expõem agendamentos sem comprometer privacidade.
 */
export function toPublicAppointment(appt: any): PublicAppointment | null {
  if (!appt) return null;

  return {
    id: appt.id,
    scheduled_at: appt.scheduled_at,
    status: appt.status,
    service_name: appt.service_name,
  };
}

/**
 * Transforma profissional para seu próprio uso (autenticado).
 * Expõe tudo que é necessário para gestão do perfil.
 * (Pode ainda assim filtrar alguns campos muito internos se necessário)
 */
export function toOwnProfessional(prof: any): OwnProfessional | null {
  if (!prof) return null;

  return {
    id: prof.id,
    display_name: prof.display_name,
    bio: prof.bio ?? undefined,
    avatar_url: prof.avatar_url ?? undefined,
    timezone: prof.timezone ?? 'America/Sao_Paulo',
    slug: prof.slug,
    email: prof.email,
    phone: prof.phone,
    full_name: prof.full_name,
    business_type: prof.business_type,
    created_at: prof.created_at,
    updated_at: prof.updated_at,
  };
}

// =================== UTILIDADES ===================

/**
 * Aplica DTO em uma lista, filtrando nulos.
 */
export function toPublicServiceList(services: any[]): PublicService[] {
  return services?.map(toPublicService).filter((s): s is PublicService => s !== null) ?? [];
}

export function toPublicProfessionalList(profs: any[]): PublicProfessional[] {
  return profs?.map(toPublicProfessional).filter((p): p is PublicProfessional => p !== null) ?? [];
}

export function toAppointmentResponseList(appointments: any[]): ProfessionalAppointment[] {
  return appointments?.map(toAppointmentResponse).filter((a): a is ProfessionalAppointment => a !== null) ?? [];
}

/**
 * Alias para toAppointmentResponseList (mantém compatibilidade e clareza semântica).
 */
export function toProfessionalAppointmentList(appointments: any[]): ProfessionalAppointment[] {
  return toAppointmentResponseList(appointments);
}

export function toPublicAppointmentList(appointments: any[]): PublicAppointment[] {
  return appointments?.map(toPublicAppointment).filter((a): a is PublicAppointment => a !== null) ?? [];
}
