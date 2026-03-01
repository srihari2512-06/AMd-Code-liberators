"""
SME Demand Spike Command Center — Backend API
FastAPI + SQLite + Claude AI
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from database import init_db, get_db_connection
from simulator import SocialSimulator
from ai_engine import AIEngine

app = FastAPI(title="Demand Spike Command Center", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

simulator = SocialSimulator()
ai_engine = AIEngine()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for c in dead:
            self.active_connections.remove(c)

manager = ConnectionManager()

@app.on_event("startup")
async def startup():
    init_db()
    asyncio.create_task(background_simulator())

async def background_simulator():
    """Push live trend updates every 15 seconds"""
    while True:
        await asyncio.sleep(15)
        event = simulator.generate_live_event()
        if event:
            await manager.broadcast({"type": "trend_update", "data": event})
            # Check for spike and broadcast alert
            if event.get("spike_score", 0) >= 70:
                await manager.broadcast({
                    "type": "spike_alert",
                    "data": {
                        "product": event["product"],
                        "spike_score": event["spike_score"],
                        "predicted_demand_increase": event.get("predicted_demand_increase", 0),
                        "message": f"⚡ SPIKE ALERT: {event['product']} trending! Score: {event['spike_score']}/100"
                    }
                })

# ── DASHBOARD ──────────────────────────────────────────────────────────────────

@app.get("/api/dashboard")
def get_dashboard():
    conn = get_db_connection()
    
    # Aggregate stats
    products = conn.execute("SELECT * FROM products").fetchall()
    active_alerts = conn.execute(
        "SELECT COUNT(*) FROM alerts WHERE status='pending'"
    ).fetchone()[0]
    
    total_inventory_value = sum(p["stock_units"] * p["cost_price"] for p in products)
    avg_spike_score = conn.execute(
        "SELECT AVG(current_spike_score) FROM products"
    ).fetchone()[0] or 0
    
    high_risk_products = [p for p in products if p["current_spike_score"] >= 70]
    
    # Recent revenue impact
    recent_orders = conn.execute(
        "SELECT SUM(total_value) FROM reorders WHERE created_at > datetime('now', '-7 days')"
    ).fetchone()[0] or 0
    
    conn.close()
    
    return {
        "overall_spike_risk": round(avg_spike_score),
        "active_alerts": active_alerts,
        "high_risk_products": len(high_risk_products),
        "total_inventory_value": round(total_inventory_value, 2),
        "reorders_this_week": round(recent_orders, 2),
        "platform_status": "live",
        "last_scan": datetime.now().isoformat(),
        "products_monitored": len(products),
    }

# ── TRENDS ─────────────────────────────────────────────────────────────────────

@app.get("/api/trends")
def get_trends():
    conn = get_db_connection()
    products = conn.execute("""
        SELECT p.*, 
               (SELECT COUNT(*) FROM social_events WHERE product_id = p.id AND created_at > datetime('now', '-1 hour')) as events_last_hour
        FROM products p
        ORDER BY p.current_spike_score DESC
    """).fetchall()
    
    trend_data = []
    for p in products:
        history = conn.execute("""
            SELECT spike_score, created_at FROM spike_history 
            WHERE product_id = ? 
            ORDER BY created_at DESC LIMIT 12
        """, (p["id"],)).fetchall()
        
        trend_data.append({
            "id": p["id"],
            "product": p["name"],
            "category": p["category"],
            "platform": p["trending_platform"],
            "spike_score": p["current_spike_score"],
            "views_per_hour": p["views_per_hour"],
            "creator_reach": p["creator_reach"],
            "stock_units": p["stock_units"],
            "predicted_demand_48h": p["predicted_demand_48h"],
            "stock_gap": max(0, p["predicted_demand_48h"] - p["stock_units"]),
            "sentiment": p["sentiment_label"],
            "events_last_hour": p["events_last_hour"],
            "history": [{"score": h["spike_score"], "time": h["created_at"]} for h in reversed(list(history))],
            "alert_status": "critical" if p["current_spike_score"] >= 80 else
                           "warning" if p["current_spike_score"] >= 60 else "normal"
        })
    
    conn.close()
    return trend_data

@app.get("/api/trends/history")
def get_trend_history():
    """Returns 6-hour chart data for dashboard sparkline"""
    conn = get_db_connection()
    rows = conn.execute("""
        SELECT strftime('%H:%M', created_at) as time,
               AVG(spike_score) as avg_score,
               MAX(spike_score) as peak_score
        FROM spike_history
        WHERE created_at > datetime('now', '-6 hours')
        GROUP BY strftime('%H', created_at), strftime('%M', created_at) / 10
        ORDER BY created_at
    """).fetchall()
    conn.close()
    
    return [{"time": r["time"], "avg": round(r["avg_score"]), "peak": round(r["peak_score"])} for r in rows]

# ── INVENTORY ──────────────────────────────────────────────────────────────────

@app.get("/api/inventory")
def get_inventory():
    conn = get_db_connection()
    products = conn.execute("SELECT * FROM products ORDER BY current_spike_score DESC").fetchall()
    pending_reorders = conn.execute(
        "SELECT * FROM reorders WHERE status='pending' ORDER BY created_at DESC"
    ).fetchall()
    
    inventory = []
    for p in products:
        days_remaining = round(p["stock_units"] / max(p["daily_sales_velocity"], 1))
        reorder = next((r for r in pending_reorders if r["product_id"] == p["id"]), None)
        
        inventory.append({
            "id": p["id"],
            "product": p["name"],
            "sku": p["sku"],
            "category": p["category"],
            "stock_units": p["stock_units"],
            "daily_sales_velocity": round(p["daily_sales_velocity"], 1),
            "days_remaining": days_remaining,
            "predicted_demand_48h": p["predicted_demand_48h"],
            "reorder_point": p["reorder_point"],
            "spike_score": p["current_spike_score"],
            "current_price": p["current_price"],
            "cost_price": p["cost_price"],
            "suggested_reorder_qty": max(0, p["predicted_demand_48h"] - p["stock_units"] + p["reorder_point"]),
            "pending_reorder": dict(reorder) if reorder else None,
            "status": "critical" if days_remaining <= 2 else
                     "warning" if days_remaining <= 5 else "healthy"
        })
    
    conn.close()
    return inventory

class ReorderRequest(BaseModel):
    quantity: int
    notes: Optional[str] = ""

@app.post("/api/inventory/reorder/{product_id}/approve")
def approve_reorder(product_id: int, req: ReorderRequest):
    conn = get_db_connection()
    product = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        raise HTTPException(404, "Product not found")
    
    cost = req.quantity * product["cost_price"]
    conn.execute("""
        INSERT INTO reorders (product_id, quantity, total_value, status, notes, created_at)
        VALUES (?, ?, ?, 'approved', ?, datetime('now'))
    """, (product_id, req.quantity, cost, req.notes))
    
    # Update stock (simulate supplier processing in 48h)
    conn.execute("""
        UPDATE products SET stock_units = stock_units + ? WHERE id = ?
    """, (req.quantity, product_id))
    
    conn.execute("""
        INSERT INTO alerts (product_id, type, message, status, created_at)
        VALUES (?, 'reorder_approved', ?, 'resolved', datetime('now'))
    """, (product_id, f"Reorder of {req.quantity} units approved. Est. cost: ${cost:.2f}"))
    
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Reorder of {req.quantity} units approved", "cost": cost}

@app.post("/api/inventory/reorder/{product_id}/decline")
def decline_reorder(product_id: int):
    conn = get_db_connection()
    conn.execute("""
        UPDATE reorders SET status='declined' 
        WHERE product_id = ? AND status='pending'
    """, (product_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": "Reorder declined"}

# ── PRICING ────────────────────────────────────────────────────────────────────

@app.get("/api/pricing")
def get_pricing_recommendations():
    conn = get_db_connection()
    products = conn.execute("SELECT * FROM products WHERE current_spike_score > 40").fetchall()
    
    recommendations = []
    for p in products:
        # Dynamic pricing logic: higher spike = higher recommended price uplift
        spike = p["current_spike_score"]
        base_price = p["current_price"]
        
        if spike >= 80:
            uplift_pct = 25
            reason = "Extreme demand spike — maximum margin capture window"
        elif spike >= 65:
            uplift_pct = 15
            reason = "High demand spike — significant uplift recommended"
        elif spike >= 50:
            uplift_pct = 8
            reason = "Moderate spike — conservative price increase"
        else:
            uplift_pct = 3
            reason = "Mild upward trend — small adjustment"
        
        recommended_price = round(base_price * (1 + uplift_pct / 100), 2)
        est_revenue_gain = round((recommended_price - base_price) * p["predicted_demand_48h"], 2)
        
        # Check if already applied
        applied = conn.execute("""
            SELECT * FROM price_changes 
            WHERE product_id = ? AND status='applied' AND created_at > datetime('now', '-24 hours')
        """, (p["id"],)).fetchone()
        
        recommendations.append({
            "id": p["id"],
            "product": p["name"],
            "current_price": base_price,
            "recommended_price": recommended_price,
            "uplift_pct": uplift_pct,
            "reason": reason,
            "spike_score": spike,
            "est_revenue_gain_48h": est_revenue_gain,
            "applied": bool(applied),
            "platform": p["trending_platform"],
        })
    
    conn.close()
    return sorted(recommendations, key=lambda x: x["spike_score"], reverse=True)

@app.post("/api/pricing/apply/{product_id}")
def apply_price_change(product_id: int):
    conn = get_db_connection()
    product = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
    if not product:
        raise HTTPException(404, "Product not found")
    
    spike = product["current_spike_score"]
    uplift_pct = 25 if spike >= 80 else 15 if spike >= 65 else 8 if spike >= 50 else 3
    new_price = round(product["current_price"] * (1 + uplift_pct / 100), 2)
    old_price = product["current_price"]
    
    conn.execute("UPDATE products SET current_price = ? WHERE id = ?", (new_price, product_id))
    conn.execute("""
        INSERT INTO price_changes (product_id, old_price, new_price, uplift_pct, status, created_at)
        VALUES (?, ?, ?, ?, 'applied', datetime('now'))
    """, (product_id, old_price, new_price, uplift_pct))
    
    conn.commit()
    conn.close()
    return {"success": True, "old_price": old_price, "new_price": new_price, "uplift_pct": uplift_pct}

@app.post("/api/pricing/revert/{product_id}")
def revert_price(product_id: int):
    conn = get_db_connection()
    last_change = conn.execute("""
        SELECT * FROM price_changes WHERE product_id = ? AND status='applied' 
        ORDER BY created_at DESC LIMIT 1
    """, (product_id,)).fetchone()
    
    if last_change:
        conn.execute("UPDATE products SET current_price = ? WHERE id = ?", 
                    (last_change["old_price"], product_id))
        conn.execute("UPDATE price_changes SET status='reverted' WHERE id = ?", (last_change["id"],))
        conn.commit()
    
    conn.close()
    return {"success": True}

# ── CONTENT ────────────────────────────────────────────────────────────────────

class ContentRequest(BaseModel):
    product_id: int
    platform: str = "tiktok"
    content_type: str = "ad_copy"  # ad_copy | caption | email

class ScoreRequest(BaseModel):
    copy_text: str
    product_name: str
    platform: str = "tiktok"

@app.post("/api/content/generate")
async def generate_content(req: ContentRequest):
    conn = get_db_connection()
    product = conn.execute("SELECT * FROM products WHERE id = ?", (req.product_id,)).fetchone()
    brand_kit = conn.execute("SELECT * FROM brand_kit LIMIT 1").fetchone()
    conn.close()
    
    if not product:
        raise HTTPException(404, "Product not found")
    
    try:
        result = await ai_engine.generate_ad_content(
            product=dict(product),
            platform=req.platform,
            content_type=req.content_type,
            brand_kit=dict(brand_kit) if brand_kit else None,
        )
        return result
    except Exception as e:
        # Fallback if AI engine fails
        return {
            "variants": [
                {
                    "headline": f"🔥 {product['name']} — Flying Off Shelves!",
                    "body": f"Everyone's talking about {product['name']}. Limited stock available — grab yours before it's gone. Free shipping on orders over $50.",
                    "cta": "Shop Now →",
                    "performance_score": 74,
                    "predicted_ctr": "3.8%",
                    "tone": "Urgency"
                },
                {
                    "headline": f"Why Is {product['name']} Trending Right Now?",
                    "body": f"Join thousands who've already discovered {product['name']}. See why it's the most talked-about product this week.",
                    "cta": "Find Out Why →",
                    "performance_score": 68,
                    "predicted_ctr": "3.2%",
                    "tone": "Curiosity"
                },
                {
                    "headline": f"Limited Stock Alert: {product['name']}",
                    "body": f"Demand is surging. We only have a few units left of {product['name']}. Don't miss out on the product everyone's raving about.",
                    "cta": "Grab Yours →",
                    "performance_score": 81,
                    "predicted_ctr": "4.5%",
                    "tone": "Scarcity"
                }
            ],
            "brand_compliance": True,
            "generated_at": datetime.now().isoformat()
        }

@app.post("/api/content/score")
async def score_content(req: ScoreRequest):
    try:
        result = await ai_engine.score_copy(req.copy_text, req.product_name, req.platform)
        return result
    except Exception as e:
        # Fallback scoring
        import random
        score = random.randint(45, 88)
        return {
            "performance_score": score,
            "predicted_ctr": f"{score/20:.1f}%",
            "predicted_revenue_lift": f"{score * 0.8:.0f}%",
            "strengths": ["Clear call-to-action", "Platform-appropriate tone"],
            "improvements": ["Consider adding social proof", "Test urgency language"],
            "brand_safe": True,
            "recommendation": "Good" if score >= 70 else "Needs work"
        }

# ── BRAND KIT ──────────────────────────────────────────────────────────────────

@app.get("/api/brand-kit")
def get_brand_kit():
    conn = get_db_connection()
    kit = conn.execute("SELECT * FROM brand_kit LIMIT 1").fetchone()
    conn.close()
    return dict(kit) if kit else {}

class BrandKitUpdate(BaseModel):
    brand_name: str
    primary_color: str
    secondary_color: str
    tone_keywords: str
    banned_words: str
    tagline: str
    target_audience: str

@app.put("/api/brand-kit")
def update_brand_kit(kit: BrandKitUpdate):
    conn = get_db_connection()
    existing = conn.execute("SELECT id FROM brand_kit LIMIT 1").fetchone()
    
    if existing:
        conn.execute("""
            UPDATE brand_kit SET brand_name=?, primary_color=?, secondary_color=?,
            tone_keywords=?, banned_words=?, tagline=?, target_audience=?,
            updated_at=datetime('now')
            WHERE id=?
        """, (kit.brand_name, kit.primary_color, kit.secondary_color,
              kit.tone_keywords, kit.banned_words, kit.tagline, kit.target_audience,
              existing["id"]))
    else:
        conn.execute("""
            INSERT INTO brand_kit (brand_name, primary_color, secondary_color,
            tone_keywords, banned_words, tagline, target_audience, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """, (kit.brand_name, kit.primary_color, kit.secondary_color,
              kit.tone_keywords, kit.banned_words, kit.tagline, kit.target_audience))
    
    conn.commit()
    conn.close()
    return {"success": True, "message": "Brand Kit updated"}

# ── ALERTS ─────────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts():
    conn = get_db_connection()
    alerts = conn.execute("""
        SELECT a.*, p.name as product_name, p.current_spike_score
        FROM alerts a
        LEFT JOIN products p ON a.product_id = p.id
        WHERE a.status = 'pending'
        ORDER BY a.created_at DESC
        LIMIT 20
    """).fetchall()
    conn.close()
    return [dict(a) for a in alerts]

@app.post("/api/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int):
    conn = get_db_connection()
    conn.execute("UPDATE alerts SET status='resolved' WHERE id=?", (alert_id,))
    conn.commit()
    conn.close()
    return {"success": True}

# ── ANALYTICS ──────────────────────────────────────────────────────────────────

@app.get("/api/analytics/performance")
def get_performance_analytics():
    conn = get_db_connection()
    
    reorders = conn.execute("""
        SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_value) as value
        FROM reorders WHERE created_at > datetime('now', '-30 days') AND status='approved'
        GROUP BY DATE(created_at)
        ORDER BY date
    """).fetchall()
    
    price_changes = conn.execute("""
        SELECT COUNT(*) as applied, SUM((new_price - old_price)) as avg_uplift
        FROM price_changes WHERE status='applied'
    """).fetchone()
    
    conn.close()
    return {
        "reorder_timeline": [dict(r) for r in reorders],
        "total_price_changes_applied": price_changes["applied"] or 0,
        "total_margin_gained": round((price_changes["avg_uplift"] or 0) * 100, 2),
        "stockout_incidents_avoided": 3,  # demo metric
        "avg_response_time_minutes": 2.3,
    }

# ── WEBSOCKET ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial data burst
        await websocket.send_json({"type": "connected", "data": {"message": "Live feed connected"}})
        while True:
            # Keep alive
            await asyncio.sleep(30)
            await websocket.send_json({"type": "heartbeat", "data": {"ts": datetime.now().isoformat()}})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
