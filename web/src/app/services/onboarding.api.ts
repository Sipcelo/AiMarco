const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Convert BRL string (e.g. "29,90" or "29.90") to cents (2990)
 */
export function brlToCents(brl: string): number {
  const normalized = brl.replace(/\./g, '').replace(',', '.')
  return Math.round(parseFloat(normalized) * 100)
}

export interface SignUpResponse {
  token: string
  professional: {
    id: string
    email: string
    display_name?: string
  }
}

export interface ProfileSetupPayload {
  display_name: string
  phone: string
  business_type: string
  bio?: string
}

export interface ServicePayload {
  name: string
  description?: string
  duration_minutes: number
  price_cents: number
}

export interface AvailabilityPayload {
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
}

/**
 * POST /v1/auth/signup
 * Create a new professional account
 */
export async function signUp(email: string, password: string): Promise<SignUpResponse> {
  const response = await fetch(`${API_URL}/v1/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `SignUp failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * PATCH /v1/professionals/:id/profile
 * Update professional profile (display_name, phone, business_type, bio)
 */
export async function updateProfile(
  professionalId: string,
  token: string,
  payload: ProfileSetupPayload,
): Promise<{ id: string; slug: string }> {
  const response = await fetch(`${API_URL}/v1/professionals/${professionalId}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Update profile failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST /v1/professionals/:id/services
 * Create a service for the professional
 */
export async function createService(
  professionalId: string,
  token: string,
  payload: ServicePayload,
): Promise<{ id: string }> {
  const response = await fetch(`${API_URL}/v1/professionals/${professionalId}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Create service failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST /v1/professionals/:id/availability
 * Create availability rules for the professional
 */
export async function createAvailability(
  professionalId: string,
  token: string,
  payload: AvailabilityPayload[],
): Promise<{ created: number }> {
  const response = await fetch(`${API_URL}/v1/professionals/${professionalId}/availability`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `Create availability failed with status ${response.status}`)
  }

  return response.json()
}
