## 📰 NewsSentiment (Live Financial AI Trading Signal Service)

NewsSentiment Pro is a robust, AI-powered backend service designed to perform **real-time sentiment analysis** on financial news and generate predictive trading signals for the stock market.

This system effectively integrates state-of-the-art **Deep Learning NLP** with classical **Technical Analysis** and a production-ready **FastAPI** deployment environment.

---

## ✨ Core System Capabilities

### 1. Hybrid ML and Deep Learning Engine

The prediction core utilizes a sophisticated, two-step modeling process:

* **Financial NLP:** Leverages the **ProsusAI/FinBERT** Transformer model (optimized for financial context) to process real-time news headlines and articles. It calculates a unified, daily sentiment score ($\text{Sentiment} \in [-1, +1]$). The model runs inference using PyTorch (`torch.no_grad()`) on the CPU for efficient deployment.
* **Predictive ML Model:** A custom, pre-trained **XGBoost (XGB\_MODEL)** classifier is used. This model takes a combined set of features—both sentiment-based and technical indicators—to forecast the market direction.
* **Optimal Signaling:** The model's probability output is converted into a binary trading signal (**Buy: 1 / Hold/Sell: 0**) by applying a pre-determined **Optimal Threshold** ($\text{THRESHOLD}$) saved during the training phase.

### 2. Live Data Integration

The service is engineered to pull the necessary features in real-time for immediate prediction:

* **API Integration:** Directly connects to the **Polygon.io API** to fetch daily price history (45 days needed for indicators) and relevant news articles (last 7 days) based on a user-provided ticker.
* **Feature Engineering:** On-the-fly calculation of key financial features before prediction:
    * **Technical Indicators:** 10-day Simple Moving Average (**SMA\_10**), 14-day Relative Strength Index (**RSI**), and 20-day Volatility (**VOL\_20**).
    * **Sentiment Features:** The live **Sentiment Score** and a smoothed version, **Sentiment Moving Average (Sentiment\_MA)**, are included.

### 3. Production Deployment & Reliability

The application is built for high-availability and security:

* **High-Performance API:** Built using **FastAPI** for asynchronous handling of requests, complete with automatic **Pydantic** validation of inputs and outputs.
* **Middleware Rate Limiting:** Includes a custom middleware to enforce a strict **Rate Limit** (5 requests per minute per IP address) to protect the service and manage third-party API usage (Polygon.io).
* **Robust Data Handling:** Implements extensive error handling for network issues, API rate limits (HTTP 429), missing data (HTTP 404), and model file loading errors.

---

## 🚀 Key Endpoint

The service exposes a primary endpoint for generating real-time signals:

| Endpoint | Method | Input (JSON) | Output (JSON) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **/predict/live** | `POST` | `{"ticker": "AAPL"}` | `LivePredictionOutput` | Runs the full end-to-end process: data fetching, FinBERT analysis, feature calculation, and prediction, returning the probability and final trading signal. |

API documentation, including data models and live testing, is available via **Swagger UI** at `/docs`.
