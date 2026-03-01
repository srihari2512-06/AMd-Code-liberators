"""
Database initialization and connection management.
Uses SQLite for MVP simplicity.
"""
import sqlite3
import random
from datetime import datetime, timedelta

DB_PATH = "demand_spike.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sku TEXT UNIQUE NOT NULL,
            category TEXT,
            current_price REAL,
            cost_price REAL,
            stock_units INTEGER,
            reorder_point INTEGER,
            daily_sales_velocity REAL,
            predicted_demand_48h INTEGER,
            current_spike_score INTEGER DEFAULT 0,
            views_per_hour INTEGER DEFAULT 0,
            creator_reach INTEGER DEFAULT 0,
            sentiment_label TEXT DEFAULT 'neutral',
            trending_platform TEXT DEFAULT 'tiktok',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS spike_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            spike_score INTEGER,
            views_per_hour INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS social_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            platform TEXT,
            event_type TEXT,
            creator_handle TEXT,
            creator_followers INTEGER,
            views INTEGER,
            engagement_rate REAL,
            sentiment TEXT,
            content_url TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            type TEXT,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS reorders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            quantity INTEGER,
            total_value REAL,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS price_changes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER,
            old_price REAL,
            new_price REAL,
            uplift_pct REAL,
            status TEXT DEFAULT 'applied',
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (product_id) REFERENCES products(id)
        );

        CREATE TABLE IF NOT EXISTS brand_kit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand_name TEXT,
            primary_color TEXT DEFAULT '#FF6B35',
            secondary_color TEXT DEFAULT '#1A1A2E',
            tone_keywords TEXT DEFAULT 'energetic, trustworthy, bold',
            banned_words TEXT DEFAULT 'cheap, inferior, bad',
            tagline TEXT DEFAULT 'Quality you can trust',
            target_audience TEXT DEFAULT 'Young adults 18-35, social media savvy shoppers',
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)

    # Only seed if empty
    existing = conn.execute("SELECT COUNT(*) FROM products").fetchone()[0]
    if existing == 0:
        _seed_data(conn)

    conn.commit()
    conn.close()

def _seed_data(conn):
    """Seed realistic product and social event data"""
    products = [
        ("Stanley Quencher 40oz Tumbler", "STN-40-BLK", "Drinkware", 44.99, 12.50, 48, 100, 22.5, 820, 87, 45000, 2100000, "very_positive", "tiktok"),
        ("Glow Recipe Watermelon Toner", "GR-WM-TN-150", "Skincare", 34.99, 9.80, 156, 200, 45.0, 1240, 72, 32000, 890000, "positive", "tiktok"),
        ("Niacinamide 10% Serum", "ORD-NIA-30ML", "Skincare", 12.99, 3.20, 312, 400, 78.0, 1800, 61, 28000, 540000, "positive", "instagram"),
        ("Lululemon Belt Bag", "LLL-BB-BLK-1L", "Accessories", 38.00, 11.50, 73, 80, 18.5, 410, 55, 18000, 320000, "positive", "tiktok"),
        ("Prime Energy Drink Can 12pk", "PRIME-12PK-MX", "Beverages", 29.99, 8.40, 520, 600, 120.0, 2800, 44, 12000, 280000, "neutral", "tiktok"),
        ("Hydroflash Wide Mouth Bottle", "HF-WM-32-BLU", "Drinkware", 49.95, 14.20, 88, 120, 15.0, 290, 38, 8500, 150000, "positive", "instagram"),
        ("Aztec Secret Indian Clay Mask", "AZ-ICM-1LB", "Skincare", 14.95, 4.10, 245, 300, 55.0, 680, 29, 6200, 95000, "positive", "tiktok"),
        ("Crocs Classic Clog — Jibbitz Ed.", "CRC-JIB-M10", "Footwear", 59.99, 18.00, 34, 60, 8.5, 190, 21, 4100, 72000, "neutral", "tiktok"),
    ]

    for p in products:
        conn.execute("""
            INSERT INTO products (name, sku, category, current_price, cost_price, stock_units,
            reorder_point, daily_sales_velocity, predicted_demand_48h, current_spike_score,
            views_per_hour, creator_reach, sentiment_label, trending_platform)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, p)

    # Seed spike history (last 6 hours)
    product_ids = [row[0] for row in conn.execute("SELECT id FROM products").fetchall()]
    spike_scores = [87, 72, 61, 55, 44, 38, 29, 21]
    
    for pid, base_score in zip(product_ids, spike_scores):
        for h in range(12):  # 12 data points over 6 hours
            ts = (datetime.now() - timedelta(minutes=30 * (12 - h))).isoformat()
            jitter = random.randint(-8, 8)
            score = max(5, min(100, base_score + jitter + h * 2))
            conn.execute("""
                INSERT INTO spike_history (product_id, spike_score, views_per_hour, created_at)
                VALUES (?, ?, ?, ?)
            """, (pid, score, random.randint(5000, 50000), ts))

    # Seed social events
    platforms = ["tiktok", "instagram", "x"]
    handles = ["@shopwithme.daily", "@trendhunter_k", "@viralfinds2024", "@beauty.obsessed", "@tikshop.hauls"]
    
    for pid in product_ids[:4]:
        for _ in range(random.randint(3, 8)):
            ts = (datetime.now() - timedelta(hours=random.randint(0, 6))).isoformat()
            conn.execute("""
                INSERT INTO social_events (product_id, platform, event_type, creator_handle,
                creator_followers, views, engagement_rate, sentiment, created_at)
                VALUES (?, ?, 'mention', ?, ?, ?, ?, 'positive', ?)
            """, (pid, random.choice(platforms), random.choice(handles),
                  random.randint(50000, 5000000), random.randint(10000, 2000000),
                  round(random.uniform(3.5, 12.0), 2), ts))

    # Seed pending alerts
    conn.execute("""
        INSERT INTO alerts (product_id, type, message, status)
        VALUES (1, 'spike_detected', '⚡ Stanley Quencher trending — spike score 87/100. Predicted +820 units demand in 48h. Current stock: 48 units.', 'pending')
    """)
    conn.execute("""
        INSERT INTO alerts (product_id, type, message, status)
        VALUES (2, 'reorder_suggested', '📦 Glow Recipe Toner — 48h demand (1,240 units) exceeds stock (156). Suggested reorder: 1,084 units.', 'pending')
    """)
    conn.execute("""
        INSERT INTO alerts (product_id, type, message, status)
        VALUES (3, 'price_opportunity', '💰 Niacinamide Serum — Demand spike detected. Recommended price uplift: +15% ($12.99 → $14.94). Est. additional revenue: $3,402', 'pending')
    """)

    # Seed brand kit
    conn.execute("""
        INSERT INTO brand_kit (brand_name, primary_color, secondary_color, tone_keywords,
        banned_words, tagline, target_audience)
        VALUES ('MyBrand Store', '#FF6B35', '#1A1A2E', 'energetic, authentic, trendy, bold',
        'cheap, inferior, knockoff, fake', 'Trending products, curated for you.',
        'Social media savvy shoppers aged 18-35 who discover products on TikTok and Instagram')
    """)

    # Seed a pending reorder
    conn.execute("""
        INSERT INTO reorders (product_id, quantity, total_value, status, notes)
        VALUES (1, 500, 6250.00, 'pending', 'Auto-generated based on spike score 87/100')
    """)
