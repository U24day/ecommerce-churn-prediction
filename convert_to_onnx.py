import joblib
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType


# Load trained objects
preprocessor = joblib.load("models/preprocessor.pkl")
model = joblib.load("models/random_forest_churn_model.pkl")


# Original 13 input columns
initial_types = [
    ("age", FloatTensorType([None, 1])),
    ("gender", StringTensorType([None, 1])),
    ("city", StringTensorType([None, 1])),
    ("tenure_months", FloatTensorType([None, 1])),
    ("avg_order_value", FloatTensorType([None, 1])),
    ("total_orders", FloatTensorType([None, 1])),
    ("last_purchase_days_ago", FloatTensorType([None, 1])),
    ("support_tickets", FloatTensorType([None, 1])),
    ("subscription_type", StringTensorType([None, 1])),
    ("total_spend", FloatTensorType([None, 1])),
    ("orders_per_month", FloatTensorType([None, 1])),
    ("support_tickets_per_order", FloatTensorType([None, 1])),
    ("purchase_recency_ratio", FloatTensorType([None, 1])),
]


print("Converting preprocessor...")

preprocessor_onnx = convert_sklearn(
    preprocessor,
    initial_types=initial_types,
    target_opset=18
)

with open("models/preprocessor.onnx", "wb") as f:
    f.write(preprocessor_onnx.SerializeToString())

print("Preprocessor converted successfully.")


print("Converting Random Forest...")

model_onnx = convert_sklearn(
    model,
    initial_types=[
        ("input", FloatTensorType([None, 23]))
    ],
    options={id(model): {"zipmap": False}},
    target_opset=18
)

with open("models/churn_model.onnx", "wb") as f:
    f.write(model_onnx.SerializeToString())

print("Random Forest converted successfully.")
print("ONNX conversion completed!")
