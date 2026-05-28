import { T } from './booking-theme'
import { formatBRL, isValidBrazilMobilePhone, MONTH_NAMES } from './booking-utils'
import { PrimaryBtn, BackBtn } from './BookingButtons'
import type { ServiceItem } from '../../data/public.api'

interface ConfirmStepProps {
  service: ServiceItem
  selectedDate: string
  selectedTime: string
  clientName: string
  clientPhone: string
  submitting: boolean
  onSubmit: () => void
  onBack: () => void
}

export function ConfirmStep({
  service, selectedDate, selectedTime,
  clientName, clientPhone, submitting, onSubmit, onBack,
}: ConfirmStepProps) {
  const dateLabel = (() => {
    const d = new Date(selectedDate + 'T12:00:00')
    return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`
  })()

  const rows = [
    { icon: '💇', label: 'Serviço', value: service.name },
    { icon: '💰', label: 'Valor', value: formatBRL(service.price_cents) },
    { icon: '📅', label: 'Data', value: dateLabel },
    { icon: '🕐', label: 'Horário', value: selectedTime },
    { icon: '👤', label: 'Nome', value: clientName },
    { icon: '📱', label: 'WhatsApp', value: clientPhone },
  ]

  return (
    <div>
      <h2 style={{
        fontFamily: T.titleFont, fontWeight: 700, fontSize: 22,
        color: T.text, margin: '0 0 6px',
        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Resumo do agendamento
      </h2>
      <p style={{ fontFamily: T.bodyFont, fontSize: 13, color: T.muted, margin: '0 0 24px' }}>
        Confira os dados antes de confirmar
      </p>

      {rows.map(row => (
        <div key={row.label} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 0', borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>{row.icon}</span>
            <span style={{ fontFamily: T.bodyFont, fontSize: 13, color: T.muted }}>{row.label}</span>
          </div>
          <span style={{ fontFamily: T.bodyFont, fontSize: 14, fontWeight: 600, color: T.text }}>
            {row.value}
          </span>
        </div>
      ))}

      <PrimaryBtn
        onClick={onSubmit}
        disabled={submitting || !clientName.trim() || !isValidBrazilMobilePhone(clientPhone)}
        style={{ marginTop: 20, background: submitting ? T.muted : T.primary }}
      >
        {submitting ? 'CONFIRMANDO...' : 'CONFIRMAR AGENDAMENTO'}
      </PrimaryBtn>
      <BackBtn onClick={onBack} />
    </div>
  )
}
