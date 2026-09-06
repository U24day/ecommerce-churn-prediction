from fastapi import FastAPI
from pydantic import BaseModel

from src.predict import predict_churn


app = FastAPI(
    title="E-Commerce Customer Churn Prediction API",
    version="1.0.0"
)


class CustomerData(BaseModel):
    customer_id: int
    age: int
    gender: str
    city: str
    tenure_months: float
    avg_order_value: float
    total_orders: int
    last_purchase_days_ago: int
    support_tickets: int
    subscription_type: str


@app.get("/")
def home():
    return {
        "message": "E-Commerce Churn Prediction API is running"
    }


@app.post("/predict")
def predict(customer: CustomerData):

    result = predict_churn(
        customer.model_dump(),
        threshold=0.30
    )

    return result