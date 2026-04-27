import { useState, useEffect } from 'react'
import { useStore } from '../../store'
import styles from './NewsTracker.module.css'

// CryptoPanic API - works from browser with public token
const buildUrl = (currencies = '') => {
  const base = 'https://cryptopanic.com/api/v1/posts/'
  const params = new URLSearchParams({
    auth_token: 'public',
    kind: 'news',
    public: 'true',
    ...(currencies ? { currencies } : {}),
  })
  return base + '?' + params.toString()
}

const IMPACT_KEYWORDS = {
  high: ['hack','exploit','crash','ban','sec','lawsuit','prison','arrest','whale','billion','emergency','alert','warning','dump','rug','scam','fraud','attacked'],
  medium: ['launch','partnership','upgrade','listing','integration','update','announce','fund','invest','grant','raised','acquired'],
}

function scoreImpact(title) {
  const t = title.toLowerCase()
  if (IMPACT_KEYWORDS.high.some(k => t.includes(k))) return { level:'🔴 Élevé', score:90, color:'#ef4444' }
  if (IMPACT_KEYWORDS.medium.some(k => t.includes(k))) return { level:'🟡 Moyen', score:60, color:'#f59e0b' }
  return { level:'🟢 Faible', score:30, color:'#22c55e' }
}

function detectSentiment(title) {
  const t = title.toLowerCase()
  const bull = ['bull','surge','rally','gain','rise','high','pump','adoption','approval','positive','growth','record','ath','soar']
  const bear = ['bear','crash','drop','fall','low','dump','ban','hack','exploit','fear','warning','negative','loss','sell','plunge']
  const b = bull.filter(k=>t.includes(k)).length
  const s = bear.filter(k=>t.includes(k)).length
  if (b > s) return { label:'📈 Bullish', color:'var(--grn)' }
  if (s > b) return { label:'📉 Bearish', color:'var(--red)' }
  return { label:'⚪ Neutre', color:'var(--txt3)' }
}

export function NewsTracker() {
  const pair = useStore(s => s.pair)
  const base = pair.replace('USDT','')

  const [news, setNews]       = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('all')
  const [activeCur, setActiveCur] = useState('')

  const load = async (currencies = '') => {
    setLoading(true); setError(null)
    try {
      const url = buildUrl(currencies)
      const r = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const d = await r.json()
      if (d.results && Array.isArray(d.results)) {
        setNews(d.results.map(n => ({
          id:        n.id,
          title:     n.title,
          url:       n.url,
          source:    n.source?.title || '—',
          published: new Date(n.published_at),
          currencies: n.currencies?.map(c=>c.code) || [],
          impact:    scoreImpact(n.title),
          sentiment: detectSentiment(n.title),
          votes:     (n.votes?.positive || 0) - (n.votes?.negative || 0),
        })))
      } else {
        throw new Error('Réponse invalide')
      }
    } catch(e) {
      setError(e.message)
      // Fallback demo data so UI isn't empty
      setNews([
        { id:1, title:'Bitcoin atteint un nouveau sommet hebdomadaire au-dessus de $87K', url:'#', source:'CryptoNews', published:new Date(), currencies:['BTC'], impact:scoreImpact('bitcoin surge'), sentiment:detectSentiment('bitcoin atteint sommet'), votes:45 },
        { id:2, title:'Ethereum : mise à jour majeure du réseau prévue pour Q3 2026', url:'#', source:'CoinDesk', published:new Date(Date.now()-3600000), currencies:['ETH'], impact:scoreImpact('upgrade'), sentiment:detectSentiment('mise à jour majeure'), votes:32 },
        { id:3, title:'La SEC examine de nouveaux ETF crypto spot', url:'#', source:'Reuters', published:new Date(Date.now()-7200000), currencies:['BTC','ETH'], impact:scoreImpact('sec'), sentiment:detectSentiment('SEC examine'), votes:28 },
      ])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = news.filter(n => {
    if (filter === 'high')  return n.impact.score >= 90
    if (filter === 'bull')  return n.sentiment.label.includes('Bull')
    if (filter === 'bear')  return n.sentiment.label.includes('Bear')
    return true
  })

  const fmtAge = d => {
    const m = Math.floor((Date.now() - d) / 60000)
    if (m < 60)  return m + 'min'
    if (m < 1440) return Math.floor(m/60) + 'h'
    return Math.floor(m/1440) + 'j'
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.title}>📰 News Impact</span>
        <div className={styles.curBtns}>
          {[['','All'],[base,base],['BTC,ETH','BTC+ETH']].map(([cur,lbl])=>(
            <button key={lbl}
              className={styles.curBtn+(activeCur===cur?' '+styles.curOn:'')}
              onClick={()=>{ setActiveCur(cur); load(cur) }}
            >{lbl}</button>
          ))}
        </div>
        <button className={styles.refreshBtn} onClick={()=>load(activeCur)} disabled={loading}>↻</button>
      </div>

      <div className={styles.filters}>
        {[['all','Toutes'],['high','🔴 Impact'],['bull','📈 Bull'],['bear','📉 Bear']].map(([id,lbl])=>(
          <button key={id} className={styles.fBtn+(filter===id?' '+styles.fOn:'')} onClick={()=>setFilter(id)}>{lbl}</button>
        ))}
        <span className={styles.count}>{filtered.length} news</span>
        {error && <span className={styles.errTag}>⚠ Démo</span>}
      </div>

      <div className={styles.list}>
        {loading && <div className={styles.loading}>Chargement CryptoPanic...</div>}
        {filtered.map(n => (
          <a key={n.id} href={n.url !== '#' ? n.url : undefined}
            target={n.url !== '#' ? '_blank' : undefined}
            rel="noreferrer" className={styles.row}>
            <div className={styles.rowTop}>
              <span style={{fontSize:10,fontWeight:700,color:n.impact.color}}>{n.impact.level}</span>
              <span style={{fontSize:10,fontWeight:700,color:n.sentiment.color}}>{n.sentiment.label}</span>
              <span style={{fontSize:10,color:'var(--txt3)',marginLeft:'auto',fontFamily:'var(--mono)'}}>{fmtAge(n.published)}</span>
            </div>
            <div className={styles.rowTitle}>{n.title}</div>
            <div className={styles.rowBottom}>
              <span className={styles.source}>{n.source}</span>
              {n.currencies.slice(0,4).map(c=>(
                <span key={c} className={styles.tag}>{c}</span>
              ))}
              {n.votes !== 0 && (
                <span style={{fontSize:10,color:n.votes>0?'var(--grn)':'var(--red)',marginLeft:'auto',fontFamily:'var(--mono)'}}>
                  {n.votes>0?'+':''}{n.votes}
                </span>
              )}
            </div>
          </a>
        ))}
        {!loading && filtered.length === 0 && <div className={styles.loading}>Aucune news</div>}
      </div>

      <div className={styles.footer}>CryptoPanic · Scoring impact automatique · Sentiment NLP</div>
    </div>
  )
}
