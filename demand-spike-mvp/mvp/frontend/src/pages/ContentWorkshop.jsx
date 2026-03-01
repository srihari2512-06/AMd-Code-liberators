import { useState, useEffect } from 'react'
import { Sparkles, Star, Copy, CheckCircle, Zap, AlertTriangle } from 'lucide-react'

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', color: '#FF2D55' },
  { id: 'instagram', label: 'Instagram', color: '#E1306C' },
  { id: 'email', label: 'Email', color: '#0A84FF' },
]

function ScoreMeter({ score }) {
  const color = score >= 80 ? '#34C759' : score >= 65 ? '#FF9500' : '#FF2D55'
  const label = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Average' : 'Poor'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: '#1E1E2E', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 24 }}>{score}</span>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function AdVariant({ variant, onCopy, copied }) {
  const scoreColor = variant.performance_score >= 80 ? '#34C759' : variant.performance_score >= 65 ? '#FF9500' : '#FF2D55'
  return (
    <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Performance badge */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        background: `${scoreColor}20`, border: `1px solid ${scoreColor}40`,
        borderRadius: 100, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: scoreColor,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Star size={10} fill={scoreColor} /> {variant.performance_score}
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.06em', marginBottom: 8 }}>
        {variant.tone?.toUpperCase()} ANGLE
      </div>
      
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, paddingRight: 80 }}>
        {variant.headline}
      </div>
      
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12, 
                    padding: '12px 14px', background: 'var(--muted)', borderRadius: 8 }}>
        {variant.body}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>CTA: <strong style={{ color: 'white' }}>{variant.cta}</strong></span>
          <span>Est. CTR: <strong style={{ color: '#FF6B00' }}>{variant.predicted_ctr}</strong></span>
        </div>
        <button
          className="btn-ghost"
          style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          onClick={() => onCopy(`${variant.headline}\n\n${variant.body}\n\n${variant.cta}`)}
        >
          {copied ? <><CheckCircle size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
    </div>
  )
}

