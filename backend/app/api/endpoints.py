import numpy as np
from fastapi import APIRouter, HTTPException, Depends
from app.api.schemas import LivePredictionInput, LivePredictionOutput
from app.services import market_data, analysis
from app.model.manager import ai_manager

router = APIRouter()

@router.post("/predict/live", response_model=LivePredictionOutput)
async def predict_live(input_data: LivePredictionInput):
    ticker = input_data.ticker.upper()
    
    # Validate Ticker Support
    supported_tickers = ai_manager.metadata.get("tickers", [])
    if ticker not in supported_tickers:
        raise HTTPException(status_code=400, detail=f"Ticker not supported. Available: {supported_tickers}")

    # 1. Fetch Data
    df_prices = market_data.fetch_live_prices(ticker)
    news_texts = market_data.fetch_live_news(ticker)
    
    # 2. Analyze
    sentiment = analysis.get_sentiment_score(news_texts)
    features = analysis.compute_features(df_prices, sentiment)
    
    # 3. Prepare for Model
    try:
        feature_names = ai_manager.metadata["features"]
        X_live = np.array([features[f] for f in feature_names]).reshape(1, -1)
    except KeyError as e:
        raise HTTPException(status_code=500, detail=f"Feature mismatch: {e}")
        
    # 4. Predict
    X_scaled = ai_manager.scaler.transform(X_live)
    proba = ai_manager.xgb_model.predict_proba(X_scaled)[:, 1][0]
    threshold = ai_manager.metadata["threshold"]
    signal = 1 if proba >= threshold else 0
    
    return LivePredictionOutput(
        ticker=ticker,
        proba=float(proba),
        signal=signal,
        calculated_features=features,
        model_timestamp=str(ai_manager.metadata["last_train_date"])
    )