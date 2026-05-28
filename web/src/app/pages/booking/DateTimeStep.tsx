import { T } from './booking-theme'
import { getDayLabel, formatBRL } from './booking-utils'
import { PrimaryBtn, BackBtn } from './BookingButtons'
import type { ServiceItem } from '../../data/public.api'

interface DateTimeStepProps {
  service: ServiceItem
  availableDays: string[]
  selectedDate: string
  selectedTime?: string
  timeSlots: string[]
  slotLoading: boolean
  onSelectDate: (date: string) => void
  onSelectTime: (time: string) => void
  onNext: () => void
  onBack: () => void
}

export function DateTimeStep({
  service, availableDays, selectedDate, selectedTime,
  timeSlots, slotLoading, onSelectDate, onSelectTime, onNext, onBack,
}: DateTimeStepProps) {
  return (
    <div>
      <h2 style={{
        fontFamily: T.titleFont, fontWeight: 700, fontSize: 22,
        color: T.text, margin: '0 0 6px',
        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Data e horário
      </h2>
      <p style={{ fontFamily: T.bodyFont, fontSize: 13, color: T.muted, margin: '0 0 24px' }}>
        {service.name} — {formatBRL(service.price_cents)}
      </p>

      <div style={{ marginBottom: 24 }}>
        <span style={{
          fontFamily: T.bodyFont, fontSize: 12, fontWeight: 700,
          color: T.muted, textTransform: 'uppercase', letterSpacing: 1,
        }}>Escolha o dia</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', paddingBottom: 4 }}>
          {availableDays.map((dateStr) => {
            const { dayNum, dayName } = getDayLabel(dateStr)
            const isSelected = dateStr === selectedDate
            return (
              <div
                key={dateStr}
                onClick={() => onSelectDate(dateStr)}
                style={{
                  minWidth: 56, padding: '10px 0',
                  borderRadius: 14, textAlign: 'center',
                  background: isSelected ? T.primary : T.surfaceStrong,
                  border: `1px solid ${isSelected ? T.primary : T.border}`,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: isSelected ? T.btnShadow : 'none',
                }}
              >
                <div style={{
                  fontSize: 10, fontWeight: 700, fontFamily: T.bodyFont,
                  color: isSelected ? '#fff' : T.muted, textTransform: 'uppercase',
                }}>{dayName}</div>
                <div style={{
                  fontSize: 18, fontWeight: 700, fontFamily: T.bodyFont,
                  color: isSelected ? '#fff' : T.text,
                }}>{dayNum}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: T.bodyFont, fontSize: 12, fontWeight: 700,
          color: T.muted, textTransform: 'uppercase', letterSpacing: 1,
        }}>Horários disponíveis</span>
        {slotLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: `3px solid ${T.border}`, borderTopColor: T.primary,
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        ) : timeSlots.length === 0 && selectedDate ? (
          <p style={{
            fontFamily: T.bodyFont, fontSize: 13, color: T.primaryDark,
            textAlign: 'center', padding: 16, fontWeight: 600,
          }}>
            Nenhum horário disponível neste dia. Por favor, escolha outra data.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {timeSlots.map((time) => {
              const isSelected = time === selectedTime
              return (
                <span
                  key={time}
                  onClick={() => onSelectTime(time)}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    background: isSelected ? T.primary : T.surfaceStrong,
                    border: `1.5px solid ${isSelected ? T.primary : T.border}`,
                    color: isSelected ? '#fff' : T.text,
                    fontSize: 14, fontWeight: 600, fontFamily: T.bodyFont,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: isSelected ? T.btnShadow : 'none',
                  }}
                >
                  {time}
                </span>
              )
            })}
          </div>
        )}
      </div>

      <PrimaryBtn onClick={onNext} disabled={!selectedDate || !selectedTime}>
        PRÓXIMO
      </PrimaryBtn>
      <BackBtn onClick={onBack} />
    </div>
  )
}
