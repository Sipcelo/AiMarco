import Constants from 'expo-constants';

// Gerenciamento global de handler para 401 (configurado pelo AuthProvider)
let unauthorizedGlobalHandler: (() => void) | null = null;
let isHandling401 = false; // Guard against re-render loops

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedGlobalHandler = handler;
  isHandling401 = false; // Reset guard when handler is re-registered
}

// ─── Schedule Types ───
export type Appointment = {
  id: string;
  scheduled_at: string;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  service_id: string;
  client_id: string;
  service_name?: string;
  service_duration_minutes?: number;
  client_name?: string;
  client_phone?: string;
};

export type BlockedSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type AvailabilityRule = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export const BACKEND_URL =
  (Constants.manifest?.extra?.backendUrl as string | undefined) ||
  process.env.BACKEND_URL ||
  'https://aimarco.up.railway.app';

// Tipos alinhados com backend/src/dtos/index.ts (DTO Layer)
export type ServiceItem = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  description?: string | null;
  is_active: boolean;
};

export type Professional = {
  id: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  timezone: string;
  slug: string;
  business_type: 'barbershop' | 'nails' | 'hair';
  services: ServiceItem[];
};

export type AuthUser = {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string | null;
  timezone: string;
  slug: string;
  business_type: 'barbershop' | 'nails' | 'hair';
  email: string;
  phone: string;
  full_name: string;
  created_at: string;
  updated_at?: string;
  services?: ServiceItem[];
};

/**
 * Fetch helper com suporte a token de autenticação
 */
async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
): Promise<Response> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as any).Authorization = `Bearer ${token}`;
  }

  const url = `${BACKEND_URL}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  // 401 Interceptor: Automatic session cleanup and redirect (guarded against re-entrant loops)
  if (response.status === 401 && unauthorizedGlobalHandler && !isHandling401) {
    isHandling401 = true;
    console.warn('[API] 401 Unauthorized detected. Invoking global handler...');
    // Defer to next tick so signOut doesn't compete with in-flight renders
    setTimeout(() => {
      unauthorizedGlobalHandler?.();
    }, 0);
  }

  return response;
}

/**
 * Auth: Sign up (cadastro de profissional)
 */
export async function signUp(
  email: string,
  password: string,
  display_name: string,
  business_type: 'barbershop' | 'nails' | 'hair',
  phone: string
): Promise<{ token: string; user: AuthUser }> {
  if (!phone || !phone.trim()) {
    throw new Error('Telefone é obrigatório para o cadastro.');
  }

  const response = await apiFetch('/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      display_name,
      business_type,
      phone,
    }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
    }

    const contentType = response.headers.get('content-type');
    let errorMessage = 'Erro no cadastro';
    let fieldErrors: Record<string, string> = {};

    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      if (Array.isArray(errorData.details)) {
        errorData.details.forEach((d: any) => {
          if (d.field) fieldErrors[d.field] = d.message;
        });
      }
      const err = new Error(errorMessage) as any;
      err.status = response.status;
      err.fieldErrors = fieldErrors;
      err.code = errorData.code;
      err.detail = errorData.detail;
      // debug_detail: full readable dump for diagnosis
      err.debug_detail = [
        errorData.message && `MSG: ${errorData.message}`,
        errorData.code    && `CODE: ${errorData.code}`,
        errorData.detail  && `DETAIL: ${errorData.detail}`,
        errorData.hint    && `HINT: ${errorData.hint}`,
      ].filter(Boolean).join('\n') || JSON.stringify(errorData);
      throw err;
    } else {
      errorMessage = await response.text() || errorMessage;
    }

    const err = new Error(errorMessage) as any;
    err.status = response.status;
    err.fieldErrors = fieldErrors;
    throw err;
  }

  const data = await response.json();
  return {
    token: data.token,
    user: data.user || data.professional,
  };
}

/**
 * Auth: Sign in (login)
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  const response = await apiFetch('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorMessage = 'Erro no login';
    let fieldErrors: Record<string, string> = {};

    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      if (Array.isArray(errorData.details)) {
        errorData.details.forEach((d: any) => {
          if (d.field) fieldErrors[d.field] = d.message;
        });
      }
    } else {
      errorMessage = await response.text() || errorMessage;
    }

    const err = new Error(errorMessage) as any;
    err.status = response.status;
    err.fieldErrors = fieldErrors;
    throw err;
  }

  const data = await response.json();
  return {
    token: data.token,
    user: data.user || data.professional,
  };
}

/**
 * Profile: Get own profile (autenticado)
 * professionalId = professionals.id (UUID from auth user row)
 */
export async function getProfile(token: string, professionalId: string): Promise<AuthUser> {
  const response = await apiFetch(`/v1/professionals/${professionalId}/profile`, {
    method: 'GET',
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao buscar perfil');
  }

  return response.json();
}

/**
 * Profile: Update own profile (autenticado)
 * professionalId = professionals.id (UUID from auth user row)
 */
export async function updateProfile(
  token: string,
  professionalId: string,
  data: Partial<Pick<AuthUser, 'display_name' | 'bio' | 'avatar_url' | 'timezone' | 'business_type'>>
): Promise<AuthUser> {
  const response = await apiFetch(`/v1/professionals/${professionalId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao atualizar perfil');
  }

  return response.json();
}

