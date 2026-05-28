import { useState, useEffect, useCallback } from 'react'
import {
  getProfessional,
  getAvailableTimeSlots,
  createPublicAppointment,
  type ServiceItem,
  type Professional,
} from '../data/public.api'
import { BrandFooter } from '../components/ui/BrandFooter'
import { T } from './booking/booking-theme'
import { isValidBrazilMobilePhone, getNext14Days } from './booking/booking-utils'
import { StepperBar } from './booking/StepperBar'
import { ServiceStep } from './booking/ServiceStep'
import { DateTimeStep } from './booking/DateTimeStep'
import { ClientStep } from './booking/ClientStep'
import { ConfirmStep } from './booking/ConfirmStep'
import { BookingSuccess } from './booking/BookingSuccess'

const BG_IMAGE = "url('/img/ChatGPT Image 23 de mar. de 2026, 11_54_16.png')"

export default function PublicBooking() {
  const [step, setStep] = useState(1)
  const [slug, setSlug] = useState<string | null>(null)

  const [serviceList, setServiceList] = useState<ServiceItem[]>([])
  const [professional, setProfessional] = useState<Professional | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState<string>()
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [slotLoading, setSlotLoading] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientPhoneTouched, setClientPhoneTouched] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const availableDays = getNext14Days()

  useEffect(() => {
    const path = window.location.pathname
    const parts = path.split('/').filter(Boolean)
    let resolvedSlug = parts[1] || ''
    if (parts[0] === 'example-m') resolvedSlug = 'example-m'
    if (parts[0]?.toLowerCase() === 'example-s') resolvedSlug = 'example-s'
    if (!resolvedSlug) {
      const params = new URLSearchParams(window.location.search)
      resolvedSlug = params.get('slug') || ''
    }
    setSlug(resolvedSlug)
  }, [])

  useEffect(() => {
    if (!slug) {
      setError('Profissional não encontrado. Verifique o link.')
      setLoading(false)
      return
    }
    const fetchProfile = async () => {
      try {
        setLoading(true)
        setError(null)
        const prof = await getProfessional(slug)
        setProfessional(prof)
        if (prof.services && prof.services.length > 0) {
          setServiceList(prof.services)
        } else {
          setError('Serviços não configurados para este profissional.')
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao carregar perfil do profissional.'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [slug])

  const fetchSlots = useCallback(async (date: string) => {
    if (!slug || !selectedService) return
    setSlotLoading(true)
    setSelectedTime(undefined)
    try {
      const slots = await getAvailableTimeSlots(slug, date, selectedService.id)
      setTimeSlots(slots)
    } catch {
      setTimeSlots([])
    } finally {
      setSlotLoading(false)
    }
  }, [slug, selectedService])

  useEffect(() => {
    if (!selectedDate || !professional || !selectedService) return
    fetchSlots(selectedDate)
  }, [selectedDate, professional, selectedService])

  useEffect(() => {
    if (step === 2 && !selectedDate && selectedService) {
      const firstWeekDay = availableDays.find(d => new Date(d + 'T12:00:00').getDay() !== 0)
      const defaultDay = firstWeekDay || availableDays[0]
      if (defaultDay) setSelectedDate(defaultDay)
    }
  }, [step, selectedService])

  const handleSubmit = async () => {
    if (!professional || !selectedService || !selectedDate || !selectedTime) return
    if (!isValidBrazilMobilePhone(clientPhone)) {
      setError('Informe um WhatsApp brasileiro com DDD e 9 digitos. Ex: (53) 99912-9090.')
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao agendar. Tente novamente.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bgGradient }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.border}`, borderTopColor: T.primary, animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  if (bookingSuccess && selectedService && selectedDate && selectedTime) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        backgroundImage: `radial-gradient(circle at 18% 18%, rgba(239,111,145,0.32), transparent 30%), radial-gradient(circle at 82% 18%, rgba(201,169,110,0.18), transparent 28%), linear-gradient(rgba(69,31,44,0.52), rgba(69,31,44,0.52)), ${BG_IMAGE}`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
      }}>
        <div style={{
          width: '100%', maxWidth: 920,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.97), rgba(255,247,250,0.93))',
          borderRadius: T.radius, padding: 'clamp(24px, 4vw, 42px)',
          boxShadow: '0 26px 80px rgba(48, 31, 39, 0.26)',
          backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.72)',
        }}>
          <BookingSuccess
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            selectedService={selectedService}
            clientName={clientName}
            professional={professional}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        input::placeholder { color: ${T.placeholderText}; }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: ${T.bodyFont}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        backgroundImage: `linear-gradient(rgba(69,31,44,0.42), rgba(69,31,44,0.42)), ${BG_IMAGE}`,
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px',
      }}>
        <div style={{
          width: '100%', maxWidth: 430, background: T.surface,
          borderRadius: T.radius, padding: '28px 24px',
          boxShadow: T.shadow, backdropFilter: 'blur(6px)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <img src="/img/ico.png" alt="Logo" style={{
              width: 'min(100%, 60px)', maxWidth: 60, display: 'block', margin: '0 auto 8px',
              objectFit: 'contain',
              filter: 'brightness(1.08) contrast(1.18) saturate(1.06) drop-shadow(0 2px 0 rgba(255,244,247,0.95)) drop-shadow(0 4px 8px rgba(103,54,69,0.14))',
            }} />
            <h1 style={{ fontFamily: T.titleFont, fontSize: 20, fontWeight: 700, color: T.text, margin: '4px 0' }}>
              {professional?.display_name ?? ''}
            </h1>
            {professional?.bio && (
              <p style={{ fontSize: 12, color: T.muted, fontFamily: T.bodyFont, margin: 0 }}>{professional.bio}</p>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
              padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#dc2626', fontFamily: T.bodyFont,
            }}>
              {error}
            </div>
          )}

          <StepperBar step={step} />

          {step === 1 && (
            <ServiceStep
              services={serviceList}
              selected={selectedService}
              onSelect={setSelectedService}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && selectedService && (
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
          )}
          {step === 3 && (
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
          )}
          {step === 4 && selectedService && (
            <ConfirmStep
              service={selectedService}
              selectedDate={selectedDate}
              selectedTime={selectedTime || ''}
              clientName={clientName}
              clientPhone={clientPhone}
              submitting={submitting}
              onSubmit={handleSubmit}
              onBack={() => setStep(3)}
            />
          )}
          <BrandFooter />
        </div>
      </div>
    </>
  )
}
