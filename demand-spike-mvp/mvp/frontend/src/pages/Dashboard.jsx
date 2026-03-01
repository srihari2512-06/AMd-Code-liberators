import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Zap, AlertTriangle, Package, DollarSign, TrendingUp, RefreshCw } from 'lucide-react'

function SpikeGauge({ score }) {
  const radius = 80
  const cx = 100, cy = 100
  const startAngle = 220
  const endAngle = -40
  const totalAngle = 260

  const polarToCartesian = (angle) => {
    const rad = (angle * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  const describeArc = (start, end) => {
    const s = polarToCartesian(start)
    const e = polarToCartesian(end)
    const largeArc = Math.abs(end - start) > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 0 ${e.x} ${e.y}`
  }

  const filledEndAngle = startAngle - (score / 100) * totalAngle
  
  const color = score >= 70 ? '#FF2D55' : score >= 50 ? '#FF9500' : '#34C759'
  const label = score >= 70 ? 'CRITICAL' : score >= 50 ? 'WARNING' : 'NORMAL'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={200} height={160} viewBox="0 0 200 200">
        {/* Background arc */}
        <path d={describeArc(startAngle, endAngle)} fill="none" stroke="#1E1E2E" strokeWidth={14} strokeLinecap="round" />
        {/* Filled arc */}
        {score > 0 && (
          <path
            d={describeArc(startAngle, filledEndAngle)}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            className="gauge-arc"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        )}
        {/* Score text */}
        <text x={cx} y={cy + 8} textAnchor="middle" fill="white" fontSize={32} fontWeight={700} fontFamily="Space Grotesk">
          {score}
        </text>
        <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--text-secondary)" fontSize={10} fontFamily="Space Grotesk">
          / 100
        </text>
        {/* Labels */}
        <text x={30} y={165} textAnchor="middle" fill="var(--text-secondary)" fontSize={10} fontFamily="Space Grotesk">0</text>
        <text x={170} y={165} textAnchor="middle" fill="var(--text-secondary)" fontSize={10} fontFamily="Space Grotesk">100</text>
      </svg>
      <div style={{ marginTop: -20, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color }}>
        SPIKE RISK: {label}
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color = 'var(--amd-orange)' }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2, marginTop: 2 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function Dashboard({ alerts, liveEvents, showToast }) {
  const [stats, setStats] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [s, h] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/trends/history').then(r => r.json()),
      ])
      setStats(s)
      setHistory(h)
    } catch (e) {
      showToast('Failed to load dashboard data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
        Loading Command Center...
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Command Center</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Real-time demand intelligence for your business
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Last scan: {stats?.last_scan ? new Date(stats.last_scan).toLocaleTimeString() : '—'}
          </div>
          <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Top row: Gauge + KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, marginBottom: 20 }}>
        {/* Spike gauge */}
        <div className="card glow-orange" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
            PLATFORM SPIKE RISK
          </div>
          <SpikeGauge score={stats?.overall_spike_risk ?? 0} />
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, textAlign: 'center' }}>
            Monitoring {stats?.products_monitored ?? 0} products across TikTok, Instagram, X
          </div>
        </div>

        {/* KPI grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <KpiCard icon={AlertTriangle} label="Active Alerts" value={stats?.active_alerts ?? 0}
            sub="Require your attention" color="#FF2D55" />
          <KpiCard icon={TrendingUp} label="High Risk Products" value={stats?.high_risk_products ?? 0}
            sub="Spike score ≥ 70/100" color="#FF9500" />
          <KpiCard icon={Package} label="Inventory Value" value={`$${(stats?.total_inventory_value ?? 0).toLocaleString()}`}
            sub="Current stock on hand" color="#0A84FF" />
          <KpiCard icon={DollarSign} label="Reorders This Week" value={`$${(stats?.reorders_this_week ?? 0).toLocaleString()}`}
            sub="Approved purchase orders" color="#34C759" />
        </div>
      </div>

      {/* Chart + Live feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, marginBottom: 20 }}>
        {/* Trend chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Virality Velocity — Last 6 Hours</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Average + peak spike scores across all monitored products</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={history.length > 0 ? history : demoChartData}>
              <defs>
                <linearGradient id="peakGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8888AA', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #1E1E2E', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#8888AA' }}
              />
              <Area type="monotone" dataKey="peak" stroke="#FF6B00" strokeWidth={2} fill="url(#peakGrad)" name="Peak Score" />
              <Area type="monotone" dataKey="avg" stroke="#0A84FF" strokeWidth={2} fill="url(#avgGrad)" name="Avg Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Live event feed */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span className="pulse-dot" />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Live Social Feed</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 210, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(liveEvents.length > 0 ? liveEvents : demoEvents).map((ev, i) => (
              <div key={i} style={{
                padding: '10px 12px',
                background: 'var(--muted)',
                borderRadius: 8,
                fontSize: 12,
                borderLeft: `3px solid ${ev.spike_score >= 70 ? '#FF2D55' : ev.spike_score >= 50 ? '#FF9500' : '#34C759'}`,
                animation: i === 0 ? 'fade-up 0.3s ease-out' : 'none',
              }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {ev.product?.split(' ').slice(0, 3).join(' ')}
                </div>
                <div style={{ color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                  <span style={{ textTransform: 'capitalize' }}>{ev.platform}</span>
                  <span>·</span>
                  <span style={{ fontFamily: 'monospace' }}>{ev.views?.toLocaleString?.()} views/hr</span>
                  <span>·</span>
                  <span style={{ color: ev.spike_score >= 70 ? '#FF2D55' : ev.spike_score >= 50 ? '#FF9500' : '#34C759', fontWeight: 700 }}>
                    {ev.spike_score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending alerts */}
      {alerts.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="#FF9500" />
            Pending Actions ({alerts.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.slice(0, 4).map((alert, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--muted)', borderRadius: 8,
                borderLeft: '3px solid #FF9500',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{alert.message || alert.msg}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>
                    {alert.product_name} · Spike: {alert.current_spike_score ?? '—'}/100
                  </div>
                </div>
                <span className="badge badge-warning">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Demo data when backend has no history yet
const demoChartData = [
  { time: '10:00', avg: 32, peak: 48 }, { time: '10:30', avg: 38, peak: 55 },
  { time: '11:00', avg: 41, peak: 62 }, { time: '11:30', avg: 52, peak: 74 },
  { time: '12:00', avg: 61, peak: 82 }, { time: '12:30', avg: 58, peak: 87 },
]

const demoEvents = [
  { product: 'Stanley Quencher 40oz', platform: 'tiktok', views: 45000, spike_score: 87 },
  { product: 'Glow Recipe Toner', platform: 'instagram', views: 32000, spike_score: 72 },
  { product: 'Niacinamide Serum', platform: 'tiktok', views: 28000, spike_score: 61 },
]
