import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, RefreshCw, RotateCcw, CheckCircle } from 'lucide-react'

function PricingCard({ rec, onApply, onRevert, applying }) {
  const upliftColor = rec.uplift_pct >= 20 ? '#FF2D55' : rec.uplift_pct >= 12 ? '#FF9500' : '#34C759'
  
  return (
    <div className="card" style={{
      borderLeft: `3px solid ${rec.applied ? '#34C759' : upliftColor}`,
      opacity: applying ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            {rec.product.length > 34 ? rec.product.slice(0, 34) + '…' : rec.product}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rec.reason}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <span style={{
            fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
            color: rec.platform === 'tiktok' ? '#FF2D55' : rec.platform === 'instagram' ? '#E1306C' : '#1DA1F2',
            background: 'rgba(255,45,85,0.1)', padding: '3px 8px', borderRadius: 6,
          }}>
            {rec.platform}
          </span>
        </div>
      </div>

      {/* Price comparison */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2, letterSpacing: '0.06em' }}>CURRENT</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono' }}>${rec.current_price}</div>
        </div>
        <div style={{ fontSize: 20, color: 'var(--text-secondary)' }}>→</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2, letterSpacing: '0.06em' }}>RECOMMENDED</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', color: upliftColor }}>${rec.recommended_price}</div>
        </div>
        <div style={{
          marginLeft: 'auto', background: `${upliftColor}20`, border: `1px solid ${upliftColor}40`,
          borderRadius: 8, padding: '8px 14px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: upliftColor }}>+{rec.uplift_pct}%</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>uplift</div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ flex: 1, background: 'var(--muted)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>SPIKE SCORE</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: rec.spike_score >= 70 ? '#FF2D55' : '#FF9500' }}>{rec.spike_score}/100</div>
        </div>
        <div style={{ flex: 1, background: 'var(--muted)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 2 }}>EST. REVENUE GAIN 48H</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#34C759' }}>${rec.est_revenue_gain_48h?.toLocaleString()}</div>
        </div>
      </div>

      {/* Action */}
      <div style={{ display: 'flex', gap: 8 }}>
        {rec.applied ? (
          <>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#34C759', fontWeight: 600 }}>
              <CheckCircle size={14} /> Price update applied
            </div>
            <button className="btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => onRevert(rec.id)}>
              <RotateCcw size={12} /> Revert
            </button>
          </>
        ) : (
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => onApply(rec.id)} disabled={applying}>
            {applying ? 'Applying...' : `Apply +${rec.uplift_pct}% Uplift → $${rec.recommended_price}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Pricing({ showToast }) {
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null)

  const load = async () => {
    try {
      const data = await fetch('/api/pricing').then(r => r.json())
      setRecs(data)
    } catch (e) {
      showToast('Failed to load pricing data', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleApply = async (productId) => {
    setApplying(productId)
    try {
      const res = await fetch(`/api/pricing/apply/${productId}`, { method: 'POST' }).then(r => r.json())
      showToast(`✓ Price updated: $${res.old_price} → $${res.new_price} (+${res.uplift_pct}%)`, 'success')
      load()
    } catch (e) {
      showToast('Failed to apply price change', 'error')
    } finally {
      setApplying(null)
    }
  }

  const handleRevert = async (productId) => {
    try {
      await fetch(`/api/pricing/revert/${productId}`, { method: 'POST' })
      showToast('Price reverted to original', 'info')
      load()
    } catch (e) {
      showToast('Failed to revert price', 'error')
    }
  }

  const totalEstRevenue = recs.reduce((s, r) => s + (r.est_revenue_gain_48h || 0), 0)
  const appliedCount = recs.filter(r => r.applied).length

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Dynamic Pricing Engine</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            AI-recommended price uplifts based on real-time demand spike scores
          </div>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 6 }}>TOTAL EST. REVENUE OPPORTUNITY</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#34C759' }}>${totalEstRevenue.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>next 48 hours</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 6 }}>RECOMMENDATIONS</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{recs.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>products above spike threshold</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 6 }}>APPLIED TODAY</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: '#FF6B00' }}>{appliedCount}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>price changes live</div>
          </div>
        </div>
      )}

      {/* Pricing cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>Loading recommendations...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {recs.map(rec => (
            <PricingCard
              key={rec.id}
              rec={rec}
              onApply={handleApply}
              onRevert={handleRevert}
              applying={applying === rec.id}
            />
          ))}
        </div>
      )}

      {!loading && recs.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
          No pricing opportunities detected. Products need spike score &gt; 40 to qualify.
        </div>
      )}
    </div>
  )
}
