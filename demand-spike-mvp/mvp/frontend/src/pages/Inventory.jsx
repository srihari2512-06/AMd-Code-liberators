import { useState, useEffect } from 'react'
import { Package, AlertTriangle, CheckCircle, XCircle, RefreshCw, Zap } from 'lucide-react'

function StockBar({ current, predicted, max }) {
  const pct = Math.min(100, (current / Math.max(predicted, current, 1)) * 100)
  const demandPct = Math.min(100, (predicted / Math.max(predicted, current, 1)) * 100)
  const color = pct < 30 ? '#FF2D55' : pct < 60 ? '#FF9500' : '#34C759'
  return (
    <div style={{ width: '100%' }}>
      <div style={{ height: 6, background: '#1E1E2E', borderRadius: 3, overflow: 'hidden', position: 'relative', marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
        <div style={{ position: 'absolute', left: `${demandPct}%`, top: 0, bottom: 0, width: 2, background: '#FF9500', opacity: 0.8 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)' }}>
        <span>Stock: {current}</span>
        <span style={{ color: '#FF9500' }}>Demand: {predicted}</span>
      </div>
    </div>
  )
}

function ReorderModal({ product, onConfirm, onClose }) {
  const [qty, setQty] = useState(product.suggested_reorder_qty)
  const [notes, setNotes] = useState('')
  const cost = qty * (product.cost_price || 10)

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
    }}>
      <div className="card" style={{ width: 440, padding: 28 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700 }}>Approve Reorder</h3>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>{product.product}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--muted)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Current Stock</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FF2D55' }}>{product.stock_units}</div>
          </div>
          <div style={{ background: 'var(--muted)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>48h Demand</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#FF9500' }}>{product.predicted_demand_48h?.toLocaleString()}</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Reorder Quantity</label>
          <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))}
            className="input-dark" min={1} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Notes (optional)</label>
          <input className="input-dark" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Express shipping, contact supplier X..." />
        </div>

        <div style={{
          background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.3)',
          borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 13,
        }}>
          <div style={{ color: '#34C759', fontWeight: 600 }}>Estimated Total: ${cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
            Cost price: ${product.cost_price}/unit · {qty} units
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => onConfirm(qty, notes)}>
            ✓ Approve Reorder
          </button>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function Inventory({ showToast }) {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [reorderModal, setReorderModal] = useState(null)
  const [processing, setProcessing] = useState(null)

  const load = async () => {
    try {
      const data = await fetch('/api/inventory').then(r => r.json())
      setInventory(data)
    } catch (e) {
      showToast('Failed to load inventory', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleApprove = async (qty, notes) => {
    setProcessing(reorderModal.id)
    setReorderModal(null)
    try {
      const res = await fetch(`/api/inventory/reorder/${reorderModal.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: qty, notes }),
      }).then(r => r.json())
      showToast(`✓ Reorder of ${qty} units approved — Est. cost: $${res.cost?.toFixed(2)}`, 'success')
      load()
    } catch (e) {
      showToast('Failed to process reorder', 'error')
    } finally {
      setProcessing(null)
    }
  }

  const handleDecline = async (productId) => {
    try {
      await fetch(`/api/inventory/reorder/${productId}/decline`, { method: 'POST' })
      showToast('Reorder declined', 'info')
      load()
    } catch (e) {
      showToast('Failed to decline', 'error')
    }
  }

  const criticals = inventory.filter(i => i.status === 'critical')
  const warnings = inventory.filter(i => i.status === 'warning')

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Inventory Manager</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Stock levels vs. AI-predicted demand. Orange line = 48h demand forecast.
          </div>
        </div>
        <button className="btn-ghost" onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary pills */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {criticals.length > 0 && (
            <div style={{ background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.25)', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <AlertTriangle size={14} color="#FF2D55" />
              <span style={{ color: '#FF2D55', fontWeight: 600 }}>{criticals.length} Critical</span>
              <span style={{ color: 'var(--text-secondary)' }}>— ≤ 2 days stock remaining</span>
            </div>
          )}
          {warnings.length > 0 && (
            <div style={{ background: 'rgba(255,149,0,0.1)', border: '1px solid rgba(255,149,0,0.25)', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <AlertTriangle size={14} color="#FF9500" />
              <span style={{ color: '#FF9500', fontWeight: 600 }}>{warnings.length} Warning</span>
              <span style={{ color: 'var(--text-secondary)' }}>— ≤ 5 days stock remaining</span>
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Stock vs Demand</th>
              <th>Days Left</th>
              <th>Daily Velocity</th>
              <th>Price</th>
              <th>Spike</th>
              <th>Status</th>
              <th>Reorder Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading inventory...</td></tr>
            ) : inventory.map(item => (
              <tr key={item.id} style={{ opacity: processing === item.id ? 0.5 : 1 }}>
                <td>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.product.length > 26 ? item.product.slice(0, 26) + '…' : item.product}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.category}</div>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text-secondary)' }}>{item.sku}</td>
                <td style={{ minWidth: 140 }}>
                  <StockBar current={item.stock_units} predicted={item.predicted_demand_48h} />
                </td>
                <td>
                  <span style={{
                    fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 14,
                    color: item.days_remaining <= 2 ? '#FF2D55' : item.days_remaining <= 5 ? '#FF9500' : '#34C759'
                  }}>
                    {item.days_remaining}d
                  </span>
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>{item.daily_sales_velocity}/day</td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>${item.current_price}</td>
                <td>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: item.spike_score >= 70 ? '#FF2D55' : item.spike_score >= 50 ? '#FF9500' : '#34C759'
                  }}>
                    {item.spike_score}
                  </span>
                </td>
                <td>
                  <span className={`badge badge-${item.status === 'critical' ? 'critical' : item.status === 'warning' ? 'warning' : 'healthy'}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  {item.pending_reorder ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}
                        onClick={() => setReorderModal({ ...item, suggested_reorder_qty: item.pending_reorder.quantity })}>
                        <CheckCircle size={12} style={{ marginRight: 4 }} />Approve
                      </button>
                      <button className="btn-danger" style={{ padding: '6px 10px', fontSize: 12 }}
                        onClick={() => handleDecline(item.id)}>
                        <XCircle size={12} />
                      </button>
                    </div>
                  ) : item.suggested_reorder_qty > 0 ? (
                    <button className="btn-ghost" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => setReorderModal(item)}>
                      <Package size={12} />
                      Reorder {item.suggested_reorder_qty}
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#34C759', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle size={12} /> Adequate
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reorderModal && (
        <ReorderModal
          product={reorderModal}
          onConfirm={(qty, notes) => handleApprove(qty, notes)}
          onClose={() => setReorderModal(null)}
        />
      )}
    </div>
  )
}
