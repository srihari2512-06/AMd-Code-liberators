import { useState, useEffect } from 'react'
import { Palette, Save, CheckCircle } from 'lucide-react'

const TONE_OPTIONS = ['energetic', 'authentic', 'playful', 'premium', 'bold', 'friendly', 'trustworthy', 'trendy', 'minimalist', 'luxurious']

export default function BrandKit({ showToast }) {
  const [kit, setKit] = useState({
    brand_name: '',
    primary_color: '#FF6B35',
    secondary_color: '#1A1A2E',
    tone_keywords: '',
    banned_words: '',
    tagline: '',
    target_audience: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brand-kit').then(r => r.json()).then(data => {
      if (data && Object.keys(data).length > 0) setKit(k => ({ ...k, ...data }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/brand-kit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kit),
      })
      setSaved(true)
      showToast('✓ Brand Kit saved! All future AI content will use these guidelines.', 'success')
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      showToast('Failed to save Brand Kit', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleTone = (tone) => {
    const current = kit.tone_keywords.split(',').map(t => t.trim()).filter(Boolean)
    const updated = current.includes(tone)
      ? current.filter(t => t !== tone)
      : [...current, tone]
    setKit(k => ({ ...k, tone_keywords: updated.join(', ') }))
  }

  const activeTones = kit.tone_keywords.split(',').map(t => t.trim()).filter(Boolean)

  if (loading) return <div style={{ padding: 32, color: 'var(--text-secondary)' }}>Loading Brand Kit...</div>

  return (
    <div style={{ padding: '28px 32px', maxWidth: 780 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Brand Kit</h1>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Define your brand identity. All AI-generated content will be automatically validated against these guidelines.
        </div>
      </div>

      {/* Brand Preview */}
      <div className="card" style={{ marginBottom: 20, background: kit.secondary_color || 'var(--card)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: kit.primary_color }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 8 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 10,
            background: kit.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: 'white', fontFamily: 'Space Grotesk',
          }}>
            {(kit.brand_name || 'B').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{kit.brand_name || 'Your Brand'}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{kit.tagline || 'Your tagline here'}</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {activeTones.slice(0, 3).map(t => (
              <span key={t} style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 100,
                background: `${kit.primary_color}30`, color: kit.primary_color,
                border: `1px solid ${kit.primary_color}40`,
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Basic info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Palette size={14} color="var(--amd-orange)" /> Brand Identity
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Brand Name *</label>
              <input className="input-dark" value={kit.brand_name} onChange={e => setKit(k => ({ ...k, brand_name: e.target.value }))}
                placeholder="e.g. MyBrand Store" />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Tagline</label>
              <input className="input-dark" value={kit.tagline} onChange={e => setKit(k => ({ ...k, tagline: e.target.value }))}
                placeholder="e.g. Trending products, curated for you" />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Target Audience</label>
              <textarea className="input-dark" value={kit.target_audience}
                onChange={e => setKit(k => ({ ...k, target_audience: e.target.value }))}
                placeholder="Describe your ideal customer..." style={{ minHeight: 80 }} />
            </div>
          </div>

          {/* Colors */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Brand Colors</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Primary Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={kit.primary_color}
                    onChange={e => setKit(k => ({ ...k, primary_color: e.target.value }))}
                    style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, padding: 0 }} />
                  <input className="input-dark" value={kit.primary_color}
                    onChange={e => setKit(k => ({ ...k, primary_color: e.target.value }))}
                    style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Secondary Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={kit.secondary_color}
                    onChange={e => setKit(k => ({ ...k, secondary_color: e.target.value }))}
                    style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8, padding: 0 }} />
                  <input className="input-dark" value={kit.secondary_color}
                    onChange={e => setKit(k => ({ ...k, secondary_color: e.target.value }))}
                    style={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tone & guardrails */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Tone of Voice</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Select keywords that define how your brand sounds. AI will apply these to every piece of generated content.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {TONE_OPTIONS.map(tone => {
                const active = activeTones.includes(tone)
                return (
                  <button key={tone} onClick={() => toggleTone(tone)}
                    style={{
                      padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                      border: active ? '1px solid var(--amd-orange)' : '1px solid var(--border)',
                      background: active ? 'rgba(255,107,0,0.15)' : 'transparent',
                      color: active ? '#FF6B00' : 'var(--text-secondary)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                    {tone}
                  </button>
                )
              })}
            </div>
            <input className="input-dark" value={kit.tone_keywords}
              onChange={e => setKit(k => ({ ...k, tone_keywords: e.target.value }))}
              placeholder="Or type custom keywords, comma-separated"
              style={{ fontSize: 12 }} />
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Content Guardrails</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Words and phrases AI must never use. Protects brand reputation during high-volume periods.
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Banned Words / Phrases</label>
              <textarea className="input-dark" value={kit.banned_words}
                onChange={e => setKit(k => ({ ...k, banned_words: e.target.value }))}
                placeholder="e.g. cheap, knockoff, inferior, fake — comma separated"
                style={{ minHeight: 70 }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 12px', background: 'var(--muted)', borderRadius: 8 }}>
              💡 <strong>Pro tip:</strong> Include competitor names, misleading claim words, or any terms that conflict with your brand promise.
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={handleSave} disabled={saving}>
          {saved ? <><CheckCircle size={14} /> Saved!</> : saving ? 'Saving...' : <><Save size={14} /> Save Brand Kit</>}
        </button>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Changes apply immediately to all future AI content generation
        </div>
      </div>
    </div>
  )
}
