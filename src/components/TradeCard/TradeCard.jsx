// FXSEDGE — Trade Sharing Card (Canvas API, no external deps)
import { useEffect, useRef, useState } from 'react'
import { logSilent } from '../../lib/errorMonitor'
import styles from './TradeCard.module.css'

const W = 1200
const H = 1500

// Render Style A — Editorial grid (dark, premium)
function renderEditorial(ctx, t) {
  // Background
  ctx.fillStyle = '#09090b'
  ctx.fillRect(0, 0, W, H)

  // Grid pattern
  ctx.strokeStyle = 'rgba(140,198,63,0.04)'
  ctx.lineWidth = 1
  const grid = 80
  for (let x = 0; x < W; x += grid) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y < H; y += grid) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // Corner glow
  const grad = ctx.createRadialGradient(W - 200, 200, 0, W - 200, 200, 600)
  grad.addColorStop(0, 'rgba(140,198,63,0.15)')
  grad.addColorStop(1, 'rgba(140,198,63,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Header
  ctx.font = 'bold 36px "Courier New", monospace'
  ctx.fillStyle = '#8cc63f'
  ctx.textAlign = 'left'
  ctx.fillText('FXSEDGE', 80, 130)

  // Side badge
  const isLong = t.side === 'long'
  const badgeColor = isLong ? '#8cc63f' : '#ff3b5c'
  const badgeBg = isLong ? 'rgba(140,198,63,0.15)' : 'rgba(255,59,92,0.15)'
  ctx.fillStyle = badgeBg
  const badgeText = `${isLong ? 'LONG' : 'SHORT'} · ${t.leverage}x`
  ctx.font = 'bold 28px "Courier New", monospace'
  const badgeW = ctx.measureText(badgeText).width + 60
  roundRect(ctx, W - 80 - badgeW, 95, badgeW, 60, 8)
  ctx.fill()
  ctx.fillStyle = badgeColor
  ctx.textAlign = 'left'
  ctx.fillText(badgeText, W - 80 - badgeW + 30, 137)

  // Pair
  ctx.font = 'bold 110px "Courier New", monospace'
  ctx.fillStyle = '#f4f4f5'
  ctx.textAlign = 'left'
  ctx.fillText(t.base, 80, 350)
  ctx.fillStyle = '#52525b'
  ctx.fillText('/USDT', 80 + ctx.measureText(t.base).width, 350)

  ctx.font = '32px "Courier New", monospace'
  ctx.fillStyle = '#71717a'
  ctx.fillText(t.exchange + ' Perps', 80, 410)

  // PnL — huge
  const pnlColor = t.pnl >= 0 ? '#8cc63f' : '#ff3b5c'
  ctx.font = 'bold 180px "Courier New", monospace'
  ctx.fillStyle = pnlColor
  ctx.textAlign = 'left'
  const pnlText = (t.pnl >= 0 ? '+' : '') + '$' + Math.abs(t.pnl).toLocaleString('en-US', { maximumFractionDigits: 2 })
  ctx.fillText(pnlText, 80, 720)

  ctx.font = '32px "Courier New", monospace'
  ctx.fillStyle = '#71717a'
  ctx.fillText(`${t.pnl >= 0 ? '+' : ''}${t.roi.toFixed(2)}% ROI · 1:${t.rr.toFixed(1)} R:R`, 80, 780)

  // Stats grid (2x2)
  const stats = [
    ['ENTRY', t.entry.toLocaleString('en-US', { maximumFractionDigits: 2 })],
    ['EXIT',  t.exit.toLocaleString('en-US', { maximumFractionDigits: 2 })],
    ['SIZE',  t.size + ' ' + t.base],
    ['DURATION', t.duration],
  ]
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(80, 920); ctx.lineTo(W - 80, 920); ctx.stroke()

  stats.forEach((s, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 80 + col * 540
    const y = 1000 + row * 130
    ctx.font = '24px "Courier New", monospace'
    ctx.fillStyle = '#52525b'
    ctx.fillText(s[0], x, y)
    ctx.font = 'bold 38px "Courier New", monospace'
    ctx.fillStyle = '#f4f4f5'
    ctx.fillText(s[1], x, y + 50)
  })

  // Footer
  ctx.beginPath(); ctx.moveTo(80, H - 130); ctx.lineTo(W - 80, H - 130); ctx.stroke()
  ctx.font = '24px "Courier New", monospace'
  ctx.fillStyle = '#52525b'
  ctx.textAlign = 'left'
  ctx.fillText('fxsedge.com', 80, H - 70)
  ctx.textAlign = 'right'
  ctx.fillStyle = '#8cc63f'
  ctx.fillText('No KYC · Non-custodial', W - 80, H - 70)
}

