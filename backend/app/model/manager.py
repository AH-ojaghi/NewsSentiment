import joblib
import torch
import warnings
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from app.core.config import settings

warnings.filterwarnings("ignore")

class ModelManager:
    def __init__(self):
        self.xgb_model = None
        self.scaler = None
        self.finbert = None
        self.tokenizer = None
        self.metadata = {}
        self.device = "cpu"

    def load_models(self):
        print("--- Loading AI Models ---")
        self._load_xgboost()
        self._load_finbert()
        print("--- Models Loaded Successfully ---")

    def _load_xgboost(self):
        try:
            print(f"Loading XGBoost from {settings.MODEL_PATH}...")
            loaded_assets = joblib.load(settings.MODEL_PATH)
            self.xgb_model = loaded_assets["model"]
            self.scaler = loaded_assets["scaler"]
            self.metadata = {
                "features": loaded_assets["features"],
                "threshold": loaded_assets["threshold"],
                "last_train_date": loaded_assets["last_train_date"],
                "tickers": loaded_assets["tickers"]
            }
        except Exception as e:
            raise RuntimeError(f"FATAL: Failed to load XGBoost model: {e}")

    def _load_finbert(self):
        try:
            print("Loading FinBERT...")
            self.tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert")
            self.finbert = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert")
            self.finbert.to(self.device).eval()
        except Exception as e:
            print(f"WARNING: FinBERT loading failed: {e}")
            self.finbert = None

# Global instance to be used across app
ai_manager = ModelManager()