import numpy as np
import torch
import pandas as pd
from app.model.manager import ai_manager

def get_sentiment_score(texts: list[str]) -> float:
    if not ai_manager.finbert or not texts:
        return 0.0
        
    scores = []
    with torch.no_grad():
        for i in range(0, len(texts), 32):
            batch = texts[i:i+32]
            inputs = ai_manager.tokenizer(batch, padding=True, truncation=True, max_length=512, return_tensors="pt")
            inputs = {k: v.to(ai_manager.device) for k, v in inputs.items()}
            
            logits = ai_manager.finbert(**inputs).logits
            prob = torch.softmax(logits, dim=1).cpu().numpy()
            scores.extend(prob[:, 2] - prob[:, 0]) 

    return np.mean(scores) if scores else 0.0

def compute_features(df_prices: pd.DataFrame, current_sentiment: float) -> dict:
    df = df_prices.copy()
    
    # Technical Indicators
    df["sma_10"] = df["close"].rolling(10, min_periods=10).mean()
    
    df["pct_change"] = df["close"].pct_change()
    gain = df["pct_change"].clip(lower=0)
    loss = (-df["pct_change"]).clip(lower=0)
    avg_gain = gain.rolling(14).mean()
    avg_loss = loss.rolling(14).mean()
    rs = avg_gain / avg_loss
    df["rsi"] = 100 - 100 / (1 + rs)
    
    df["vol_20"] = df["close"].pct_change().rolling(20).std()
    
    latest = df.dropna(subset=["sma_10", "rsi", "vol_20"]).iloc[-1]
    
    # Feature Logic
    sentiment_ma = (current_sentiment * 0.7 + 0.3 * latest["rsi"] / 100 * 0.5)
    sentiment_ma = np.clip(sentiment_ma, -1.0, 1.0)
    
    return {
        "sma_10": float(latest["sma_10"]),
        "rsi": float(latest["rsi"]),
        "vol_20": float(latest["vol_20"]),
        "sentiment": float(current_sentiment),
        "sentiment_ma": float(sentiment_ma)
    }