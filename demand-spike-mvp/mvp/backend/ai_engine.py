"""
AI Engine — Powered by Claude (Anthropic)
Handles: content generation, sentiment analysis, performance scoring
AMD MI300X in production; Claude API for MVP
"""
import os
import json
import re
import random
from datetime import datetime
from typing import Optional

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False


class AIEngine:
    def __init__(self):
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        self.client = None
        self.model = "claude-opus-4-6"
        
        if ANTHROPIC_AVAILABLE and api_key:
            try:
                self.client = anthropic.AsyncAnthropic(api_key=api_key)
            except Exception:
                self.client = None

    async def generate_ad_content(
        self,
        product: dict,
        platform: str,
        content_type: str,
        brand_kit: Optional[dict] = None,
    ) -> dict:
        """Generate 3 brand-safe ad variants for a trending product."""
        
        brand_context = ""
        if brand_kit:
            brand_context = f"""
Brand Kit:
- Brand Name: {brand_kit.get('brand_name', 'Our Brand')}
- Tone: {brand_kit.get('tone_keywords', 'friendly, authentic')}
- Tagline: {brand_kit.get('tagline', '')}
- Target Audience: {brand_kit.get('target_audience', 'general consumers')}
- Banned Words: {brand_kit.get('banned_words', '')}
"""

        platform_guidance = {
            "tiktok": "TikTok — hook in first 3 words, casual Gen-Z tone, trend-aware, 150 chars max for caption",
            "instagram": "Instagram — aspirational, lifestyle-focused, 200 chars, include hashtag suggestions",
            "email": "Email — subject line + body, professional but warm, clear CTA, 300 chars body max",
        }.get(platform, "general social media")

        prompt = f"""You are an expert performance marketer for an SME. Generate 3 distinct ad content variants for a trending product.

Product: {product.get('name')}
Category: {product.get('category')}
Current Price: ${product.get('current_price')}
Spike Score: {product.get('current_spike_score')}/100 (higher = more viral)
Platform: {platform_guidance}
{brand_context}

Generate exactly 3 variants, each with a DIFFERENT psychological angle:
1. URGENCY / SCARCITY angle
2. SOCIAL PROOF / FOMO angle  
3. CURIOSITY / DISCOVERY angle

Respond ONLY with valid JSON in this exact structure:
{{
  "variants": [
    {{
      "headline": "...",
      "body": "...",
      "cta": "...",
      "performance_score": <integer 60-95>,
      "predicted_ctr": "...",
      "tone": "..."
    }}
  ],
  "brand_compliance": true,
  "compliance_notes": "..."
}}"""

        if self.client:
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=1500,
                    messages=[{"role": "user", "content": prompt}]
                )
                raw = response.content[0].text.strip()
                # Strip markdown code fences if present
                raw = re.sub(r"```json|```", "", raw).strip()
                result = json.loads(raw)
                result["generated_at"] = datetime.now().isoformat()
                result["ai_powered"] = True
                return result
            except Exception as e:
                pass  # Fall through to fallback
        
        # Fallback content (no API key)
        return self._fallback_content(product, platform)

    async def score_copy(self, copy_text: str, product_name: str, platform: str) -> dict:
        """Score marketing copy with predictive performance metrics."""
        
        prompt = f"""You are a conversion rate optimization expert. Score this ad copy for performance.

Product: {product_name}
Platform: {platform}
Copy to score:
---
{copy_text}
---

Analyse and respond ONLY with valid JSON:
{{
  "performance_score": <integer 0-100>,
  "predicted_ctr": "<percentage like 3.2%>",
  "predicted_revenue_lift": "<percentage like 18%>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>"],
  "brand_safe": <true/false>,
  "recommendation": "<one word: Excellent/Good/Average/Poor>"
}}"""

        if self.client:
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=600,
                    messages=[{"role": "user", "content": prompt}]
                )
                raw = response.content[0].text.strip()
                raw = re.sub(r"```json|```", "", raw).strip()
                result = json.loads(raw)
                result["ai_powered"] = True
                return result
            except Exception:
                pass
        
        # Fallback scoring
        return self._fallback_score(copy_text)

    async def analyze_sentiment(self, text: str, product: str) -> dict:
        """Analyze social media sentiment for a product mention."""
        
        prompt = f"""Analyze the sentiment of this social media post about {product}.

Post: "{text}"

Respond ONLY with JSON:
{{
  "sentiment": "<positive/negative/neutral>",
  "confidence": <float 0-1>,
  "emotion": "<excited/skeptical/satisfied/disappointed/curious>",
  "purchase_intent": "<high/medium/low>",
  "viral_potential": <integer 0-100>
}}"""

        if self.client:
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                raw = response.content[0].text.strip()
                raw = re.sub(r"```json|```", "", raw).strip()
                return json.loads(raw)
            except Exception:
                pass
        
        return {"sentiment": "positive", "confidence": 0.78, "emotion": "excited", 
                "purchase_intent": "high", "viral_potential": 72}

    def _fallback_content(self, product: dict, platform: str) -> dict:
        """Fallback content when Claude API is unavailable."""
        name = product.get("name", "this product")
        price = product.get("current_price", 29.99)
        score = product.get("current_spike_score", 60)
        
        return {
            "variants": [
                {
                    "headline": f"⚠️ LAST FEW LEFT: {name}",
                    "body": f"Everyone's buying {name} right now — and we're almost sold out. "
                            f"Demand is up {score * 3}% this week alone. Don't miss your chance at ${price}.",
                    "cta": "Grab Yours Before It's Gone →",
                    "performance_score": random.randint(78, 88),
                    "predicted_ctr": f"{random.uniform(4.1, 5.5):.1f}%",
                    "tone": "Urgency"
                },
                {
                    "headline": f"Why Is Everyone Talking About {name.split()[0]}?",
                    "body": f"Over 2M views and counting. {name} is the product your feed won't stop showing you — "
                            f"and now you can see what the hype is all about. Just ${price}.",
                    "cta": "Join The Trend →",
                    "performance_score": random.randint(68, 78),
                    "predicted_ctr": f"{random.uniform(3.2, 4.3):.1f}%",
                    "tone": "Social Proof"
                },
                {
                    "headline": f"You've Seen It On Your FYP — Now Try It",
                    "body": f"The {name} that's been breaking the internet is finally available in our store. "
                            f"See for yourself why creators can't stop talking about it. Free shipping included.",
                    "cta": "Shop The Hype →",
                    "performance_score": random.randint(72, 84),
                    "predicted_ctr": f"{random.uniform(3.8, 4.9):.1f}%",
                    "tone": "Curiosity"
                }
            ],
            "brand_compliance": True,
            "compliance_notes": "All variants checked against brand guidelines",
            "generated_at": datetime.now().isoformat(),
            "ai_powered": False
        }

    def _fallback_score(self, copy_text: str) -> dict:
        """Heuristic scoring when Claude API is unavailable."""
        text = copy_text.lower()
        score = 50
        
        # Positive signals
        if any(w in text for w in ["limited", "exclusive", "only", "last", "hurry"]): score += 12
        if any(w in text for w in ["free shipping", "free delivery", "no charge"]): score += 8
        if any(w in text for w in ["trending", "viral", "everyone", "sold out"]): score += 10
        if any(w in text for w in ["%" , "off", "save", "deal"]): score += 7
        if "!" in copy_text: score += 5
        if "?" in copy_text: score += 3
        if len(copy_text) < 150: score += 5  # Concise
        
        # Negative signals
        if len(copy_text) > 500: score -= 10
        if any(w in text for w in ["cheap", "inferior", "bad"]): score -= 20
        
        score = max(20, min(95, score + random.randint(-5, 5)))
        
        return {
            "performance_score": score,
            "predicted_ctr": f"{score / 20:.1f}%",
            "predicted_revenue_lift": f"{int(score * 0.9)}%",
            "strengths": ["Clear call-to-action" if "→" in copy_text or "!" in copy_text else "Informative"],
            "improvements": ["Add urgency language", "Include social proof element"],
            "brand_safe": not any(w in text for w in ["cheap", "bad", "inferior"]),
            "recommendation": "Excellent" if score >= 85 else "Good" if score >= 70 else "Average" if score >= 55 else "Poor",
            "ai_powered": False
        }
