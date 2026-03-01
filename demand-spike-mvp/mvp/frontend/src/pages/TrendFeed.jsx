import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Eye, Users, RefreshCw, ExternalLink } from 'lucide-react'

const PLATFORM_COLORS = { tiktok: '#FF2D55', instagram: '#E1306C', x: '#1DA1F2', youtube: '#FF0000' }

function SpikeBar({ score }) {
  const color = score >= 70 ? '#FF2D55' : score >= 50 ? '#FF9500' : '#34C759'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 80, height: 6, background: '#1E1E2E', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 28 }}>{score}</span>
    </div>
  )
}

function SparkLine({ history }) {
  const data = history.map((h, i) => ({ i, v: h.score }))
  return (
    <ResponsiveContainer width={100} height={36}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="v" stroke="#FF6B00" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function TrendFeed({ showToast, liveEvents }) {
  const [trends, setTrends] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    try {
      const data = await fetch('/api/trends').then(r => r.json())
      setTrends(data)
    } catch (e) {
      showToast('Could not load trends', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (liveEvents.length > 0) {
      // Refresh trends on any live event
      const id = setTimeout(load, 1000)
      return () => clearTimeout(id)
    }
  }, [liveEvents])

  const filtered = filter === 'all' ? trends : trends.filter(t => t.alert_status === filter)

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Live Trend Monitor</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Real-time virality tracking across TikTok, Instagram, and X
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'critical', 'warning', 'normal'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`btn-ghost`}
              style={{ textTransform: 'capitalize', fontSize: 12,
                       ...(filter === f ? { borderColor: 'var(--amd-orange)', color: 'var(--amd-orange)' } : {}) }}>
              {f}
            </button>
          ))}
          <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Live event ticker */}
      {liveEvents.length > 0 && (
        <div style={{
          background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)',
          borderRadius: 10, padding: '10px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <span className="pulse-dot orange" />
          <span style={{ color: '#FF6B00', fontWeight: 600 }}>LIVE:</span>
          <span>{liveEvents[0]?.product} — {liveEvents[0]?.views?.toLocaleString?.()} views/hr on {liveEvents[0]?.platform} · Score: {liveEvents[0]?.spike_score}/100</span>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Platform</th>
              <th>Spike Score</th>
              <th>Views / Hr</th>
              <th>Creator Reach</th>
              <th>48h Demand</th>
              <th>Stock Gap</th>
              <th>Sentiment</th>
              <th>Trend</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading trends...</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{t.product.length > 28 ? t.product.slice(0, 28) + '…' : t.product}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>{t.category}</div>
                </td>
                <td>
                  <span style={{
                    fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                    color: PLATFORM_COLORS[t.platform] || 'white',
                    background: `${PLATFORM_COLORS[t.platform] || '#fff'}20`,
                    padding: '3px 8px', borderRadius: 6,
                  }}>
                    {t.platform}
                  </span>
                </td>
                <td><SpikeBar score={t.spike_score} /></td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>{t.views_per_hour?.toLocaleString()}</td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>{(t.creator_reach / 1000000).toFixed(1)}M</td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#FF9500', fontWeight: 600 }}>
                  {t.predicted_demand_48h?.toLocaleString()}
                </td>
                <td>
                  {t.stock_gap > 0
                    ? <span style={{ color: '#FF2D55', fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 13 }}>-{t.stock_gap?.toLocaleString()}</span>
                    : <span style={{ color: '#34C759', fontFamily: 'JetBrains Mono', fontSize: 13 }}>+{Math.abs(t.stock_gap)}</span>
                  }
                </td>
                <td>
                  <span style={{
                    fontSize: 12, textTransform: 'capitalize',
                    color: t.sentiment === 'very_positive' || t.sentiment === 'positive' ? '#34C759' : '#FF9500',
                  }}>
                    {t.sentiment?.replace('_', ' ')}
                  </span>
                </td>
                <td><SparkLine history={t.history || []} /></td>
                <td>
                  <span className={`badge badge-${t.alert_status === 'critical' ? 'critical' : t.alert_status === 'warning' ? 'warning' : 'healthy'}`}>
                    {t.alert_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Social events explainer */}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
        Data refreshes automatically every 15 seconds · {new Date().toLocaleTimeString()}
      </div>
    </div>
  )
}
