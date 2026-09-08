import json
import os
import boto3
import onnxruntime as ort
import numpy as np


BUCKET_NAME = "ecommerce-churn-ml-2026-u24day-210842713565-ap-south-1-an"

MODEL_DIR = "/tmp/churn_models"
PREPROCESSOR_PATH = os.path.join(MODEL_DIR, "preprocessor.onnx")
MODEL_PATH = os.path.join(MODEL_DIR, "churn_model.onnx")

s3 = boto3.client("s3")


def load_models():

    os.makedirs(MODEL_DIR, exist_ok=True)

    if not os.path.exists(PREPROCESSOR_PATH):
        s3.download_file(
            BUCKET_NAME,
            "models/preprocessor.onnx",
            PREPROCESSOR_PATH
        )

    if not os.path.exists(MODEL_PATH):
        s3.download_file(
            BUCKET_NAME,
            "models/churn_model.onnx",
            MODEL_PATH
        )

    preprocessor = ort.InferenceSession(PREPROCESSOR_PATH)
    model = ort.InferenceSession(MODEL_PATH)

    return preprocessor, model


preprocessor, model = load_models()


def predict_churn(customer, threshold=0.30):

    total_spend = (
        customer["avg_order_value"] *
        customer["total_orders"]
    )

    orders_per_month = (
        customer["total_orders"] /
        customer["tenure_months"]
    )

    support_tickets_per_order = (
        customer["support_tickets"] /
        customer["total_orders"]
    )

    purchase_recency_ratio = (
        customer["last_purchase_days_ago"] /
        (customer["tenure_months"] * 30)
    )

    inputs = {
        "age": np.array([[customer["age"]]], dtype=np.float32),
        "gender": np.array([[customer["gender"]]]),
        "city": np.array([[customer["city"]]]),
        "tenure_months": np.array(
            [[customer["tenure_months"]]], dtype=np.float32
        ),
        "avg_order_value": np.array(
            [[customer["avg_order_value"]]], dtype=np.float32
        ),
        "total_orders": np.array(
            [[customer["total_orders"]]], dtype=np.float32
        ),
        "last_purchase_days_ago": np.array(
            [[customer["last_purchase_days_ago"]]], dtype=np.float32
        ),
        "support_tickets": np.array(
            [[customer["support_tickets"]]], dtype=np.float32
        ),
        "subscription_type": np.array(
            [[customer["subscription_type"]]]
        ),
        "total_spend": np.array(
            [[total_spend]], dtype=np.float32
        ),
        "orders_per_month": np.array(
            [[orders_per_month]], dtype=np.float32
        ),
        "support_tickets_per_order": np.array(
            [[support_tickets_per_order]], dtype=np.float32
        ),
        "purchase_recency_ratio": np.array(
            [[purchase_recency_ratio]], dtype=np.float32
        ),
    }

    processed = preprocessor.run(
        ["transformed_column"],
        inputs
    )[0]

    label, probabilities = model.run(
        ["label", "probabilities"],
        {"input": processed.astype(np.float32)}
    )

    churn_probability = float(probabilities[0][1])

    churn_prediction = int(
        churn_probability >= threshold
    )

    if churn_probability >= 0.60:
        risk_level = "High"
    elif churn_probability >= 0.30:
        risk_level = "Medium"
    else:
        risk_level = "Low"

    return {
        "customer_id": customer["customer_id"],
        "churn_probability": round(churn_probability, 4),
        "churn_prediction": churn_prediction,
        "risk_level": risk_level
    }


def lambda_handler(event, context):

    try:

        if "body" in event:
            customer = json.loads(event["body"])
        else:
            customer = event

        result = predict_churn(customer)

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps(result)
        }

    except Exception as e:

        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "error": str(e)
            })
        }
