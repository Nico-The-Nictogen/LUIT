#!/usr/bin/env python3
"""
Keep-alive service to prevent Railway free-tier sleep.
Usage: Add as a cron job or background task.
Example Railway cron: python keep_alive.py
"""

import requests
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def ping_backend():
    """Ping backend health endpoint to keep it awake"""
    try:
        # Replace with your actual Railway app URL once deployed
        backend_url = "http://localhost:5000/health"
        response = requests.get(backend_url, timeout=10)
        if response.status_code == 200:
            logger.info(f"✅ Keep-alive ping successful at {datetime.now()}")
            return True
        else:
            logger.warning(f"⚠️ Ping returned {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Keep-alive ping failed: {str(e)}")
        return False

if __name__ == "__main__":
    ping_backend()
