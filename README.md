# NewsSentiment Pro 2025

An institution-grade, live trading dashboard that surfaces real-time signals from a pre-trained XGBoost model â€” deployed with FastAPI, React + TypeScript + Tailwind, and Docker Compose.

---

## Architecture

- **Backend:** FastAPI (Python), loads a pre-trained XGBoost model (ackend/model/NewsSentiment_Live_Model_2025.pkl) and exposes /api/signals?ticker=.... Demo price feed via yfinance.
- **Frontend:** React + TypeScript + Tailwind. Gradient background, glowing cards on BUY, smooth hover effects. Auto-refresh every 30 seconds.
- **Deployment:** Dockerfiles for backend and frontend, orchestrated via docker-compose.yml. Bind-mounted model directory for secure model management.

---

## Quick start

1. **Place model file**
   - Copy your file NewsSentiment_Live_Model_2025.pkl into:
     `
     backend/model/NewsSentiment_Live_Model_2025.pkl
     `

2. **Build and run**
   - Run:
     `
     docker-compose up --build
     `
   - Frontend: http://localhost:5173  
   - Backend health: http://localhost:8000/api/health  
   - Signals API: http://localhost:8000/api/signals?ticker=AAPL

3. **Usage**
   - In the UI, change the ticker (e.g., AAPL, MSFT).  
   - Signals update every 30 seconds; click Refresh to force an update.

---

## Production notes

- Replace yfinance with your institutional market data feed.
- Keep the model in a secure artifact store and mount read-only in production.
- Configure CORS, secrets, and logging for your environment.
- Add authentication and request quotas for multi-tenant deployments.

---

## Tech details

- **Model loading:** Directly from .pkl with pickle. No retraining performed.
- **Signal logic:** If predict_proba exists, the last class probability is used to map STRONG BUY (â‰¥ 0.6) vs HOLD. On failure or missing model, a conservative heuristic returns HOLD.
- **Features (demo):** Derived from intraday price series (returns, volatility, momentum, range position). Replace with your production feature pipeline.

---
