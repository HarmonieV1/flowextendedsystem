import { loadSession, saveSession } from '../lib/session'
import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // ── Active trading pair & timeframe ──
  ...loadSession(),
  pair: loadSession().pair || 'BTCUSDT',
  tf: loadSession().tf || '15m',
  setPair: (pair) => { set({ pair }); saveSession({ pair }) },
  setTf: (tf) => { set({ tf }); saveSession({ tf }) },

  // ── View mode ──
  view: 'trade', // 'trade' | 'multi' | 'wallet'
  setView: (view) => { set({ view }); saveSession({ view }) },
  tab: 'Futures', // 'Futures' | 'Spot'
  setTab: (tab) => { set({ tab }); saveSession({ tab }) },

  // ── Order form ──
  side: 'buy',    // 'buy' | 'sell'
  otype: 'market', // 'market' | 'limit' | 'stop'
  amount: '',
  limitPrice: '',
  sizePct: 0,
  setSide: (side) => set({ side }),
  setOtype: (otype) => set({ otype }),
  setAmount: (amount) => set({ amount }),
  setLimitPrice: (limitPrice) => set({ limitPrice }),
  setSizePct: (sizePct) => set({ sizePct }),

  // ── Wallet / auth ──
  connected: false,
  address: null,
  balance: 0,
  setConnected: (connected, address) => set({ connected, address }),
  setBalance: (balance) => set({ balance }),

  // ── Live market data (updated by hooks) ──
  lastPx: 0,
  prevPx: 0,
  ticker: null,        // full 24h ticker object
  bids: [],
  asks: [],
  trades: [],
  klines: [],
  comparatorPrices: {},
  setComparatorPrice: (id, bid, ask) => set(s => ({ comparatorPrices: {...s.comparatorPrices, [id]:{bid,ask}} })),
  setLastPx: (px) => set((s) => ({ prevPx: s.lastPx, lastPx: px })),
  setTicker: (ticker) => set({ ticker }),
  setBids: (bids) => set({ bids }),
  setAsks: (asks) => set({ asks }),
  addTrade: (trade) => set((s) => ({
    trades: [trade, ...s.trades].slice(0, 60),
  })),
  setKlines: (klines) => set({ klines }),
  updateLastKline: (candle) => set((s) => {
    const arr = [...s.klines]
    if (arr.length && arr[arr.length - 1].t === candle.t) {
      arr[arr.length - 1] = candle
    } else {
      arr.push(candle)
      if (arr.length > 120) arr.shift()
    }
    return { klines: arr }
  }),

  // ── Multi-view tile pairs ──
  tilePairs: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', null],
  setTilePair: (idx, pair) => set((s) => {
    const tilePairs = [...s.tilePairs]
    tilePairs[idx] = pair
    return { tilePairs }
  }),
}))
