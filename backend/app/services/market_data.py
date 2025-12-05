import requests
import pandas as pd
from datetime import date, timedelta
from fastapi import HTTPException
from app.core.config import settings

def fetch_live_prices(ticker: str) -> pd.DataFrame:
    today = date.today().strftime("%Y-%m-%d")
    start_date = (date.today() - timedelta(days=45)).strftime("%Y-%m-%d")
    
    url = f"https://api.polygon.io/v2/aggs/ticker/{ticker}/range/1/day/{start_date}/{today}"
    params = {"adjusted": "true", "apiKey": settings.POLYGON_API_KEY}
    
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Polygon API Error: {str(e)}")

    if not data.get("results"):
        raise HTTPException(status_code=404, detail=f"No price data found for {ticker}")
        
    df = pd.DataFrame(data["results"])
    df["date"] = pd.to_datetime(df["t"], unit="ms")
    df["close"] = df["c"]
    return df.sort_values("date")

def fetch_live_news(ticker: str) -> list[str]:
    last_week = (date.today() - timedelta(days=7)).strftime("%Y-%m-%d")
    url = "https://api.polygon.io/v2/reference/news"
    params = {
        "ticker": ticker,
        "published_utc.gte": last_week,
        "limit": 100,
        "apiKey": settings.POLYGON_API_KEY
    }
    
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
    except:
        return [] # Fail gracefully for news
    
    if not data.get("results"):
        return []

    return [
        (r.get("title", "") or "") + " " + (r.get("description", "") or "")
        for r in data["results"]
    ]