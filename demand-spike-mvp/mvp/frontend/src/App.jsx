import { useState, useEffect, useCallback, useRef } from 'react'
import Dashboard from './pages/Dashboard'
import TrendFeed from './pages/TrendFeed'
import Inventory from './pages/Inventory'
import Pricing from './pages/Pricing'
import ContentWorkshop from './pages/ContentWorkshop'
import BrandKit from './pages/BrandKit'
import { Zap, BarChart3, Package, TrendingUp, Sparkles, Palette, Bell, Wifi, WifiOff } from 'lucide-react'

const PAGES = [
  { id: 'dashboard', label: 'Command Center', icon: Zap },
  { id: 'trends', label: 'Live Trends', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'pricing', label: 'Dynamic Pricing', icon: BarChart3 },
  { id: 'content', label: 'Content Workshop', icon: Sparkles },
  { id: 'brandkit', label: 'Brand Kit', icon: Palette },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [alerts, setAlerts] = useState([])
  const [liveEvents, setLiveEvents] = useState([])
  const [wsConnected, setWsConnected] = useState(false)
  const [toast, setToast] = useState(null)
  const wsRef = useRef(null)

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // WebSocket for live updates
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket('ws://localhost:8000/ws/live')
        wsRef.current = ws

        ws.onopen = () => setWsConnected(true)
        ws.onclose = () => {
          setWsConnected(false)
          setTimeout(connect, 5000) // reconnect
        }
        ws.onerror = () => ws.close()

        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'trend_update') {
            setLiveEvents(prev => [msg.data, ...prev].slice(0, 50))
          }
          if (msg.type === 'spike_alert') {
            setAlerts(prev => [msg.data, ...prev])
            showToast(`⚡ ${msg.data.message}`, 'alert')
          }
        }
      } catch (_) {
        setTimeout(connect, 5000)
      }
    }
    connect()
    return () => wsRef.current?.close()
  }, [showToast])

  // Poll alerts
  useEffect(() => {
    const fetchAlerts = () =>
      fetch('/api/alerts')
        .then(r => r.json())
        .then(data => setAlerts(data))
        .catch(() => {})
    
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const pageProps = { showToast, liveEvents, alerts, setAlerts }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--dark)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'var(--card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #FF6B00, #ED1C24)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={16} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Demand Spike
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                COMMAND CENTER
              </div>
            </div>
          </div>
        </div>

        {/* Live status */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            {wsConnected
              ? <><span className="pulse-dot" /> <span style={{ color: '#34C759' }}>Live Feed Active</span></>
              : <><span className="pulse-dot red" /> <span style={{ color: '#FF2D55' }}>Reconnecting...</span></>
            }
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {PAGES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-tab ${page === id ? 'active' : ''}`}
              onClick={() => setPage(id)}
              style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start' }}
            >
              <Icon size={15} />
              <span>{label}</span>
              {id === 'trends' && alerts.length > 0 && (
                <span style={{
                  marginLeft: 'auto', background: '#FF2D55', color: 'white',
                  fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100,
                }}>
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Powered by AMD × Claude AI
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            AMD Slingshot Competition 2025
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, padding: '0', minHeight: '100vh' }}>
        {page === 'dashboard'  && <Dashboard {...pageProps} />}
        {page === 'trends'     && <TrendFeed {...pageProps} />}
        {page === 'inventory'  && <Inventory {...pageProps} />}
        {page === 'pricing'    && <Pricing {...pageProps} />}
        {page === 'content'    && <ContentWorkshop {...pageProps} />}
        {page === 'brandkit'   && <BrandKit {...pageProps} />}
      </main>

      {/* Toast */}
      {toast && (
        <div className="toast" style={{
          background: toast.type === 'alert' ? 'rgba(255,45,85,0.95)' :
                      toast.type === 'success' ? 'rgba(52,199,89,0.95)' : 'rgba(30,30,46,0.95)',
          color: 'white',
          padding: '14px 20px',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 500,
          maxWidth: 380,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
