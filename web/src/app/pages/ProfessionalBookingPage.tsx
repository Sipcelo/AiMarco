import { useState, useEffect, useCallback } from 'react'
import {
  getProfessional,
  getAvailableTimeSlots,
  createPublicAppointment,
  type ServiceItem,
  type Professional,
} from '../data/public.api'
import {
  isValidBrazilMobilePhone,
  phoneMask,
  formatBRL,
  getNext14Days,
  getDayLabel,
  MONTH_NAMES,
} from './booking/booking-utils'

// ─── Design tokens ────────────────────────────────────────────────────────────
const P = {
  bg: '#0d080f',
  card: 'rgba(255,255,255,0.055)',
  cardBorder: 'rgba(255,255,255,0.09)',
  accent: '#C9A67A',
  accentDark: '#a8845a',
  accentGlow: 'rgba(201,166,122,0.22)',
  text: '#F5EFE9',
  muted: 'rgba(245,239,233,0.52)',
  mutedStrong: 'rgba(245,239,233,0.75)',
  inputBg: 'rgba(255,255,255,0.06)',
  inputBorder: 'rgba(255,255,255,0.13)',
  error: '#F87171',
  success: '#4ADE80',
  titleFont: "'Playfair Display','Cambria','Cochin','Georgia',serif",
  bodyFont: "'Inter',Arial,Helvetica,sans-serif",
  radius: 18,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function businessLabel(type?: string) {
  if (type === 'hair') return 'Cabelereiro'
  if (type === 'nails') return 'Manicure & Pedicure'
  if (type === 'barbershop') return 'Barbearia'
  return 'Beleza'
}

function formatDateLong(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function GoldBtn({ onClick, disabled, children, loading }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', marginTop: 24, padding: '15px 0',
        background: disabled || loading
          ? 'rgba(201,166,122,0.25)'
          : `linear-gradient(135deg, ${P.accent}, ${P.accentDark})`,
        border: 'none', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: P.bodyFont, fontWeight: 700, fontSize: 14,
        letterSpacing: '0.08em', color: disabled ? P.muted : '#1a0e05',
        transition: 'all 0.2s ease',
        boxShadow: disabled ? 'none' : `0 8px 24px ${P.accentGlow}`,
      }}
    >
      {loading ? 'Aguarde...' : children}
    </button>
  )
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', marginTop: 10, padding: '12px 0',
        background: 'transparent', border: `1px solid ${P.cardBorder}`,
        borderRadius: 12, cursor: 'pointer',
        fontFamily: P.bodyFont, fontWeight: 500, fontSize: 14,
        color: P.muted, transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  )
}

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? 20 : 6,
          height: 6, borderRadius: 3,
          background: i + 1 === step ? P.accent : P.cardBorder,
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: P.bodyFont, fontSize: 10, fontWeight: 700,
      color: P.accent, textTransform: 'uppercase', letterSpacing: '0.12em',
      display: 'block', marginBottom: 12,
    }}>
      {children}
    </span>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────