/**
 * Availability: Create batch rules (autenticado)
 */
export async function createAvailabilityRules(
  token: string,
  professionalId: string,
  rules: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
  }>
): Promise<any[]> {
  const response = await apiFetch(`/v1/professionals/${professionalId}/availability`, {
    method: 'POST',
    body: JSON.stringify(rules),
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao salvar disponibilidade');
  }

  return response.json();
}

/**
 * Public: Get professional by slug (público)
 */
export async function getProfessionalBySlug(slug: string): Promise<Professional> {
  const response = await fetch(`${BACKEND_URL}/v1/public/professional/${encodeURIComponent(slug)}`);

  const text = await response.text();
  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Resposta inválida do servidor (${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || `Falha ao buscar profissional (${response.status})`);
  }

  return {
    id: data.id,
    display_name: data.display_name,
    bio: data.bio ?? null,
    avatar_url: data.avatar_url ?? null,
    timezone: data.timezone || 'America/Sao_Paulo',
    slug: data.slug,
    business_type: data.business_type || ('barbershop' as const),
    services: Array.isArray(data.services)
      ? data.services.map((svc: any) => ({
          id: svc.id,
          name: svc.name,
          duration_minutes: svc.duration_minutes,
          price_cents: svc.price_cents ?? null,
          description: svc.description ?? null,
          is_active: svc.is_active,
        }))
      : [],
  };
}

/**
 * Services: List services for a professional (autenticado)
 */
export async function listServices(token: string, professionalId: string): Promise<ServiceItem[]> {
  const response = await apiFetch(`/v1/professionals/${professionalId}/services`, {
    method: 'GET',
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao listar serviços');
  }

  return response.json() as Promise<ServiceItem[]>;
}

/**
 * Services: Create a new service for a professional (autenticado)
 */
export async function createService(
  token: string,
  professionalId: string,
  data: {
    name: string;
    duration_minutes: number;
    price_cents?: number | null;
    description?: string | null;
    is_active?: boolean;
  }
): Promise<ServiceItem> {
  const response = await apiFetch(`/v1/professionals/${professionalId}/services`, {
    method: 'POST',
    body: JSON.stringify(data),
  }, token);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar serviço');
  }

  return response.json() as Promise<ServiceItem>;
}

// ─── Schedule / Appointments (autenticado) ───

export async function listAppointments(
  token: string,
  professionalId: string,
  date: string,
): Promise<Appointment[]> {
  const response = await apiFetch(
    `/v1/professionals/${professionalId}/appointments?date=${date}`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível carregar os agendamentos');
  }
  return response.json() as Promise<Appointment[]>;
}

export async function listBlockedSlots(
  token: string,
  professionalId: string,
  date: string,
): Promise<BlockedSlot[]> {
  const response = await apiFetch(
    `/v1/professionals/${professionalId}/blocked-slots?date=${date}`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) return [];
  return response.json() as Promise<BlockedSlot[]>;
}

export async function createBlockedSlot(
  token: string,
  professionalId: string,
  body: { starts_at: string; ends_at: string; reason?: string },
): Promise<any> {
  const response = await apiFetch(
    `/v1/professionals/${professionalId}/blocked-slots`,
    { method: 'POST', body: JSON.stringify(body) },
    token,
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível bloquear horário');
  }
  return response.json();
}

export async function updateAppointmentStatus(
  token: string,
  appointmentId: string,
  status: 'completed' | 'no_show',
): Promise<void> {
  const response = await apiFetch(
    `/v1/appointments/${appointmentId}/status`,
    { method: 'POST', body: JSON.stringify({ status }) },
    token,
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível atualizar o status');
  }
}

export async function cancelAppointment(
  token: string,
  appointmentId: string,
): Promise<void> {
  const response = await apiFetch(`/v1/appointments/${appointmentId}/cancel`, { method: 'POST' }, token);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível cancelar o agendamento');
  }
}

