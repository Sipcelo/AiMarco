import { T } from './booking-theme'
import { formatBRL } from './booking-utils'
import { PrimaryBtn } from './BookingButtons'
import type { ServiceItem } from '../../data/public.api'

interface ServiceStepProps {
  services: ServiceItem[]
  selected: ServiceItem | null
  onSelect: (svc: ServiceItem) => void
  onNext: () => void
}

export function ServiceStep({ services, selected, onSelect, onNext }: ServiceStepProps) {
  return (
    <div>
      <h2 style={{
        fontFamily: T.titleFont, fontWeight: 700, fontSize: 22,
        color: T.text, margin: '0 0 6px',
        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Escolha seu serviço
      </h2>
      <p style={{ fontFamily: T.bodyFont, fontSize: 13, color: T.muted, margin: '0 0 24px' }}>
        Selecione o tratamento que deseja realizar
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {services.map((svc) => {
          const isSelected = selected?.id === svc.id
          return (
            <div
              key={svc.id}
              onClick={() => onSelect(svc)}
              style={{
                padding: '16px 18px', borderRadius: 14,
                background: isSelected ? T.softPinkStrong : T.surfaceStrong,
                border: isSelected ? `2px solid ${T.primary}` : `1px solid ${T.border}`,
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: isSelected ? '0 4px 14px rgba(239,111,145,0.12)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 15, color: T.text }}>
                    {svc.name}
                  </span>
                  {svc.description && (
                    <span style={{ display: 'block', fontFamily: T.bodyFont, fontSize: 12, color: T.muted, marginTop: 2 }}>
                      {svc.description}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 15, color: T.primary }}>
                    {formatBRL(svc.price_cents)}
                  </span>
                  <span style={{ fontSize: 11, color: T.muted, fontFamily: T.bodyFont }}>
                    {svc.duration_minutes} min
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <PrimaryBtn onClick={onNext} disabled={!selected}>
        PRÓXIMO
      </PrimaryBtn>
    </div>
  )
}
