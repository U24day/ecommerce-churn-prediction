import pandas as pd
import joblib
import os


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "models",
    "random_forest_churn_model.pkl"
)

PREPROCESSOR_PATH = os.path.join(
    BASE_DIR,
    "models",
    "preprocessor.pkl"
)


model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)


def predict_churn(customer_data, threshold=0.30):

    input_df = pd.DataFrame([customer_data])

    # Safe division helpers to prevent ZeroDivisionError
    safe_tenure = input_df["tenure_months"].clip(lower=1.0)
    safe_orders = input_df["total_orders"].clip(lower=1.0)

    # Feature engineering
    input_df["total_spend"] = (
        input_df["avg_order_value"] *
        input_df["total_orders"]
    )

    input_df["orders_per_month"] = (
        input_df["total_orders"] /
        safe_tenure
    )

    input_df["support_tickets_per_order"] = (
        input_df["support_tickets"] /
        safe_orders
    )

    input_df["purchase_recency_ratio"] = (
        input_df["last_purchase_days_ago"] /
        (safe_tenure * 30.0)
    )

    # customer_id was not used during training
    input_df = input_df.drop(
        columns=["customer_id"],
        errors="ignore"
    )

    # Preprocessing
    processed_data = preprocessor.transform(input_df)

    # Probability
    churn_probability = model.predict_proba(
        processed_data
    )[0][1]

    # Classification
    churn_prediction = int(
        churn_probability >= threshold
    )

    if churn_probability >= 0.60:
        risk_level = "High"
    elif churn_probability >= threshold:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    # Business impact & ROI metrics
    aov = float(customer_data.get("avg_order_value", 0))
    total_orders = float(customer_data.get("total_orders", 0))
    tenure = max(float(customer_data.get("tenure_months", 1)), 1.0)

    orders_per_year = (total_orders / tenure) * 12.0
    annual_ltv = round(orders_per_year * aov, 2)
    loss_at_risk = round(annual_ltv * churn_probability, 2)

    if churn_probability >= 0.60:
        intervention_cost = round(0.12 * aov + 250.0, 2)
        success_rate = 0.45
    elif churn_probability >= threshold:
        intervention_cost = round(0.08 * aov + 100.0, 2)
        success_rate = 0.55
    else:
        intervention_cost = 80.0
        success_rate = 0.70

    expected_net_savings = round(max((loss_at_risk * success_rate) - intervention_cost, 0.0), 2)
    intervention_roi = (
        round((expected_net_savings / max(intervention_cost, 1.0)) * 100.0, 1)
        if intervention_cost > 0
        else 0.0
    )

    business_impact = {
        "annual_ltv": annual_ltv,
        "loss_at_risk": loss_at_risk,
        "intervention_cost": intervention_cost,
        "expected_net_savings": expected_net_savings,
        "intervention_roi": intervention_roi,
    }

    return {
        "customer_id": customer_data.get("customer_id"),
        "churn_probability": round(
            float(churn_probability), 4
        ),
        "churn_prediction": churn_prediction,
        "risk_level": risk_level,
        "business_impact": business_impact
    }

if __name__ == "__main__":

    sample_customer = {
        "customer_id": 100001,
        "age": 35,
        "gender": "Male",
        "city": "Delhi",
        "tenure_months": 24,
        "avg_order_value": 4500,
        "total_orders": 120,
        "last_purchase_days_ago": 180,
        "support_tickets": 10,
        "subscription_type": "Gold"
    }

    result = predict_churn(sample_customer)

    print("Customer Churn Prediction")
    print("-------------------------")
    print(result)