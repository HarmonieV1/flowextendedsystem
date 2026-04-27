// Alert sounds using Web Audio API — no external files needed
let ctx = null

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export function playCash() {
  try {
    const ac = getCtx()
    // Cash register / money sound
    const times = [0, 0.1, 0.15, 0.2, 0.25]
    const freqs  = [1200, 1600, 1400, 1800, 1200]
    times.forEach((t, i) => {
      const osc  = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.type = 'sine'
      osc.frequency.value = freqs[i]
      gain.gain.setValueAtTime(0.3, ac.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + 0.08)
      osc.start(ac.currentTime + t)
      osc.stop(ac.currentTime + t + 0.1)
    })
    // Ka-ching final
    const osc2 = ac.createOscillator()
    const g2   = ac.createGain()
    osc2.connect(g2); g2.connect(ac.destination)
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(800, ac.currentTime + 0.3)
    osc2.frequency.exponentialRampToValueAtTime(400, ac.currentTime + 0.5)
    g2.gain.setValueAtTime(0.2, ac.currentTime + 0.3)
    g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5)
    osc2.start(ac.currentTime + 0.3)
    osc2.stop(ac.currentTime + 0.55)
  } catch(_) {}
}

export function playBeep() {
  try {
    const ac = getCtx()
    const osc  = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain); gain.connect(ac.destination)
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.4, ac.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3)
    osc.start(); osc.stop(ac.currentTime + 0.35)
  } catch(_) {}
}

// Push notifications
export async function requestNotifPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}

export function sendNotif(title, body, icon = '🔔') {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.ico', silent: false })
  } catch(_) {}
}

export function triggerAlert(symbol, price, type) {
  playCash()
  sendNotif(
    `🔔 Alerte FXSEDGE — ${symbol}`,
    `Prix ${type === 'above' ? 'au-dessus' : 'en-dessous'} de ${price}`,
  )
}
