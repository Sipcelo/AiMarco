import React from 'react'
import { T } from './booking-theme'

interface PrimaryBtnProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
}

export function PrimaryBtn({ children, onClick, disabled, style: extra }: PrimaryBtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', padding: '14px 0', marginTop: 8,
        borderRadius: 12, fontWeight: 700, fontSize: 15,
        color: '#fff', letterSpacing: 0.5, cursor: disabled ? 'default' : 'pointer',
        background: disabled ? '#ccc' : T.primary,
        boxShadow: disabled ? 'none' : T.btnShadow,
        border: 'none', outline: 'none',
        transition: 'background-color 0.2s ease, transform 0.2s ease',
        fontFamily: T.bodyFont,
        ...extra,
      }}
    >
      {children}
    </button>
  )
}

interface BackBtnProps {
  onClick: () => void
}

export function BackBtn({ onClick }: BackBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: `1.5px solid ${T.border}`,
        borderRadius: 12, padding: '12px 0', width: '100%',
        fontWeight: 600, fontSize: 14, color: T.muted, cursor: 'pointer',
        marginTop: 8, fontFamily: T.bodyFont,
        transition: 'border-color 0.2s ease, color 0.2s ease',
      }}
    >
      Voltar
    </button>
  )
}
