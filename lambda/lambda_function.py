import json
import os
import boto3
import onnxruntime as ort
import numpy as np


BUCKET_NAME = os.environ.get(
    "MODEL_BUCKET_NAME",
    "ecommerce-churn-ml-2026-u24day-210842713565-ap-south-1-an"
)

MODEL_DIR = "/tmp/churn_models"
PREPROCESSOR_PATH = os.path.join(MODEL_DIR, "preprocessor.onnx")
MODEL_PATH = os.path.join(MODEL_DIR, "churn_model.onnx")

s3 = boto3.client("s3")


def load_models():
    os.makedirs(MODEL_DIR, exist_ok=True)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    parent_models_dir = os.path.join(os.path.dirname(current_dir), "models")

    for filename, target_path in [
        ("preprocessor.onnx", PREPROCESSOR_PATH),
        ("churn_model.onnx", MODEL_PATH)
    ]:
        if not os.path.exists(target_path):
            local_same_dir = os.path.join(current_dir, filename)
            local_models_dir = os.path.join(parent_models_dir, filename)

            if os.path.exists(local_same_dir):
                import shutil
                shutil.copyfile(local_same_dir, target_path)
            elif os.path.exists(local_models_dir):
                import shutil
                shutil.copyfile(local_models_dir, target_path)
            else:
                s3.download_file(
                    BUCKET_NAME,
                    f"models/{filename}",
                    target_path
                )

    preprocessor = ort.InferenceSession(PREPROCESSOR_PATH)
    model = ort.InferenceSession(MODEL_PATH)

    return preprocessor, model


preprocessor, model = load_models()


def predict_churn(customer, threshold=0.30):

    # Safe division guards against ZeroDivisionError
    safe_tenure = max(float(customer.get("tenure_months", 1.0)), 1.0)
    safe_orders = max(float(customer.get("total_orders", 1.0)), 1.0)

    total_spend = (
        float(customer["avg_order_value"]) *
        float(customer["total_orders"])
    )

    orders_per_month = (
        float(customer["total_orders"]) /
        safe_tenure
    )

    support_tickets_per_order = (
        float(customer["support_tickets"]) /
        safe_orders
    )

    purchase_recency_ratio = (
        float(customer["last_purchase_days_ago"]) /
        (safe_tenure * 30.0)
    )

    inputs = {
        "age": np.array(
            [[customer["age"]]],
            dtype=np.float32
        ),

        "gender": np.array(
            [[customer["gender"]]]
        ),

        "city": np.array(
            [[customer["city"]]]
        ),

        "tenure_months": np.array(
            [[customer["tenure_months"]]],
            dtype=np.float32
        ),

        "avg_order_value": np.array(
            [[customer["avg_order_value"]]],
            dtype=np.float32
        ),

        "total_orders": np.array(
            [[customer["total_orders"]]],
            dtype=np.float32
        ),

        "last_purchase_days_ago": np.array(
            [[customer["last_purchase_days_ago"]]],
            dtype=np.float32
        ),

        "support_tickets": np.array(
            [[customer["support_tickets"]]],
            dtype=np.float32
        ),

        "subscription_type": np.array(
            [[customer["subscription_type"]]]
        ),

        "total_spend": np.array(
            [[total_spend]],
            dtype=np.float32
        ),

        "orders_per_month": np.array(
            [[orders_per_month]],
            dtype=np.float32
        ),

        "support_tickets_per_order": np.array(
            [[support_tickets_per_order]],
            dtype=np.float32
        ),

        "purchase_recency_ratio": np.array(
            [[purchase_recency_ratio]],
            dtype=np.float32
        )
    }

    processed = preprocessor.run(
        ["transformed_column"],
        inputs
    )[0]

    label, probabilities = model.run(
        ["label", "probabilities"],
        {
            "input": processed.astype(np.float32)
        }
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


RESPONSE_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
}


def lambda_handler(event, context):

    try:

        # Detect HTTP method from Lambda Function URL
        request_context = event.get("requestContext", {})
        http_info = request_context.get("http", {})
        method = http_info.get("method", "")

        # Handle CORS preflight request
        if method == "OPTIONS":
            return {
                "statusCode": 204,
                "headers": RESPONSE_HEADERS,
                "body": ""
            }

        # Browser GET request
        if method == "GET":

            return {
                "statusCode": 200,
                "headers": RESPONSE_HEADERS,
                "body": json.dumps({
                    "message": "E-Commerce Customer Churn Prediction API is running",
                    "method": "POST",
                    "endpoint": "/",
                    "description": "Send customer data using POST request to get churn prediction"
                })
            }

        # Handle POST request
        if method == "POST":

            body = event.get("body")

            if not body:
                return {
                    "statusCode": 400,
                    "headers": RESPONSE_HEADERS,
                    "body": json.dumps({
                        "error": "Request body is required"
                    })
                }

            customer = json.loads(body)

            result = predict_churn(customer)

            return {
                "statusCode": 200,
                "headers": RESPONSE_HEADERS,
                "body": json.dumps(result)
            }

        # Support direct Lambda test event
        if "body" in event:

            customer = json.loads(event["body"])

        else:

            customer = event

        result = predict_churn(customer)

        return {
            "statusCode": 200,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps(result)
        }

    except Exception as e:

        return {
            "statusCode": 500,
            "headers": RESPONSE_HEADERS,
            "body": json.dumps({
                "error": str(e)
            })
        }