function ServicesStep({ services, selected, onSelect, onNext }: {
  services: ServiceItem[]
  selected: ServiceItem | null
  onSelect: (s: ServiceItem) => void
  onNext: () => void
}) {
  return (
    <div>
      <h2 style={{
        fontFamily: P.titleFont, fontSize: 24, fontWeight: 700,
        color: P.text, margin: '0 0 4px',
      }}>
        Escolha o serviço
      </h2>
      <p style={{ fontFamily: P.bodyFont, fontSize: 13, color: P.muted, margin: '0 0 24px' }}>
        Selecione o que deseja realizar
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {services.map((svc) => {
          const isSelected = selected?.id === svc.id
          return (
            <div
              key={svc.id}
              onClick={() => onSelect(svc)}
              style={{
                padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                background: isSelected ? 'rgba(201,166,122,0.12)' : P.card,
                border: `1.5px solid ${isSelected ? P.accent : P.cardBorder}`,
                transition: 'all 0.2s ease',
                boxShadow: isSelected ? `0 4px 20px ${P.accentGlow}` : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{
                    fontFamily: P.bodyFont, fontWeight: 600, fontSize: 15, color: P.text,
                    display: 'block',
                  }}>
                    {svc.name}
                  </span>
                  <span style={{ fontFamily: P.bodyFont, fontSize: 12, color: P.muted, marginTop: 2, display: 'block' }}>
                    {svc.duration_minutes} min
                  </span>
                </div>
                <span style={{
                  fontFamily: P.bodyFont, fontWeight: 700, fontSize: 16,
                  color: isSelected ? P.accent : P.mutedStrong,
                }}>
                  {formatBRL(svc.price_cents ?? 0)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <GoldBtn onClick={onNext} disabled={!selected}>
        PRÓXIMO
      </GoldBtn>
    </div>
  )
}

function DateTimeStep({ service, availableDays, selectedDate, selectedTime, timeSlots, slotLoading, onSelectDate, onSelectTime, onNext, onBack }: {
  service: ServiceItem
  availableDays: string[]
  selectedDate: string
  selectedTime?: string
  timeSlots: string[]
  slotLoading: boolean
  onSelectDate: (d: string) => void
  onSelectTime: (t: string) => void
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 style={{
        fontFamily: P.titleFont, fontSize: 24, fontWeight: 700,
        color: P.text, margin: '0 0 4px',
      }}>
        Data e horário
      </h2>
      <p style={{ fontFamily: P.bodyFont, fontSize: 13, color: P.muted, margin: '0 0 24px' }}>
        {service.name} — {formatBRL(service.price_cents ?? 0)}
      </p>

      <div style={{ marginBottom: 24 }}>
        <SectionLabel>Escolha o dia</SectionLabel>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {availableDays.map((dateStr) => {
            const { dayNum, dayName } = getDayLabel(dateStr)
            const isSelected = dateStr === selectedDate
            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                style={{
                  minWidth: 52, padding: '10px 0', borderRadius: 12,
                  textAlign: 'center', cursor: 'pointer',
                  background: isSelected ? P.accent : P.card,
                  border: `1px solid ${isSelected ? P.accent : P.cardBorder}`,
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? `0 4px 16px ${P.accentGlow}` : 'none',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  fontSize: 9, fontWeight: 700, fontFamily: P.bodyFont,
                  color: isSelected ? '#1a0e05' : P.muted, textTransform: 'uppercase', letterSpacing: 1,
                }}>{dayName}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, fontFamily: P.bodyFont,
                  color: isSelected ? '#1a0e05' : P.text, marginTop: 2,
                }}>{dayNum}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Horários disponíveis</SectionLabel>
        {slotLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `2.5px solid ${P.cardBorder}`, borderTopColor: P.accent,
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
        ) : timeSlots.length === 0 && selectedDate ? (
          <p style={{
            fontFamily: P.bodyFont, fontSize: 13, color: P.muted,
            textAlign: 'center', padding: '20px 0', fontStyle: 'italic',
          }}>
            Nenhum horário disponível neste dia.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {timeSlots.map((time) => {
              const isSelected = time === selectedTime
              return (
                <span
                  key={time}
                  onClick={() => onSelectTime(time)}
                  style={{
                    padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                    background: isSelected ? P.accent : P.card,
                    border: `1px solid ${isSelected ? P.accent : P.cardBorder}`,
                    color: isSelected ? '#1a0e05' : P.text,
                    fontSize: 14, fontWeight: 600, fontFamily: P.bodyFont,
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 4px 12px ${P.accentGlow}` : 'none',
                  }}
                >
                  {time}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <GoldBtn onClick={onNext} disabled={!selectedDate || !selectedTime}>
        PRÓXIMO
      </GoldBtn>
      <GhostBtn onClick={onBack}>Voltar</GhostBtn>
    </div>
  )
}

function ClientStep({ clientName, clientPhone, clientPhoneTouched, onNameChange, onPhoneChange, onPhoneBlur, onNext, onBack }: {
  clientName: string
  clientPhone: string
  clientPhoneTouched: boolean
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onPhoneBlur: () => void
  onNext: () => void
  onBack: () => void
}) {
  const phoneInvalid = clientPhoneTouched && clientPhone && !isValidBrazilMobilePhone(clientPhone)

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 10,
    background: P.inputBg, border: `1.5px solid ${P.inputBorder}`,
    fontSize: 15, fontFamily: P.bodyFont, color: P.text, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s ease',
  }

  return (
    <div>
      <h2 style={{
        fontFamily: P.titleFont, fontSize: 24, fontWeight: 700,
        color: P.text, margin: '0 0 4px',
      }}>
        Seus dados
      </h2>
      <p style={{ fontFamily: P.bodyFont, fontSize: 13, color: P.muted, margin: '0 0 24px' }}>
        Para confirmar seu agendamento
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: P.bodyFont, fontSize: 12, fontWeight: 600, color: P.mutedStrong, display: 'block', marginBottom: 6 }}>
          Nome completo
        </label>
        <input
          value={clientName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Seu nome"
          style={inputStyle}
          onFocus={(e) => { e.target.style.borderColor = P.accent }}
          onBlur={(e) => { e.target.style.borderColor = P.inputBorder }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontFamily: P.bodyFont, fontSize: 12, fontWeight: 600, color: P.mutedStrong, display: 'block', marginBottom: 6 }}>
          WhatsApp
        </label>
        <input
          value={clientPhone}
          onChange={(e) => onPhoneChange(phoneMask(e.target.value))}
          onBlur={(e) => {
            onPhoneBlur()
            e.target.style.borderColor = phoneInvalid ? P.error : P.inputBorder
          }}
          placeholder="(53) 99912-9090"
          inputMode="numeric"
          maxLength={15}
          style={{ ...inputStyle, borderColor: phoneInvalid ? P.error : P.inputBorder }}
          onFocus={(e) => { e.target.style.borderColor = P.accent }}
        />
        {phoneInvalid && (
          <p style={{ color: P.error, fontSize: 12, margin: '6px 0 0', fontFamily: P.bodyFont }}>
            Informe DDD + celular com 9 dígitos.
          </p>
        )}
      </div>

      <GoldBtn onClick={onNext} disabled={!clientName.trim() || !isValidBrazilMobilePhone(clientPhone)}>
        REVISAR
      </GoldBtn>
      <GhostBtn onClick={onBack}>Voltar</GhostBtn>
    </div>
  )
}

function ConfirmStep({ service, selectedDate, selectedTime, clientName, clientPhone, submitting, onSubmit, onBack }: {
  service: ServiceItem
  selectedDate: string
  selectedTime: string
  clientName: string
  clientPhone: string
  submitting: boolean
  onSubmit: () => void
  onBack: () => void
}) {
  const rows = [
    { label: 'Serviço', value: service.name },
    { label: 'Valor', value: formatBRL(service.price_cents ?? 0) },
    { label: 'Duração', value: `${service.duration_minutes} min` },
    { label: 'Data', value: formatDateLong(selectedDate) },
    { label: 'Horário', value: selectedTime },
    { label: 'Nome', value: clientName },
    { label: 'WhatsApp', value: clientPhone },
  ]

  return (
    <div>
      <h2 style={{
        fontFamily: P.titleFont, fontSize: 24, fontWeight: 700,
        color: P.text, margin: '0 0 4px',
      }}>
        Confirmar
      </h2>
      <p style={{ fontFamily: P.bodyFont, fontSize: 13, color: P.muted, margin: '0 0 24px' }}>
        Revise os dados do seu agendamento
      </p>

      <div style={{
        background: P.card, border: `1px solid ${P.cardBorder}`,
        borderRadius: 14, overflow: 'hidden',
      }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '13px 18px',
            borderBottom: i < rows.length - 1 ? `1px solid ${P.cardBorder}` : 'none',
          }}>
            <span style={{ fontFamily: P.bodyFont, fontSize: 13, color: P.muted }}>{row.label}</span>
            <span style={{ fontFamily: P.bodyFont, fontSize: 14, fontWeight: 600, color: P.text }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      <GoldBtn onClick={onSubmit} disabled={submitting} loading={submitting}>
        CONFIRMAR AGENDAMENTO
      </GoldBtn>
      <GhostBtn onClick={onBack}>Voltar</GhostBtn>
    </div>
  )
}

function SuccessScreen({ service, selectedDate, selectedTime, clientName, professional }: {
  service: ServiceItem
  selectedDate: string
  selectedTime: string
  clientName: string
  professional: Professional | null
}) {
  const whatsApp = professional?.phone
    ? `https://wa.me/${professional.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
        `Olá! Confirmei meu agendamento de ${service.name} para ${formatDateLong(selectedDate)} às ${selectedTime}. Meu nome é ${clientName}.`
      )}`
    : null

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(74,222,128,0.12)', border: `2px solid ${P.success}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', fontSize: 28,
      }}>
        ✓
      </div>

      <h2 style={{
        fontFamily: P.titleFont, fontSize: 26, fontWeight: 700,
        color: P.text, margin: '0 0 8px',
      }}>
        Agendado!
      </h2>
      <p style={{ fontFamily: P.bodyFont, fontSize: 14, color: P.muted, margin: '0 0 28px' }}>
        Seu horário está confirmado
      </p>

      <div style={{
        background: P.card, border: `1px solid ${P.cardBorder}`,
        borderRadius: 14, padding: '20px 18px', marginBottom: 20, textAlign: 'left',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Serviço', value: service.name },
            { label: 'Data', value: formatDateLong(selectedDate) },
            { label: 'Horário', value: selectedTime },
            { label: 'Valor', value: formatBRL(service.price_cents ?? 0) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: P.bodyFont, fontSize: 13, color: P.muted }}>{row.label}</span>
              <span style={{ fontFamily: P.bodyFont, fontSize: 14, fontWeight: 600, color: P.text }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {whatsApp && (
        <a
          href={whatsApp}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', width: '100%', padding: '14px 0', borderRadius: 12,
            background: '#25D366', textDecoration: 'none',
            fontFamily: P.bodyFont, fontWeight: 700, fontSize: 14,
            color: '#fff', textAlign: 'center',
            boxShadow: '0 6px 20px rgba(37,211,102,0.25)',
          }}
        >
          Confirmar no WhatsApp
        </a>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfessionalBookingPage() {
  const [slug] = useState<string | null>(() => {
    const parts = window.location.pathname.split('/').filter(Boolean)
    return parts[0] === 'p' ? parts[1] || null : null
  })
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [serviceList, setServiceList] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState<string>()
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [slotLoading, setSlotLoading] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientPhoneTouched, setClientPhoneTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  const availableDays = getNext14Days()

  // Fetch professional
  useEffect(() => {
    if (!slug) { setError('Link inválido.'); setLoading(false); return }
    const load = async () => {
      try {
        setLoading(true)
        const prof = await getProfessional(slug)
        setProfessional(prof)
        setError(null)
        const active = (prof.services ?? []).filter(s => (s as any).is_active !== false)
        setServiceList(active)
        if (!active.length) setError('Nenhum serviço disponível no momento.')
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Profissional não encontrado.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  // Auto-select first date when entering step 2
  useEffect(() => {
    if (step === 2 && !selectedDate && selectedService) {
      const first = availableDays.find(d => new Date(d + 'T12:00:00').getDay() !== 0)
      if (first) setSelectedDate(first)
    }
  }, [step, selectedService])

  const fetchSlots = useCallback(async (date: string) => {
    if (!slug || !selectedService) return
    setSlotLoading(true)
    setSelectedTime(undefined)
    try {
      const slots = await getAvailableTimeSlots(slug, date, selectedService.id)
      setTimeSlots(slots)
    } catch { setTimeSlots([]) }
    finally { setSlotLoading(false) }
  }, [slug, selectedService])

  useEffect(() => {
    if (selectedDate && professional && selectedService) fetchSlots(selectedDate)
  }, [selectedDate, professional, selectedService])

  const handleSubmit = async () => {
    if (!professional || !selectedService || !selectedDate || !selectedTime) return
    if (!isValidBrazilMobilePhone(clientPhone)) {
      setError('WhatsApp inválido.')
      setStep(3)
      setClientPhoneTouched(true)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await createPublicAppointment({
        professional_id: professional.id,
        service_id: selectedService.id,
        scheduled_at: `${selectedDate}T${selectedTime}:00-03:00`,
        client_name: clientName,
        client_phone: clientPhone,
      })
      setBookingSuccess(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao agendar.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Background ─────────────────────────────────────────────────────────────
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: `radial-gradient(ellipse at 20% 0%, rgba(201,166,122,0.07) 0%, transparent 50%),
                 radial-gradient(ellipse at 80% 100%, rgba(150,90,120,0.07) 0%, transparent 50%),
                 ${P.bg}`,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 16px 40px',
    fontFamily: P.bodyFont,
  }

  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 440,
    background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${P.cardBorder}`,
    borderRadius: P.radius, padding: '28px 24px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
  }

  if (loading) {
    return (
      <div style={{ ...pageStyle, justifyContent: 'center' }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `3px solid ${P.cardBorder}`, borderTopColor: P.accent,
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (error && !professional) {
    return (
      <div style={{ ...pageStyle, justifyContent: 'center' }}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <p style={{ fontSize: 40, margin: '0 0 12px' }}>✂️</p>
          <p style={{ color: P.error, fontFamily: P.bodyFont, fontSize: 15 }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        * { box-sizing: border-box; }
        body { margin: 0; background: ${P.bg}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: ${P.cardBorder}; border-radius: 2px; }
        input::placeholder { color: ${P.muted}; }
      `}</style>

      <div style={pageStyle}>
        {/* Hero */}
        <div style={{
          width: '100%', maxWidth: 440, padding: '40px 0 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          {/* Avatar */}
          <div style={{
            width: 82, height: 82, borderRadius: '50%', overflow: 'hidden',
            border: `2px solid ${P.accent}`,
            boxShadow: `0 0 0 4px ${P.accentGlow}`,
          }}>
            {professional?.avatar_url ? (
              <img
                src={professional.avatar_url}
                alt={professional.display_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${P.accent}, ${P.accentDark})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, color: '#1a0e05', fontWeight: 700,
              }}>
                {professional?.display_name?.[0] ?? '✂'}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontFamily: P.titleFont, fontSize: 22, fontWeight: 700,
              color: P.text, margin: '0 0 6px',
            }}>
              {professional?.display_name}
            </h1>
            <span style={{
              display: 'inline-block', padding: '3px 12px', borderRadius: 20,
              background: 'rgba(201,166,122,0.12)', border: `1px solid ${P.accentGlow}`,
              fontFamily: P.bodyFont, fontSize: 11, fontWeight: 600,
              color: P.accent, letterSpacing: '0.06em',
            }}>
              {businessLabel(professional?.business_type)}
            </span>
          </div>
        </div>

        {/* Card */}
        <div style={cardStyle}>
          {!bookingSuccess && <ProgressDots step={step} total={4} />}

          {error && !bookingSuccess && (
            <div style={{
              background: 'rgba(248,113,113,0.1)', border: `1px solid rgba(248,113,113,0.3)`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: P.error, fontFamily: P.bodyFont,
            }}>
              {error}
            </div>
          )}

          {bookingSuccess && selectedService && selectedDate && selectedTime ? (
            <SuccessScreen
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              clientName={clientName}
              professional={professional}
            />
          ) : step === 1 ? (
            <ServicesStep
              services={serviceList}
              selected={selectedService}
              onSelect={setSelectedService}
              onNext={() => setStep(2)}
            />
          ) : step === 2 && selectedService ? (
            <DateTimeStep
              service={selectedService}
              availableDays={availableDays}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              timeSlots={timeSlots}
              slotLoading={slotLoading}
              onSelectDate={setSelectedDate}
              onSelectTime={setSelectedTime}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          ) : step === 3 ? (
            <ClientStep
              clientName={clientName}
              clientPhone={clientPhone}
              clientPhoneTouched={clientPhoneTouched}
              onNameChange={setClientName}
              onPhoneChange={setClientPhone}
              onPhoneBlur={() => setClientPhoneTouched(true)}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          ) : step === 4 && selectedService ? (
            <ConfirmStep
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime ?? ''}
              clientName={clientName}
              clientPhone={clientPhone}
              submitting={submitting}
              onSubmit={handleSubmit}
              onBack={() => setStep(3)}
            />
          ) : null}
        </div>

        {/* Footer */}
        <p style={{
          fontFamily: P.bodyFont, fontSize: 11, color: 'rgba(245,239,233,0.2)',
          marginTop: 24, letterSpacing: '0.04em',
        }}>
          Agendamento via AiMarco
        </p>
      </div>
    </>
  )
}
