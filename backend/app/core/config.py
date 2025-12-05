import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NewsSentiment Pro Live"
    API_VERSION: str = "v3"
    
    # Polygon API Key
    POLYGON_API_KEY: str = os.getenv("POLYGON_API_KEY", "jMUHWgepbg_Q7fmBonlcncGQv8RwKkyx")
    
    # Paths
    BASE_DIR: str = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    MODEL_PATH: str = os.path.join(BASE_DIR, "model", "NewsSentiment_Live_Model_2025.pkl")
    
    # Rate Limiting
    MAX_REQUESTS_PER_MINUTE: int = 5
    RATE_LIMIT_WINDOW_SECONDS: int = 60

    class Config:
        env_file = ".env"
        extra = 'ignore' 

settings = Settings()