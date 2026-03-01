# ⚡ SME Demand Spike Command Center
### AMD Slingshot Competition — AI-Powered Business Operations Hub

> An AI operations platform that detects viral social media demand spikes before they peak, then automatically triggers inventory reorders, dynamic pricing, and brand-safe ad content — all from one dashboard.

---

## 🚀 Quick Start (5 minutes)

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **npm** or **yarn**
- (Optional) **Anthropic API Key** — for Claude-powered AI content generation

---

### 1. Clone / Unzip the Project

```bash
cd demand-spike-mvp
```

---

### 2. Start the Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY (optional but recommended)

# Start the server
python main.py
```

Backend runs at **http://localhost:8000**
API docs available at **http://localhost:8000/docs**

---

### 3. Start the Frontend (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend runs at **http://localhost:3000**

---

## 🎯 What You Can Demo

### Command Center Dashboard
- Live **Spike Risk Score** gauge (0–100) across all monitored products
- Real-time **social feed ticker** with events updated every 15 seconds
- KPI cards: active alerts, high-risk products, inventory value, weekly reorders
- 6-hour virality velocity chart

### Live Trend Monitor
- Real-time table of all products ranked by spike score
- Sparkline mini-charts showing trend momentum
- Filter by: All / Critical / Warning / Normal
- Live ticker at top showing most recent social event

### Inventory Manager
- Stock levels vs. AI-predicted 48-hour demand (orange marker = demand line)
- Status badges: Critical (≤2 days) / Warning (≤5 days) / Healthy
- One-tap reorder approval with cost estimation
- Decline flow with audit trail

### Dynamic Pricing Engine
- Tiered price recommendations based on spike intensity:
  - Score 80+: +25% uplift
  - Score 65+: +15% uplift
  - Score 50+: +8% uplift
  - Score 40+: +3% uplift
- Estimated revenue gain calculator for each product
- One-click apply / revert on Shopify/WooCommerce (simulated in MVP)

### Content Workshop — Generate Tab
- Select any trending product + platform (TikTok / Instagram / Email)
- Claude generates 3 distinct ad variants:
  - Urgency/Scarcity angle
  - Social Proof/FOMO angle
  - Curiosity/Discovery angle
- Each variant shows: Performance Score (0–100), Predicted CTR, Brand compliance check
- One-click copy to clipboard

### Content Workshop — Score My Copy Tab
- Paste any marketing copy
- Get instant performance score, predicted CTR, revenue lift estimate
- Strengths + improvement suggestions
- Brand safety check against your Brand Kit

### Brand Kit
- Set brand name, tagline, colors, tone keywords, banned words
- Visual preview card updates in real time
- All AI content automatically validated against these settings

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Tailwind)                │
│  Dashboard | Trends | Inventory | Pricing | Content | BrandKit  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST API + WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                     BACKEND (FastAPI + Python)                   │
│  Routes: /api/dashboard, /api/trends, /api/inventory,           │
│          /api/pricing, /api/content/*, /api/brand-kit           │
│  WebSocket: /ws/live (real-time spike events)                   │
└──────────┬────────────────┬─────────────────┬───────────────────┘
           │                │                 │
┌──────────▼──────┐ ┌───────▼──────┐ ┌────────▼────────────────────┐
│   SQLite DB     │ │   Simulator  │ │      AI Engine               │
│  - products     │ │   (MVP demo  │ │  Claude claude-opus-4-6      │
│  - spike_history│ │   In prod:   │ │  - Ad content generation     │
│  - social_events│ │   TikTok API │ │  - Performance scoring       │
│  - alerts       │ │   Instagram  │ │  - Sentiment analysis        │
│  - reorders     │ │   X API v2)  │ │  Falls back to heuristics    │
│  - price_changes│ └──────────────┘ │  if no API key               │
│  - brand_kit    │                  └──────────────────────────────┘
└─────────────────┘
```

---

## 🔑 AMD Hardware Stack (Production)

| Component | AMD Product | Role |
|-----------|-------------|------|
| LLM Inference | AMD Instinct MI300X (192GB HBM3) | LLaMA-3 70B sentiment + content models |
| Image Generation | AMD MI300X | Stable Diffusion XL ad creatives |
| Stream Processing | AMD EPYC 9004 (128 cores) | Kafka + FastAPI at 50K events/sec |
| GPU Software | ROCm 6.x | PyTorch / TensorFlow without CUDA |
| Edge Alerts | AMD Ryzen AI | Offline demand scoring on retail devices |

---

## 📡 API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/dashboard` | GET | Overall stats, spike risk, KPIs |
| `/api/trends` | GET | All products ranked by spike score |
| `/api/trends/history` | GET | 6-hour chart data |
| `/api/inventory` | GET | Stock levels vs. demand |
| `/api/inventory/reorder/{id}/approve` | POST | Approve a reorder with qty |
| `/api/inventory/reorder/{id}/decline` | POST | Decline pending reorder |
| `/api/pricing` | GET | Dynamic pricing recommendations |
| `/api/pricing/apply/{id}` | POST | Apply price uplift |
| `/api/pricing/revert/{id}` | POST | Revert price change |
| `/api/content/generate` | POST | Generate 3 AI ad variants |
| `/api/content/score` | POST | Score marketing copy |
| `/api/brand-kit` | GET/PUT | Read/update Brand Kit |
| `/api/alerts` | GET | Pending alerts |
| `/ws/live` | WebSocket | Real-time spike events |

---

## 🔮 Production Roadmap

1. **Replace simulator** with real TikTok Shop API, Instagram Graph API, X Streaming API
2. **Swap SQLite** for PostgreSQL + Redis for multi-tenant scale
3. **Deploy LLaMA-3 70B** on AMD Instinct MI300X via ROCm for on-prem AI
4. **Add Shopify/WooCommerce webhooks** for live price changes
5. **Supplier API integration** for automated purchase orders
6. **Pinecone vector DB** for semantic trend pattern search
7. **Multi-tenant SaaS** with Stripe billing at $99/$199/$499/mo tiers

---

## 💡 Team

Built for **AMD Slingshot Competition 2025**  
Powered by **AMD Instinct MI300X + EPYC 9004 + ROCm** × **Claude AI (Anthropic)**

---

*"Turning viral moments into business wins — before your competitors even know what's trending."*
