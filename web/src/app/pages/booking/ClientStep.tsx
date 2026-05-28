import { T } from './booking-theme'
import { phoneMask, isValidBrazilMobilePhone } from './booking-utils'
import { PrimaryBtn, BackBtn } from './BookingButtons'

interface ClientStepProps {
  clientName: string
  clientPhone: string
  clientPhoneTouched: boolean
  onNameChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onPhoneBlur: () => void
  onNext: () => void
  onBack: () => void
}

export function ClientStep({
  clientName, clientPhone, clientPhoneTouched,
  onNameChange, onPhoneChange, onPhoneBlur, onNext, onBack,
}: ClientStepProps) {
  const phoneInvalid = clientPhoneTouched && clientPhone && !isValidBrazilMobilePhone(clientPhone)

  return (
    <div>
      <h2 style={{
        fontFamily: T.titleFont, fontWeight: 700, fontSize: 22,
        color: T.text, margin: '0 0 6px',
        background: `linear-gradient(135deg, ${T.primary}, ${T.primaryDark})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Seus dados
      </h2>
      <p style={{ fontFamily: T.bodyFont, fontSize: 13, color: T.muted, margin: '0 0 24px' }}>
        Preencha para confirmar o agendamento
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontFamily: T.bodyFont, fontSize: 13, fontWeight: 600,
          color: T.text, display: 'block', marginBottom: 4,
        }}>Nome</label>
        <input
          value={clientName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Seu nome completo"
          style={{
            width: '100%', border: `1.5px solid ${T.border}`,
            borderRadius: 10, padding: '14px 15px',
            fontSize: 15, fontFamily: T.bodyFont, color: T.text,
            background: T.surfaceStrong, outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = '0 0 0 4px rgba(239,111,145,0.1)' }}
          onBlur={(e) => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none' }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontFamily: T.bodyFont, fontSize: 13, fontWeight: 600,
          color: T.text, display: 'block', marginBottom: 4,
        }}>WhatsApp</label>
        <input
          value={clientPhone}
          onChange={(e) => onPhoneChange(phoneMask(e.target.value))}
          onBlur={(e) => {
            onPhoneBlur()
            e.target.style.borderColor = isValidBrazilMobilePhone(clientPhone) || !clientPhone
              ? T.border
              : '#dc2626'
            e.target.style.boxShadow = 'none'
          }}
          placeholder="(53) 99912-9090"
          inputMode="numeric"
          maxLength={15}
          style={{
            width: '100%',
            border: `1.5px solid ${phoneInvalid ? '#dc2626' : T.border}`,
            borderRadius: 10, padding: '14px 15px',
            fontSize: 15, fontFamily: T.bodyFont, color: T.text,
            background: T.surfaceStrong, outline: 'none',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = '0 0 0 4px rgba(239,111,145,0.1)' }}
        />
        {phoneInvalid && (
          <p style={{ color: '#dc2626', fontSize: 12, margin: '6px 0 0', fontFamily: T.bodyFont }}>
            Informe DDD + celular com 9 digitos. Ex: (53) 99912-9090.
          </p>
        )}
      </div>

      <PrimaryBtn onClick={onNext} disabled={!clientName.trim() || !isValidBrazilMobilePhone(clientPhone)}>
        REVISAR AGENDAMENTO
      </PrimaryBtn>
      <BackBtn onClick={onBack} />
    </div>
  )
}
