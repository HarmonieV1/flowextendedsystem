import { useEffect, useCallback } from 'react'

// Global keyboard shortcuts for FXSEDGE trading terminal
// B=Buy, S=Sell, L=Long, X=Short, 1-9=leverage, Esc=cancel/close
export function useKeyboardShortcuts({ onLong, onShort, onSetLeverage, onCancel, onEsc, enabled = true }) {
  const handle = useCallback((e) => {
    if (!enabled) return
    // Ignore when typing in an input/textarea
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    const k = e.key.toLowerCase()

    // Leverage presets: 1-9
    if (e.key >= '1' && e.key <= '9') {
      const leverages = [2, 5, 10, 20, 50, 75, 100]
      const idx = parseInt(e.key) - 1
      if (idx < leverages.length) { onSetLeverage?.(leverages[idx]); showToast('Levier ' + leverages[idx] + '×') }
      return
    }

    switch(k) {
      case 'l': onLong?.();   showToast('↑ Long'); break
      case 'x': onShort?.();  showToast('↓ Short'); break
      case 'b': onLong?.();   showToast('↑ Buy / Long'); break
      case 's': onShort?.();  showToast('↓ Sell / Short'); break
      case 'escape': onEsc?.(); onCancel?.(); break
      default: break
    }
  }, [enabled, onLong, onShort, onSetLeverage, onCancel, onEsc])

  useEffect(() => {
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [handle])
}

function showToast(msg) {
  const existing = document.getElementById('fxs-shortcut-toast')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.id = 'fxs-shortcut-toast'
  el.style.cssText = `
    position:fixed; top:80px; right:16px; z-index:9999;
    background:rgba(0,229,160,.15); border:1px solid rgba(0,229,160,.4);
    color:#00e5a0; font-family:monospace; font-size:13px; font-weight:700;
    padding:8px 16px; border-radius:8px;
    animation: fxsfadein 0.15s ease;
  `
  el.textContent = '⌨ ' + msg
  if (!document.getElementById('fxs-toast-style')) {
    const style = document.createElement('style')
    style.id = 'fxs-toast-style'
    style.textContent = '@keyframes fxsfadein{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}'
    document.head.appendChild(style)
  }
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1200)
}
