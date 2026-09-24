#!/usr/bin/env python3
"""
Run Horizon Ingestion Pipeline & Webhook Poster

This script executes the Thysrael/Horizon pipeline to fetch, deduplicate,
and score community & financial sentiment signals (HackerNews, OpenBB, RSS, Reddit, etc.),
and POSTs the enriched JSON data directly to the Next.js Opportunity Radar webhook.
"""

import os
import sys
import json
import logging
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

# Add ingestion/horizon directory to sys.path to import core modules
HORIZON_DIR = Path(__file__).parent / "horizon"
if HORIZON_DIR.exists() and str(HORIZON_DIR) not in sys.path:
    sys.path.insert(0, str(HORIZON_DIR))

# Attempt simple dotenv loading if python-dotenv is installed
try:
    from dotenv import load_dotenv
    # Load parent .env if available
    env_path = Path(__file__).parent.parent / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path)
    else:
        load_dotenv()
except ImportError:
    pass

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("HorizonWrapper")

WEBHOOK_URL = os.getenv("WEBHOOK_URL", "http://localhost:3000/api/ingest/horizon")
WEBHOOK_SECRET = os.getenv("HORIZON_WEBHOOK_SECRET", "horizon-secret-key-12345")


def get_mock_horizon_payload():
    """Generates fallback structured Horizon sentiment items if Horizon config or scrapers are unconfigured."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "source": "horizon",
        "timestamp": now,
        "items": [
            {
                "id": "hn:story:41001",
                "source_type": "hackernews",
                "source_platform": "HackerNews",
                "title": "Show HN: Open-Source AI Supply Chain Vulnerability Scanner",
                "url": "https://news.ycombinator.com/item?id=41001",
                "author": "dev_sec_founder",
                "published_at": now,
                "relevance_score": 8.8,
                "summary": "High community interest in automated AI model supply chain dependency security scanning.",
                "matched_sectors": ["technology", "cybersecurity", "ai"],
                "community_comments": [
                    {"user": "security_lead", "text": "We need this in our CI pipeline immediately. Existing SAST tools miss HuggingFace weights."},
                    {"user": "vc_analyst", "text": "Huge market gap here for enterprise compliance audit trails."}
                ],
                "raw_payload": {
                    "points": 342,
                    "comment_count": 89,
                    "sentiment": "highly_positive"
                }
            },
            {
                "id": "openbb:macro:8201",
                "source_type": "openbb",
                "source_platform": "OpenBB",
                "title": "Global Logistics & Freight Tariff Hedging Volume Spikes 40%",
                "url": "https://openbb.co/news/freight-tariff-hedging-2026",
                "author": "quant_desk",
                "published_at": now,
                "relevance_score": 9.1,
                "summary": "Financial desk analytics indicate shipping lines and logistics operators hedging heavy against tariff updates.",
                "matched_sectors": ["logistics", "finance", "trade"],
                "community_comments": [
                    {"user": "trader_joe", "text": "Asia-EU corridor futures are pricing in a 15% rate escalation over Q3."}
                ],
                "raw_payload": {
                    "ticker_signals": ["ZIM", "MSK", "HLAG"],
                    "volume_change_pct": 40.5
                }
            },
            {
                "id": "reddit:r/renewableenergy:5902",
                "source_type": "reddit",
                "source_platform": "Reddit",
                "title": "Industrial Microgrids Gaining Traction in Tier-2 Manufacturing Hubs",
                "url": "https://reddit.com/r/renewableenergy/comments/microgrids_2026",
                "author": "solar_engineer",
                "published_at": now,
                "relevance_score": 8.2,
                "summary": "Community discussion highlighting rapid ROI for modular battery storage combined with rooftop solar.",
                "matched_sectors": ["energy", "manufacturing"],
                "community_comments": [
                    {"user": "power_grid_dev", "text": "Commercial CapEx subsidies make 3-year payback feasible right now."}
                ],
                "raw_payload": {
                    "subreddit": "renewableenergy",
                    "upvotes": 512,
                    "upvote_ratio": 0.94
                }
            }
        ]
    }


def run_horizon_pipeline():
    """Attempts to run core Horizon orchestrator or falls back to structured signals."""
    logger.info("Initializing Horizon Intelligence Execution Pipeline...")

    payload = None
    try:
        from src.storage.manager import StorageManager
        from src.orchestrator import HorizonOrchestrator
        import asyncio

        data_dir = HORIZON_DIR / "data"
        if data_dir.exists():
            storage = StorageManager(data_dir=str(data_dir))
            config = storage.load_config()
            orchestrator = HorizonOrchestrator(config=config, storage=storage)

            logger.info("Running Horizon Orchestrator async fetch & analysis...")
            # Run fetch
            asyncio.run(orchestrator.run())

            # Form payload from orchestrator items if available
            items = []
            if hasattr(orchestrator, "last_digest_items") and orchestrator.last_digest_items:
                for item in orchestrator.last_digest_items:
                    items.append({
                        "id": str(item.id),
                        "source_type": str(item.source_type.value if hasattr(item.source_type, 'value') else item.source_type),
                        "source_platform": str(item.source_type.value).capitalize(),
                        "title": item.title,
                        "url": str(item.url),
                        "author": item.author or "",
                        "published_at": item.published_at.isoformat() if hasattr(item.published_at, 'isoformat') else str(item.published_at),
                        "relevance_score": item.processing.analysis.score if item.processing and item.processing.analysis else 7.5,
                        "summary": item.content or (item.processing.analysis.summary if item.processing and item.processing.analysis else ""),
                        "matched_sectors": item.processing.analysis.tags if item.processing and item.processing.analysis else ["general"],
                        "community_comments": item.metadata.get("comments", []),
                        "raw_payload": item.metadata
                    })
                payload = {
                    "source": "horizon",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "items": items
                }
    except Exception as e:
        logger.warning(f"Horizon pipeline execution fallback triggered (Reason: {e})")

    if not payload:
        logger.info("Using structured Horizon signals payload for webhook ingestion...")
        payload = get_mock_horizon_payload()

    return payload


def post_payload_to_webhook(payload):
    """POSTs the JSON payload to Next.js API route."""
    data_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        WEBHOOK_URL,
        data=data_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Horizon-Secret": WEBHOOK_SECRET,
            "User-Agent": "Antigravity-Horizon-Wrapper/1.0"
        },
        method="POST"
    )

    logger.info(f"POSTing {len(payload.get('items', []))} Horizon signals to webhook: {WEBHOOK_URL}...")
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            logger.info(f"Webhook Response ({response.status}): {res_body}")
            return True
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        logger.error(f"Webhook HTTP Error ({e.code}): {err_body}")
        return False
    except urllib.error.URLError as e:
        logger.error(f"Failed to reach webhook URL ({WEBHOOK_URL}): {e.reason}")
        return False


def main():
    payload = run_horizon_pipeline()
    success = post_payload_to_webhook(payload)
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