// Render Style B — Brutalist terminal
function renderBrutalist(ctx, t) {
  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0a0a0c')
  bg.addColorStop(1, '#0f1f0c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Top stripe
  const stripe = ctx.createLinearGradient(0, 0, W, 0)
  stripe.addColorStop(0, 'rgba(140,198,63,0)')
  stripe.addColorStop(0.5, 'rgba(140,198,63,1)')
  stripe.addColorStop(1, 'rgba(140,198,63,0)')
  ctx.fillStyle = stripe
  ctx.fillRect(0, 0, W, 6)

  // Corner labels
  ctx.font = '24px "Courier New", monospace'
  ctx.fillStyle = '#8cc63f'
  ctx.textAlign = 'left'
  ctx.fillText('[ FXSEDGE ]', 50, 60)
  ctx.textAlign = 'right'
  const date = new Date(t.timestamp || Date.now()).toISOString().slice(0, 10).replace(/-/g, '.')
  ctx.fillText(date, W - 50, 60)

  ctx.textAlign = 'left'
  ctx.fillText(`// trade #${(t.id || Math.floor(Math.random() * 9999)).toString().padStart(4, '0')}`, 50, H - 50)
  ctx.textAlign = 'right'
  ctx.fillText('verified ✓', W - 50, H - 50)

  // Pair + side
  ctx.font = 'bold 100px "Courier New", monospace'
  ctx.fillStyle = '#f4f4f5'
  ctx.textAlign = 'left'
  ctx.fillText(t.base + '/USDT', 80, 280)

  // Side tag
  const isLong = t.side === 'long'
  ctx.font = 'bold 32px "Courier New", monospace'
  const tagText = `${isLong ? '▲ LONG' : '▼ SHORT'} ${t.leverage}x`
  ctx.fillStyle = isLong ? 'rgba(140,198,63,0.12)' : 'rgba(255,59,92,0.12)'
  const tagW = ctx.measureText(tagText).width + 40
  roundRect(ctx, 80, 320, tagW, 60, 4)
  ctx.fill()
  ctx.fillStyle = isLong ? '#8cc63f' : '#ff3b5c'
  ctx.fillText(tagText, 100, 365)

  // Big PnL block
  const pnlColor = t.pnl >= 0 ? '#8cc63f' : '#ff3b5c'
  ctx.font = 'bold 220px "Courier New", monospace'
  ctx.fillStyle = pnlColor
  const roiText = `${t.pnl >= 0 ? '+' : ''}${t.roi.toFixed(2)}%`
  ctx.fillText(roiText, 80, 720)

  ctx.font = '36px "Courier New", monospace'
  ctx.fillStyle = '#71717a'
  ctx.fillText(`$${Math.abs(t.pnl).toLocaleString('en-US', { maximumFractionDigits: 2 })} · ${t.duration}`, 80, 790)

  // Meta rows (dashed lines)
  const metaY = 950
  const metas = [
    ['ENTRY', t.entry.toLocaleString('en-US', { maximumFractionDigits: 2 })],
    ['EXIT',  t.exit.toLocaleString('en-US', { maximumFractionDigits: 2 })],
    ['R:R',   '1 : ' + t.rr.toFixed(1)],
  ]
  metas.forEach((m, i) => {
    const y = metaY + i * 100
    ctx.font = '32px "Courier New", monospace'
    ctx.fillStyle = '#52525b'
    ctx.textAlign = 'left'
    ctx.fillText(m[0], 80, y)
    ctx.font = 'bold 38px "Courier New", monospace'
    ctx.fillStyle = '#f4f4f5'
    ctx.textAlign = 'right'
    ctx.fillText(m[1], W - 80, y)

    // Dashed line below
    ctx.setLineDash([8, 8])
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(80, y + 24)
    ctx.lineTo(W - 80, y + 24)
    ctx.stroke()
    ctx.setLineDash([])
  })

  // Bottom
  ctx.font = '28px "Courier New", monospace'
  ctx.fillStyle = '#52525b'
  ctx.textAlign = 'left'
  ctx.fillText('FXSEDGE.COM', 80, H - 130)
  ctx.fillStyle = '#8cc63f'
  ctx.textAlign = 'right'
  ctx.fillText('// SEE EVERY FEE', W - 80, H - 130)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function TradeCard({ trade, onClose }) {
  const [style, setStyle] = useState('editorial')
  const canvasRef = useRef(null)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (style === 'editorial') renderEditorial(ctx, trade)
    else renderBrutalist(ctx, trade)
  }, [style, trade])

  const download = () => {
    try {
      const link = document.createElement('a')
      link.download = `fxsedge-trade-${trade.base}-${Date.now()}.png`
      link.href = canvasRef.current.toDataURL('image/png')
      link.click()
    } catch (e) { logSilent(e, 'TradeCard.download') }
  }

  const copyToClipboard = async () => {
    setCopying(true)
    try {
      const blob = await new Promise(res => canvasRef.current.toBlob(res, 'image/png'))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      logSilent(e, 'TradeCard.copy')
    }
    setCopying(false)
  }

  return (
    <div className={styles.bg} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.hdr}>
          <span className={styles.title}>📋 Partager le trade</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.styleSel}>
          <button className={style === 'editorial' ? styles.styleOn : styles.styleBtn} onClick={() => setStyle('editorial')}>
            Editorial
          </button>
          <button className={style === 'brutalist' ? styles.styleOn : styles.styleBtn} onClick={() => setStyle('brutalist')}>
            Brutalist
          </button>
        </div>

        <div className={styles.preview}>
          <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />
        </div>

        <div className={styles.actions}>
          <button onClick={copyToClipboard} className={styles.actionBtn} disabled={copying}>
            {copied ? '✓ Copié' : '📋 Copier l\'image'}
          </button>
          <button onClick={download} className={styles.actionBtn + ' ' + styles.actionPrimary}>
            ⬇ Télécharger PNG
          </button>
        </div>

        <div className={styles.foot}>
          1200 × 1500 · Optimisé pour Twitter/Telegram
        </div>
      </div>
    </div>
  )
}
