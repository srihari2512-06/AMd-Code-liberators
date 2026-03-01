"""
Social Media Simulator
Generates realistic TikTok/Instagram trend events for MVP demo.
In production, replace with real API calls to TikTok Shop API, Meta Graph API, X API v2.
"""
import random
import sqlite3
from datetime import datetime
from database import get_db_connection

VIRAL_PRODUCTS = [
    "Stanley Quencher 40oz Tumbler",
    "Glow Recipe Watermelon Toner", 
    "Niacinamide 10% Serum",
    "Lululemon Belt Bag",
    "Prime Energy Drink Can 12pk",
]

CREATOR_HANDLES = [
    "@shopwithme.daily", "@trendhunter_k", "@viralfinds2024",
    "@beauty.obsessed", "@tikshop.hauls", "@findmythings_",
    "@deals.with.dana", "@productreview_stan", "@hauls.by.hana",
]

PLATFORMS = ["tiktok", "instagram", "x"]

VIRAL_PHRASES = [
    "omg I finally tried this and now I understand the hype",
    "this product literally changed my life no joke",
    "POV: you finally bought the thing everyone keeps talking about",
    "it's giving main character energy and I'm obsessed",
    "okay but WHY did I wait so long to try this",
    "the viral [product] is back in stock — grab it NOW",
    "unboxing the most hyped product of 2024",
    "I was skeptical but this actually works",
]

class SocialSimulator:
    def __init__(self):
        self.tick = 0
    
    def generate_live_event(self) -> dict:
        """Generate a realistic trending event and update the database."""
        self.tick += 1
        
        conn = get_db_connection()
        products = conn.execute("SELECT * FROM products ORDER BY current_spike_score DESC").fetchall()
        
        if not products:
            conn.close()
            return {}
        
        # Weight towards higher spike products (more likely to get new events)
        weights = [max(p["current_spike_score"], 5) for p in products]
        total = sum(weights)
        normalized = [w / total for w in weights]
        
        product = random.choices(products, weights=normalized, k=1)[0]
        platform = random.choice(PLATFORMS)
        creator = random.choice(CREATOR_HANDLES)
        followers = random.randint(10000, 8000000)
        
        # Virality acceleration: higher score = more views
        base_views = product["views_per_hour"]
        new_views = random.randint(
            int(base_views * 0.8),
            int(base_views * 1.4)
        )
        
        # Update spike score with momentum
        current_score = product["current_spike_score"]
        delta = random.randint(-5, 12)  # Bias upward for demo excitement
        new_score = max(5, min(100, current_score + delta))
        
        # Recalculate predicted demand
        velocity = product["daily_sales_velocity"]
        spike_multiplier = 1 + (new_score / 100) * 4  # Max 5x demand at score 100
        predicted_demand = int(velocity * 2 * spike_multiplier)
        
        # Update database
        conn.execute("""
            UPDATE products SET 
                current_spike_score = ?,
                views_per_hour = ?,
                predicted_demand_48h = ?,
                updated_at = datetime('now')
            WHERE id = ?
        """, (new_score, new_views, predicted_demand, product["id"]))
        
        conn.execute("""
            INSERT INTO spike_history (product_id, spike_score, views_per_hour, created_at)
            VALUES (?, ?, ?, datetime('now'))
        """, (product["id"], new_score, new_views))
        
        conn.execute("""
            INSERT INTO social_events (product_id, platform, event_type, creator_handle,
            creator_followers, views, engagement_rate, sentiment, created_at)
            VALUES (?, ?, 'mention', ?, ?, ?, ?, 'positive', datetime('now'))
        """, (product["id"], platform, creator, followers, new_views,
              round(random.uniform(3.5, 11.0), 2)))
        
        # Auto-create alerts for spikes crossing thresholds
        if new_score >= 70 and current_score < 70:
            conn.execute("""
                INSERT INTO alerts (product_id, type, message, status)
                VALUES (?, 'spike_detected', ?, 'pending')
            """, (product["id"], 
                  f"⚡ {product['name']} just crossed the 70-point spike threshold on {platform}. "
                  f"Predicted demand next 48h: {predicted_demand:,} units. "
                  f"Current stock: {product['stock_units']:,} units."))
        
        conn.commit()
        conn.close()
        
        return {
            "product_id": product["id"],
            "product": product["name"],
            "platform": platform,
            "creator": creator,
            "creator_followers": followers,
            "views": new_views,
            "spike_score": new_score,
            "previous_score": current_score,
            "predicted_demand_increase": predicted_demand - product["predicted_demand_48h"],
            "timestamp": datetime.now().isoformat(),
            "caption_preview": random.choice(VIRAL_PHRASES).replace("[product]", product["name"].split()[0]),
        }
    
    def generate_spike_scenario(self, product_id: int, intensity: str = "high") -> dict:
        """Force a spike scenario for demo purposes."""
        conn = get_db_connection()
        
        score_map = {"low": 55, "medium": 72, "high": 89, "extreme": 97}
        target_score = score_map.get(intensity, 72)
        
        conn.execute("""
            UPDATE products SET current_spike_score = ?, views_per_hour = ?,
            updated_at = datetime('now') WHERE id = ?
        """, (target_score, target_score * 600, product_id))
        
        product = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        conn.commit()
        conn.close()
        
        return {
            "product": product["name"],
            "new_score": target_score,
            "intensity": intensity,
            "message": f"Spike scenario triggered: {product['name']} at {target_score}/100"
        }
