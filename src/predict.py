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

    # Feature engineering
    input_df["total_spend"] = (
        input_df["avg_order_value"] *
        input_df["total_orders"]
    )

    input_df["orders_per_month"] = (
        input_df["total_orders"] /
        input_df["tenure_months"]
    )

    input_df["support_tickets_per_order"] = (
        input_df["support_tickets"] /
        input_df["total_orders"]
    )

    input_df["purchase_recency_ratio"] = (
        input_df["last_purchase_days_ago"] /
        (input_df["tenure_months"] * 30)
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

    return {
        "churn_probability": round(
            float(churn_probability), 4
        ),
        "churn_prediction": churn_prediction,
        "risk_level": (
            "High"
            if churn_prediction == 1
            else "Low"
        )
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