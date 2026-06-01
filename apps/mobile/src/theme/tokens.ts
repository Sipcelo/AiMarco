/**
 * Design tokens — direção "Light Premium" (agenda mobile).
 *
 * Fundo claro de alto contraste, cards brancos com sombra suave, acento indigo.
 * Inspirado em apps de produtividade modernos (Linear/Things), com hierarquia
 * por escala e ritmo de espaçamento intencional (não padding uniforme).
 */

export const palette = {
  // Superfícies
  bg: '#F6F7FB',
  bgSoft: '#FAFBFD',
  surface: '#FFFFFF',
  surfaceSunken: '#F1F3F9',

  // Texto
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',

  // Acento (indigo)
  accent: '#4F46E5',
  accentSoft: '#EEF0FE',
  accentText: '#FFFFFF',

  // Bordas / linhas
  border: '#E7E9F2',
  borderStrong: '#D8DBEA',

  // Status
  confirmed: '#4F46E5',
  completed: '#16A34A',
  cancelled: '#EF4444',
  noShow: '#F59E0B',

  // Tints (fundo translúcido por status)
  confirmedTint: '#EEF0FE',
  completedTint: '#E7F6ED',
  cancelledTint: '#FDECEC',
  noShowTint: '#FEF3E2',

  // Misc
  backdrop: 'rgba(15, 23, 42, 0.45)',
  skeleton: '#E9ECF4',
  skeletonHighlight: '#F4F6FB',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '500' as const },
  label: { fontSize: 12, fontWeight: '600' as const },
  caption: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4 },
} as const;

/** Sombras suaves (iOS) + elevation (Android). */
export const shadow = {
  card: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
} as const;

export type StatusKey = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export const STATUS_META: Record<StatusKey, { color: string; tint: string; label: string }> = {
  confirmed: { color: palette.confirmed, tint: palette.confirmedTint, label: 'CONFIRMADO' },
  completed: { color: palette.completed, tint: palette.completedTint, label: 'CONCLUÍDO' },
  cancelled: { color: palette.cancelled, tint: palette.cancelledTint, label: 'CANCELADO' },
  no_show: { color: palette.noShow, tint: palette.noShowTint, label: 'NÃO COMPARECEU' },
};
