import { CheckCircle } from 'lucide-react'
import { T } from './booking-theme'
import { formatBRL, MONTH_NAMES } from './booking-utils'
import type { ServiceItem, Professional } from '../../data/public.api'

interface BookingSuccessProps {
  selectedDate: string
  selectedTime: string
  selectedService: ServiceItem
  clientName: string
  professional: Professional | null
}

export function BookingSuccess({ selectedDate, selectedTime, selectedService, clientName, professional }: BookingSuccessProps) {
  const contactHref = (() => {
    const rawPhone = professional?.phone?.replace(/\D/g, '') || '555399816749'
    const phone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`
    const message = encodeURIComponent('Ola! Quero conhecer a Auralynne para minha agenda.')
    return `https://wa.me/${phone}?text=${message}`
  })()

  const dateObj = new Date(selectedDate + 'T12:00:00')

  return (
    <div className="success-layout">
      <style>{`
        .success-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(240px, 280px);
          align-items: center;
          gap: 34px;
          padding: 30px 0;
          text-align: left;
        }
        .success-phone-frame {
          grid-column: 2;
          grid-row: 1 / span 6;
        }
        .success-next-card {
          display: grid;
          gap: 10px;
          border: 1px solid ${T.border};
          border-radius: 16px;
          background: linear-gradient(180deg, #fff7fa, #ffffff);
          padding: 14px;
          margin: 0 0 22px;
        }
        .success-next-card strong { color: ${T.text}; font-size: 14px; }
        .success-next-card span { color: ${T.muted}; font-size: 13px; line-height: 1.45; }
        .success-step-row {
          display: grid;
          grid-template-columns: 22px 1fr;
          align-items: start;
          gap: 9px;
        }
        .success-step-dot {
          width: 22px; height: 22px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          background: ${T.primary}; color: #fff; font-size: 12px; font-weight: 800;
        }
        .success-contact-button {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 48px; width: min(100%, 476px);
        }
        @media (max-width: 760px) {
          .success-layout { grid-template-columns: 1fr; text-align: center; gap: 24px; }
          .success-phone-frame { grid-column: auto !important; grid-row: auto !important; width: min(100%, 248px) !important; }
          .success-next-card { text-align: left; }
          .success-layout h2 { font-size: 26px !important; }
        }
      `}</style>

      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: T.primary, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 0 20px', boxShadow: T.btnShadow,
      }}>
        <CheckCircle size={40} className="text-white" />
      </div>

      <h2 style={{ fontFamily: T.titleFont, fontSize: 30, fontWeight: 700, color: T.text, margin: '0 0 8px' }}>
        Agendamento confirmado!
      </h2>
      <p style={{ fontFamily: T.bodyFont, fontSize: 15, color: T.muted, margin: '0 0 18px', lineHeight: 1.65 }}>
        Aguardamos voce em {selectedTime}h no dia {dateObj.getDate()} de {MONTH_NAMES[dateObj.getMonth()]}. Essa e a experiencia que seus clientes podem ter com a sua vitrine.
      </p>

      <div className="success-next-card">
        <div className="success-step-row">
          <span className="success-step-dot">1</span>
          <span><strong>Confirmacao na hora</strong><br />O cliente sai do fluxo com data, horario e servico bem claros.</span>
        </div>
        <div className="success-step-row">
          <span className="success-step-dot">2</span>
          <span><strong>Entrada na agenda mobile</strong><br />O profissional recebe o novo agendamento no painel do celular.</span>
        </div>
        <div className="success-step-row">
          <span className="success-step-dot">3</span>
          <span><strong>Proximo contato</strong><br />O botao abaixo leva para o atendimento comercial da demo.</span>
        </div>
      </div>

      <div className="success-phone-frame" style={{
        width: 248, minHeight: 456, margin: '0 auto 24px',
        borderRadius: 34, padding: 10, background: '#050b16',
        boxShadow: '0 24px 55px rgba(10, 25, 47, 0.38)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}>
        <div style={{ width: 76, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.22)', margin: '2px auto 10px' }} />
        <div style={{ minHeight: 424, borderRadius: 26, background: '#0A192F', padding: 14, color: '#FFF', textAlign: 'left', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700, color: '#8892A4', marginBottom: 14 }}>
            <span>9:41</span>
            <span style={{ color: '#00D2FF' }}>Auralynne</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: '#1A1A2E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800 }}>A</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontSize: 16, fontWeight: 800 }}>Agenda de hoje</div>
              <div style={{ color: '#00D2FF', fontSize: 12, fontWeight: 700 }}>{selectedTime} - proximo cliente</div>
            </div>
          </div>
          <div style={{ borderRadius: 10, background: '#1A1A2E', border: '1px solid rgba(255,255,255,0.05)', padding: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: '#00D2FF', fontSize: 18 }}>•</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontSize: 13, fontWeight: 700 }}>Novo agendamento recebido</div>
              <div style={{ color: '#8892A4', fontSize: 11, marginTop: 2 }}>{clientName} acabou de confirmar pelo link publico.</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ background: '#1A1A2E', borderRadius: 12, padding: 11, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#00D2FF', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>1</div>
              <div style={{ color: '#8892A4', fontSize: 10, marginTop: 4 }}>confirmado</div>
            </div>
            <div style={{ background: '#1A1A2E', borderRadius: 12, padding: 11, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#25D371', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{formatBRL(selectedService.price_cents)}</div>
              <div style={{ color: '#8892A4', fontSize: 10, marginTop: 4 }}>valor</div>
            </div>
          </div>
          <div style={{ color: '#FFF', fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Agendamentos</div>
          <div style={{ display: 'flex', alignItems: 'center', background: '#1A1A2E', borderRadius: 12, padding: 12, borderLeft: '3px solid #00D2FF', marginBottom: 8 }}>
            <div style={{ width: 48, marginRight: 8, color: '#FFF', fontSize: 13, fontWeight: 800 }}>{selectedTime}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#FFF', fontSize: 13, fontWeight: 700 }}>{clientName}</div>
              <div style={{ color: '#8892A4', fontSize: 11, marginTop: 2 }}>{selectedService.name}</div>
            </div>
            <div style={{ borderRadius: 6, border: '1px solid #00D2FF', padding: '3px 6px', color: '#00D2FF', fontSize: 8, fontWeight: 800 }}>OK</div>
          </div>
          <div style={{ background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.28)', borderRadius: 12, padding: 11, color: '#B8F3FF', fontSize: 11, lineHeight: 1.45 }}>
            O profissional ve o horario entrar na agenda mobile em poucos segundos.
          </div>
        </div>
      </div>

      <a
        className="success-contact-button"
        href={contactHref}
        target="_blank"
        rel="noreferrer"
        style={{
          padding: '12px 32px', borderRadius: 12,
          background: T.primary, color: '#fff',
          fontWeight: 700, fontSize: 14, border: 'none',
          cursor: 'pointer', fontFamily: T.bodyFont,
          boxShadow: T.btnShadow, textDecoration: 'none',
        }}
      >
        Contate-nos
      </a>
    </div>
  )
}
