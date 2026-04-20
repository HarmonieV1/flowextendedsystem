export function fmt(n, d = 2) {
  if (n === undefined || n === null || isNaN(n)) return '—'
  return parseFloat(n).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

export function fmtPx(n) {
  n = parseFloat(n)
  if (!isFinite(n)) return '—'
  if (n >= 10000) return fmt(n, 1)
  if (n >= 100) return fmt(n, 2)
  return fmt(n, 4)
}

export function fmtVol(n) {
  n = parseFloat(n)
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toFixed(0)
}

export function fmtTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0'))
    .join(':')
}

export function baseAsset(pair) {
  return pair.replace('USDT', '')
}
