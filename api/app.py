from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.predict import predict_churn


app = FastAPI(
    title="E-Commerce Customer Churn Prediction API",
    description="REST API for predicting customer churn probability and risk tier using Random Forest.",
    version="1.0.0"
)

# Enable CORS for local development and web dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CustomerData(BaseModel):
    customer_id: Optional[int] = Field(default=None, description="Unique customer identifier")
    age: int = Field(..., ge=18, le=100, description="Customer age")
    gender: str = Field(..., description="Gender (e.g., Male, Female)")
    city: str = Field(..., description="City of residence")
    tenure_months: float = Field(..., ge=0, description="Customer tenure in months")
    avg_order_value: float = Field(..., ge=0, description="Average monetary value per order")
    total_orders: int = Field(..., ge=0, description="Total completed orders")
    last_purchase_days_ago: int = Field(..., ge=0, description="Days elapsed since last purchase")
    support_tickets: int = Field(..., ge=0, description="Total support tickets raised")
    subscription_type: str = Field(..., description="Subscription plan (e.g., Basic, Silver, Gold)")


class PredictionResponse(BaseModel):
    customer_id: Optional[int] = None
    churn_probability: float
    churn_prediction: int
    risk_level: str
    business_impact: Optional[dict] = None


@app.get("/")
def home():
    return {
        "message": "E-Commerce Churn Prediction API is running",
        "docs_url": "/docs",
        "predict_url": "/predict"
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(customer: CustomerData, threshold: float = Query(0.30, ge=0.0, le=1.0)):

    result = predict_churn(
        customer.model_dump(),
        threshold=threshold
    )

    return result