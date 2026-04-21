export function normalizeName(name) {
  return (name || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export function parsePassengers(value) {
  if (!value) return []
  return value.split(';').map(p => p.trim().replace(/:/g, ' ').replace(/\s+/g, ' ')).filter(Boolean)
}

export function formatDate(dateStr, locale = 'fr-FR') {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatShortDate(dateStr, locale = 'fr-FR') {
  const date = new Date(dateStr)
  return date.toLocaleDateString(locale)
}

export function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function debounce(fn, delay) {
  let timeoutId
  return function(...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}