function ScoreResult({ result }) {
  if (!result) return null
  const scoreColor = result.performance_score >= 80 ? '#34C759' : result.performance_score >= 65 ? '#FF9500' : '#FF2D55'
  
  return (
    <div className="card" style={{ marginTop: 16, borderLeft: `3px solid ${scoreColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor }}>{result.performance_score}</div>
        <div>
          <div style={{ fontWeight: 600 }}>{result.recommendation} Performance</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Est. CTR: {result.predicted_ctr} · Revenue Lift: {result.predicted_revenue_lift}
            {result.ai_powered && <span style={{ marginLeft: 6, color: '#FF6B00' }}>· AI Powered</span>}
          </div>
        </div>
        {!result.brand_safe && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#FF2D55', fontSize: 12 }}>
            <AlertTriangle size={12} /> Not brand-safe
          </div>
        )}
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#34C759', fontWeight: 600, marginBottom: 6 }}>STRENGTHS</div>
          {result.strengths?.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3, display: 'flex', gap: 6 }}>
              <span style={{ color: '#34C759' }}>✓</span> {s}
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#FF9500', fontWeight: 600, marginBottom: 6 }}>IMPROVEMENTS</div>
          {result.improvements?.map((s, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3, display: 'flex', gap: 6 }}>
              <span style={{ color: '#FF9500' }}>→</span> {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ContentWorkshop({ showToast }) {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [generating, setGenerating] = useState(false)
  const [variants, setVariants] = useState(null)
  const [copied, setCopied] = useState(null)
  
  // Score tab
  const [scoreText, setScoreText] = useState('')
  const [scoreName, setScoreName] = useState('')
  const [scoring, setScoring] = useState(false)
  const [scoreResult, setScoreResult] = useState(null)
  const [tab, setTab] = useState('generate')

  useEffect(() => {
    fetch('/api/trends').then(r => r.json()).then(data => {
      setProducts(data)
      if (data.length > 0) setSelectedProduct(data[0].id)
    }).catch(() => {})
  }, [])

  const handleGenerate = async () => {
    if (!selectedProduct) return
    setGenerating(true)
    setVariants(null)
    try {
      const data = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: Number(selectedProduct), platform }),
      }).then(r => r.json())
      setVariants(data)
    } catch (e) {
      showToast('Content generation failed', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleScore = async () => {
    if (!scoreText.trim()) return
    setScoring(true)
    setScoreResult(null)
    try {
      const data = await fetch('/api/content/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copy_text: scoreText, product_name: scoreName || 'Product', platform }),
      }).then(r => r.json())
      setScoreResult(data)
    } catch (e) {
      showToast('Scoring failed', 'error')
    } finally {
      setScoring(false)
    }
  }

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(text)
    setTimeout(() => setCopied(null), 2000)
    showToast('Copied to clipboard', 'success')
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Content Workshop</h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          AI-generated ad content with Brand Kit compliance + performance scoring
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--card)', 
                    border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        <button className={`nav-tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
          <Sparkles size={14} /> Generate Ads
        </button>
        <button className={`nav-tab ${tab === 'score' ? 'active' : ''}`} onClick={() => setTab('score')}>
          <Star size={14} /> Score My Copy
        </button>
      </div>

      {tab === 'generate' && (
        <>
          {/* Controls */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                  Trending Product
                </label>
                <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)}
                  className="input-dark">
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product} (Spike: {p.spike_score}/100)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Platform</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PLATFORMS.map(p => (
                    <button key={p.id} onClick={() => setPlatform(p.id)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        border: platform === p.id ? `1px solid ${p.color}` : '1px solid var(--border)',
                        background: platform === p.id ? `${p.color}20` : 'transparent',
                        color: platform === p.id ? p.color : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn-primary" style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={handleGenerate} disabled={generating || !selectedProduct}>
                {generating ? (
                  <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>◌</span> Generating...</>
                ) : (
                  <><Sparkles size={14} /> Generate 3 Variants</>
                )}
              </button>
            </div>

            {variants?.ai_powered === false && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,149,0,0.1)', 
                            border: '1px solid rgba(255,149,0,0.2)', borderRadius: 8, fontSize: 12, color: '#FF9500' }}>
                ⚠️ Running in fallback mode. Set ANTHROPIC_API_KEY in .env for AI-powered generation.
              </div>
            )}
          </div>

          {generating && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Claude is crafting your ad variants...</div>
              <div style={{ fontSize: 13 }}>Analyzing spike data, applying Brand Kit, scoring performance</div>
            </div>
          )}

          {variants && !generating && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontWeight: 600 }}>3 Brand-Safe Variants Generated</span>
                {variants.brand_compliance && (
                  <span className="badge badge-healthy"><CheckCircle size={10} /> Brand Compliant</span>
                )}
                {variants.ai_powered && (
                  <span className="badge badge-info"><Zap size={10} /> Claude AI</span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {variants.variants?.map((v, i) => (
                  <AdVariant key={i} variant={v} onCopy={handleCopy} copied={copied === `${v.headline}\n\n${v.body}\n\n${v.cta}`} />
                ))}
              </div>
            </div>
          )}

          {!variants && !generating && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)',
                          border: '1px dashed var(--border)', borderRadius: 12 }}>
              <Sparkles size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Select a product and click Generate</div>
              <div style={{ fontSize: 13 }}>3 performance-scored variants will appear here, checked against your Brand Kit</div>
            </div>
          )}
        </>
      )}

      {tab === 'score' && (
        <div style={{ maxWidth: 640 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Product Name</label>
              <input className="input-dark" value={scoreName} onChange={e => setScoreName(e.target.value)}
                placeholder="e.g. Stanley Quencher" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                Paste your marketing copy below
              </label>
              <textarea className="input-dark" value={scoreText} onChange={e => setScoreText(e.target.value)}
                placeholder="Paste your ad headline, caption, email body, or any marketing copy..."
                style={{ minHeight: 140 }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Platform</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => setPlatform(p.id)}
                    style={{
                      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: platform === p.id ? `1px solid ${p.color}` : '1px solid var(--border)',
                      background: platform === p.id ? `${p.color}20` : 'transparent',
                      color: platform === p.id ? p.color : 'var(--text-secondary)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={handleScore} disabled={!scoreText.trim() || scoring}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {scoring ? 'Scoring...' : <><Star size={14} /> Score This Copy</>}
            </button>
          </div>

          <ScoreResult result={scoreResult} />
        </div>
      )}
    </div>
  )
}
