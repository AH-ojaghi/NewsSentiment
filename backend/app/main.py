from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta

from app.core.config import settings
from app.model.manager import ai_manager
from app.api.endpoints import router as api_router

# --- Lifespan Manager (Load Models on Startup) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load models
    ai_manager.load_models()
    yield
    # Shutdown: Clean up if necessary (optional)
    print("Shutting down...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.API_VERSION,
    lifespan=lifespan
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In prod, restrict this
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rate Limiting Middleware (Simplified) ---
RATE_LIMIT_STORE = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    now = datetime.now()
    
    RATE_LIMIT_STORE[client_ip] = [ts for ts in RATE_LIMIT_STORE.get(client_ip, []) 
                                   if ts > now - timedelta(seconds=settings.RATE_LIMIT_WINDOW_SECONDS)]
    
    if len(RATE_LIMIT_STORE.get(client_ip, [])) >= settings.MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Rate limit exceeded.")
        
    RATE_LIMIT_STORE.setdefault(client_ip, []).append(now)
    response = await call_next(request)
    return response

# --- Include Routes ---
app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)