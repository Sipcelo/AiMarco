export function phoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function isValidBrazilMobilePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  const areaCode = digits.slice(0, 2)
  const number = digits.slice(2)
  return (
    digits.length === 11 &&
    /^[1-9]{2}$/.test(areaCode) &&
    /^9\d{8}$/.test(number)
  )
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
export const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function getDayLabel(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return {
    dayNum: d.getDate(),
    dayName: DAY_NAMES[d.getDay()],
    monthName: MONTH_NAMES[d.getMonth()],
  }
}

export function getNext14Days(): string[] {
  const days: string[] = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}