export async function getAvailabilityRules(
  token: string,
  professionalId: string,
): Promise<AvailabilityRule[]> {
  const response = await apiFetch(
    `/v1/professionals/${professionalId}/availability`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) return [];
  return response.json() as Promise<AvailabilityRule[]>;
}

export async function getAvailableDays(token: string, professionalId: string): Promise<string[]> {
  const response = await apiFetch(
    `/v1/professionals/${professionalId}/available-days`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.days || [];
}

// ─── Public Appointment Booking (público) ───

export async function createPublicAppointment(body: {
  professional_id: string;
  service_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  scheduled_date: string;
  scheduled_time: string;
}): Promise<any> {
  console.log('[createPublicAppointment] scheduled_at:', `${body.scheduled_date}T${body.scheduled_time}:00-03:00`)
  const response = await apiFetch('/v1/public/appointments', {
    method: 'POST',
    body: JSON.stringify({
      professional_id: body.professional_id,
      service_id: body.service_id,
      scheduled_at: `${body.scheduled_date}T${body.scheduled_time}:00-03:00`,
      client_name: body.client_name,
      client_phone: body.client_phone,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    let errData: any = null;
    if (text) {
      try { errData = JSON.parse(text); } catch { /* skip */ }
    }
    if (response.status === 409) {
      throw new Error('Este horário não está mais disponível. Escolha outro e tente novamente.');
    }
    throw new Error(errData?.error || 'Não foi possível realizar o agendamento');
  }
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export async function getPublicAvailability(
  slug: string,
  date: string,
  serviceId: string,
): Promise<string[]> {
  const response = await apiFetch(
    `/v1/public/professional/${encodeURIComponent(slug)}/availability?date=${date}&service_id=${serviceId}`,
  );
  if (!response.ok) return [];
  const text = await response.text();
  if (!text) return [];
  try {
    const slots = JSON.parse(text);
    return Array.isArray(slots) ? slots : [];
  } catch {
    console.warn('[API] getPublicAvailability: resposta não é JSON válido');
    return [];
  }
}

export async function rescheduleAppointment(
  token: string,
  appointmentId: string,
  newScheduledAt: string,
): Promise<any> {
  const response = await apiFetch(
    `/v1/appointments/${appointmentId}/reschedule`,
    { method: 'POST', body: JSON.stringify({ new_scheduled_at: newScheduledAt }) },
    token,
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível reagendar');
  }
  return response.json();
}

export async function getAvailability(
  token: string,
  professionalId: string,
  serviceId: string,
  date: string,
): Promise<string[]> {
  const response = await apiFetch(
    `/v1/availability/${professionalId}?service_id=${serviceId}&date=${date}`,
    { method: 'GET' },
    token,
  );
  if (!response.ok) return [];
  const data = await response.json();
  return data.slots || [];
}

export async function deleteService(
  token: string,
  professionalId: string,
  serviceId: string,
): Promise<void> {
  const response = await apiFetch(
    `/v1/professionals/${professionalId}/services/${serviceId}`,
    { method: 'DELETE' },
    token,
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível remover o serviço');
  }
}

export async function savePushToken(
  token: string,
  professionalId: string,
  pushToken: string,
): Promise<void> {
  await apiFetch(
    `/v1/professionals/${professionalId}/push-token`,
    { method: 'PUT', body: JSON.stringify({ push_token: pushToken }) },
    token,
  );
}
