import React from 'react'
import { T } from './booking-theme'

const LABELS = ['Serviço', 'Data e Hora', 'Seus Dados', 'Confirmar']

interface StepperBarProps {
  step: number
}

export function StepperBar({ step }: StepperBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {LABELS.map((label, idx) => {
        const isComplete = step > idx + 1
        const isCurrent = step === idx + 1
        return (
          <React.Fragment key={label}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
                background: (isComplete || isCurrent) ? T.primary : 'transparent',
                color: (isComplete || isCurrent) ? '#fff' : '#aaa',
                border: `2px solid ${isCurrent ? T.primary : (isComplete ? T.primary : '#ddd')}`,
                boxShadow: isCurrent ? T.btnShadow : 'none',
                fontFamily: T.bodyFont,
                transition: 'all 0.2s ease',
              }}>
                {isComplete ? '✓' : (idx + 1)}
              </div>
              <span style={{
                fontSize: 11, color: isCurrent ? T.text : T.muted,
                fontWeight: isCurrent ? 700 : 500,
                fontFamily: T.bodyFont,
                marginTop: 6,
              }}>{label}</span>
            </div>
            {idx < LABELS.length - 1 && (
              <div style={{
                flex: 1, height: 2, margin: '0 6px 20px',
                background: idx < step - 1 ? T.primary : '#e5e0db',
                borderRadius: 1,
                maxWidth: 60,
              }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
