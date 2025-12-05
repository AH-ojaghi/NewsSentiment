// api.ts

// ----------------------------------------------------------------------
// Types (Data structures for API input and output)
// ----------------------------------------------------------------------
interface AdvancedFeaturesState {
    sma_10: number;
    rsi: number;
    vol_20: number;
    sentiment: number;
    sentiment_ma: number;
}

/**
 * Interface for the final, strong prediction response from the model (Endpoint: /predict/live)
 */
export interface LiveSignalResponse {
    ticker: string;
    proba: number;
    signal: 0 | 1; // 1 for Buy/Strong, 0 for Sell/Neutral
    calculated_features: AdvancedFeaturesState;
    model_timestamp: string; // "2025-05-30 00:00:00"
}

// ----------------------------------------------------------------------
// API Fetcher
// ----------------------------------------------------------------------

// Assumption: The API is available at localhost:8000/predict/live.
// Note: In the Canvas environment, the API usually runs on the same port as the Frontend, but we keep localhost:8000 for local development setup.
const API_BASE_URL = 'http://localhost:8000/predict/live';

/**
 * Fetches the live prediction signal for a specific ticker
 * @param ticker Asset ticker (e.g., AAPL)
 * @returns Promise<LiveSignalResponse>
 */
export async function fetchLiveSignal(ticker: string): Promise<LiveSignalResponse> {
    const res = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: ticker.toUpperCase() })
    });

    if (!res.ok) {
        // Attempt to extract the error message from the response body
        const errorData = await res.json().catch(() => ({ detail: 'خطای نامشخص API' }));
        const errorMessage = errorData.detail || `فراخوانی API با خطا مواجه شد. (کد وضعیت: ${res.status})`;
        throw new Error(errorMessage);
    }

    return res.json();
}