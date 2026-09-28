import pytest
from fastapi.testclient import TestClient

from src.predict import predict_churn
from api.app import app


@pytest.fixture
def sample_customer():
    return {
        "customer_id": 100001,
        "age": 35,
        "gender": "Male",
        "city": "Delhi",
        "tenure_months": 24.0,
        "avg_order_value": 4500.0,
        "total_orders": 120,
        "last_purchase_days_ago": 180,
        "support_tickets": 10,
        "subscription_type": "Gold"
    }


def test_predict_churn_output_schema(sample_customer):
    result = predict_churn(sample_customer)

    assert "customer_id" in result
    assert "churn_probability" in result
    assert "churn_prediction" in result
    assert "risk_level" in result

    assert 0.0 <= result["churn_probability"] <= 1.0
    assert result["churn_prediction"] in (0, 1)
    assert result["risk_level"] in ("Low", "Medium", "High")


def test_zero_division_guard():
    # Edge case: brand new customer with 0 tenure and 0 orders
    zero_customer = {
        "customer_id": 999999,
        "age": 25,
        "gender": "Female",
        "city": "Mumbai",
        "tenure_months": 0,
        "avg_order_value": 0,
        "total_orders": 0,
        "last_purchase_days_ago": 0,
        "support_tickets": 0,
        "subscription_type": "Basic"
    }

    result = predict_churn(zero_customer)
    assert 0.0 <= result["churn_probability"] <= 1.0
    assert result["risk_level"] in ("Low", "Medium", "High")


def test_fastapi_home_endpoint():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_fastapi_predict_endpoint(sample_customer):
    client = TestClient(app)
    response = client.post("/predict", json=sample_customer)
    assert response.status_code == 200

    data = response.json()
    assert data["customer_id"] == 100001
    assert "churn_probability" in data
    assert data["risk_level"] in ("Low", "Medium", "High")
