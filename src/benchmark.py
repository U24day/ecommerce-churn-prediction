import os
import time
import tempfile
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from lightgbm import LGBMClassifier
from xgboost import XGBClassifier


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "raw", "ecommerce_customer_churn_large.csv")


def load_and_preprocess_data():
    print(f"Loading dataset from: {DATA_PATH} ...")
    df = pd.read_csv(DATA_PATH)

    # Safe feature engineering
    safe_tenure = df["tenure_months"].clip(lower=1.0)
    safe_orders = df["total_orders"].clip(lower=1.0)

    df["total_spend"] = df["avg_order_value"] * df["total_orders"]
    df["orders_per_month"] = df["total_orders"] / safe_tenure
    df["support_tickets_per_order"] = df["support_tickets"] / safe_orders
    df["purchase_recency_ratio"] = df["last_purchase_days_ago"] / (safe_tenure * 30.0)

    X = df.drop(columns=["customer_id", "churn"])
    y = df["churn"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    categorical_features = ["gender", "city", "subscription_type"]
    numerical_features = [
        "age",
        "tenure_months",
        "avg_order_value",
        "total_orders",
        "last_purchase_days_ago",
        "support_tickets",
        "total_spend",
        "orders_per_month",
        "support_tickets_per_order",
        "purchase_recency_ratio",
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", "passthrough", numerical_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )

    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    return X_train_proc, X_test_proc, y_train, y_test, preprocessor


def get_model_size_mb(model):
    with tempfile.NamedTemporaryFile(suffix=".pkl", delete=True) as tmp:
        joblib.dump(model, tmp.name)
        return round(os.path.getsize(tmp.name) / (1024 * 1024), 2)


def evaluate_model(name, model, X_train, y_train, X_test, y_test, threshold=0.30):
    print(f"\n[Training] {name} ...")
    t0 = time.time()
    model.fit(X_train, y_train)
    train_time = round(time.time() - t0, 2)

    # Benchmark inference speed (ms for 1,000 samples)
    sample_size = min(1000, X_test.shape[0])
    X_sample = X_test[:sample_size]
    t0 = time.time()
    for _ in range(5):
        _ = model.predict_proba(X_sample)
    latency_ms = round(((time.time() - t0) / 5) * 1000, 2)

    pred_proba = model.predict_proba(X_test)[:, 1]
    pred_default = model.predict(X_test)
    pred_opt = (pred_proba >= threshold).astype(int)

    size_mb = get_model_size_mb(model)

    metrics = {
        "Model": name,
        "Train Time (s)": train_time,
        "Size (MB)": size_mb,
        "Latency 1k (ms)": latency_ms,
        "ROC-AUC": round(roc_auc_score(y_test, pred_proba), 4),
        "Accuracy (0.50)": round(accuracy_score(y_test, pred_default), 4),
        "Recall (0.50)": round(recall_score(y_test, pred_default), 4),
        "Precision (0.50)": round(precision_score(y_test, pred_default), 4),
        "F1 (0.50)": round(f1_score(y_test, pred_default), 4),
        "Recall (0.30)": round(recall_score(y_test, pred_opt), 4),
        "Precision (0.30)": round(precision_score(y_test, pred_opt), 4),
        "F1 (0.30)": round(f1_score(y_test, pred_opt), 4),
    }

    return metrics, model


def run_benchmarks():
    X_train, X_test, y_train, y_test, preprocessor = load_and_preprocess_data()

    # Calculate class imbalance ratio for pos_weight
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos = round(neg_count / pos_count, 2)

    models = [
        (
            "Logistic Regression",
            LogisticRegression(max_iter=1000, random_state=42),
        ),
        (
            "Random Forest (Current)",
            RandomForestClassifier(
                n_estimators=200,
                max_depth=12,
                min_samples_split=10,
                min_samples_leaf=5,
                random_state=42,
                n_jobs=-1,
            ),
        ),
        (
            "Random Forest (Pruned)",
            RandomForestClassifier(
                n_estimators=80,
                max_depth=8,
                min_samples_leaf=20,
                class_weight="balanced",
                random_state=42,
                n_jobs=-1,
            ),
        ),
        (
            "LightGBM",
            LGBMClassifier(
                n_estimators=150,
                max_depth=6,
                learning_rate=0.08,
                num_leaves=31,
                class_weight="balanced",
                random_state=42,
                verbose=-1,
                n_jobs=-1,
            ),
        ),
        (
            "XGBoost",
            XGBClassifier(
                n_estimators=150,
                max_depth=5,
                learning_rate=0.08,
                scale_pos_weight=scale_pos,
                random_state=42,
                eval_metric="logloss",
                n_jobs=-1,
            ),
        ),
        (
            "HistGradientBoosting",
            HistGradientBoostingClassifier(
                max_iter=150,
                max_depth=6,
                learning_rate=0.08,
                class_weight="balanced",
                random_state=42,
            ),
        ),
    ]

    results = []
    trained_models = {}

    for name, model in models:
        metrics, trained_model = evaluate_model(
            name, model, X_train, y_train, X_test, y_test
        )
        results.append(metrics)
        trained_models[name] = trained_model

    df_results = pd.DataFrame(results)

    print("\n" + "=" * 80)
    print("MODEL BENCHMARK RESULTS")
    print("=" * 80)
    print(df_results.to_markdown(index=False))

    return df_results, trained_models, preprocessor


if __name__ == "__main__":
    run_benchmarks()
