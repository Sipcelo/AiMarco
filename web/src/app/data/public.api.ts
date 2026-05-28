// Em dev o proxy Vite roteia /v1/* para Railway sem CORS. Em prod usa a URL direta.
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://aimarco.up.railway.app')

export interface ServiceItem {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number
}

export interface Professional {
  id: string
  display_name: string
  slug: string
  phone: string | null
  bio: string | null
  services?: ServiceItem[]
  avatar_url?: string | null
  timezone?: string
  business_type?: string
}

type DemoProfile = Professional & { services: ServiceItem[] }
type DemoAppointment = {
  professional_id: string
  service_id: string
  scheduled_at: string
  client_name: string
  client_phone: string
}

const demoProfiles: Record<string, DemoProfile> = {
  'example-m': {
    id: 'demo-example-m',
    display_name: 'Auralynne Nails',
    slug: 'example-m',
    phone: '(11) 99999-0101',
    bio: 'Fluxo demonstrativo para manicure, pedicure e nail designer.',
    timezone: 'America/Sao_Paulo',
    business_type: 'nails',
    services: [
      {
        id: 'demo-example-m-manicure',
        name: 'Manicure',
        description: 'Cuidado completo das maos com esmaltacao.',
        duration_minutes: 60,
        price_cents: 4500,
      },
      {
        id: 'demo-example-m-pedicure',
        name: 'Pedicure',
        description: 'Cuidado completo dos pes com acabamento delicado.',
        duration_minutes: 60,
        price_cents: 5000,
      },
      {
        id: 'demo-example-m-banho-gel',
        name: 'Banho de gel',
        description: 'Reforco para unhas naturais com brilho e durabilidade.',
        duration_minutes: 90,
        price_cents: 9500,
      },
    ],
  },
  'example-s': {
    id: 'demo-example-s',
    display_name: 'Auralynne Salao',
    slug: 'example-s',
    phone: '(11) 99999-0102',
    bio: 'Fluxo demonstrativo para salao de beleza com servicos de cabelo e unhas.',
    timezone: 'America/Sao_Paulo',
    business_type: 'hair',
    services: [
      {
        id: 'demo-example-s-corte',
        name: 'Corte e finalizacao',
        description: 'Corte personalizado com escova ou finalizacao.',
        duration_minutes: 75,
        price_cents: 11000,
      },
      {
        id: 'demo-example-s-hidratacao',
        name: 'Hidratacao capilar',
        description: 'Tratamento para brilho, maciez e recuperacao dos fios.',
        duration_minutes: 60,
        price_cents: 9000,
      },
      {
        id: 'demo-example-s-unhas',
        name: 'Combo cabelo + unhas',
        description: 'Experiencia completa para sair pronta do salao.',
        duration_minutes: 150,
        price_cents: 18000,
      },
    ],
  },
}

function getDemoProfile(slug: string): DemoProfile | null {
  return demoProfiles[slug] || null
}

function getLocalAppointments(): DemoAppointment[] {
  try {
    return JSON.parse(localStorage.getItem('auralynne-demo-appointments') || '[]')
  } catch {
    return []
  }
}

function saveLocalAppointment(payload: DemoAppointment) {
  const appointments = getLocalAppointments()
  appointments.push(payload)
  localStorage.setItem('auralynne-demo-appointments', JSON.stringify(appointments))
}

function hasLocalAppointmentConflict(payload: DemoAppointment) {
  return getLocalAppointments().some((appointment) =>
    appointment.professional_id === payload.professional_id &&
    appointment.scheduled_at === payload.scheduled_at,
  )
}

async function safeJsonResponse(res: Response): Promise<any> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Resposta invalida do servidor (${res.status})`)
  }
}

async function extractError(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return `Erro ${res.status}`
  try {
    const data = JSON.parse(text)
    return data.error || data.message || `Erro ${res.status}`
  } catch {
    return `Erro ${res.status}`
  }
}

function demoSlotsFor(slug: string, date: string): string[] {
  const demo = getDemoProfile(slug)
  if (!demo) return []

  const selectedDate = new Date(`${date}T12:00:00`)
  const day = selectedDate.getDay()

  if (day === 0) return []

  const allSlots = day === 6
    ? ['09:00', '10:00', '11:00', '12:00']
    : ['09:00', '10:00', '11:00', '13:30', '14:30', '15:30', '16:30', '17:30']

  const taken = getLocalAppointments()
    .filter((appointment) =>
      appointment.professional_id === demo.id &&
      appointment.scheduled_at.slice(0, 10) === date,
    )
    .map((appointment) => appointment.scheduled_at.slice(11, 16))

  return allSlots.filter((slot) => !taken.includes(slot))
}

export async function getProfessional(slug: string): Promise<Professional> {
  const demoOnly = getDemoProfile(slug)
  if (slug.startsWith('example-') && demoOnly) {
    return demoOnly
  }

  try {
    const res = await fetch(`${API_URL}/v1/public/professional/${encodeURIComponent(slug)}`)
    const data = await safeJsonResponse(res)
    if (!res.ok || !data) {
      const demo = getDemoProfile(slug)
      if (demo) return demo
      throw new Error(await extractError(res) || `Profissional nao encontrado (${res.status})`)
    }
    return data
  } catch (error) {
    const demo = getDemoProfile(slug)
    if (demo) return demo
    throw error
  }
}

export async function getAvailableTimeSlots(
  slug: string,
  date: string,
  serviceId: string,
): Promise<string[]> {
  try {
    const url = `${API_URL}/v1/public/professional/${encodeURIComponent(slug)}/availability?date=${date}&service_id=${serviceId}`
    const res = await fetch(url)

    if (!res.ok) {
      const demo = getDemoProfile(slug)
      return demo ? demoSlotsFor(slug, date) : []
    }

    const slots = await safeJsonResponse(res)
    return Array.isArray(slots) ? slots : []
  } catch {
    const demo = getDemoProfile(slug)
    return demo ? demoSlotsFor(slug, date) : []
  }
}

export async function createPublicAppointment(
  payload: {
    professional_id: string
    service_id: string
    scheduled_at: string
    client_name: string
    client_phone: string
  },
): Promise<any> {
  if (payload.professional_id.startsWith('demo-')) {
    if (hasLocalAppointmentConflict(payload)) {
      throw new Error('Este horario nao esta mais disponivel. Escolha outro e tente novamente.')
    }
    saveLocalAppointment(payload)
    return { id: crypto.randomUUID(), status: 'confirmed', ...payload }
  }

  const res = await fetch(`${API_URL}/v1/public/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await safeJsonResponse(res)

  if (!res.ok) {
    const errMsg = data?.error || 'Erro ao agendar'
    if (res.status === 409) {
      throw new Error('Este horario nao esta mais disponivel. Escolha outro e tente novamente.')
    }
    throw new Error(errMsg)
  }

  return data
}
