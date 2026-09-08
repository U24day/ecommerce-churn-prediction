# E-Commerce Customer Churn Prediction

An end-to-end machine learning project that predicts whether an e-commerce customer is likely to churn based on customer behavior, purchase activity, support interactions, and subscription information.

The project covers data analysis, feature engineering, model training, model evaluation, threshold optimization, ONNX conversion, REST API development, and serverless AWS deployment.

---

## Project Objective

The goal of this project is to identify customers who are at high risk of churn so that businesses can take proactive customer retention actions.

The system analyzes customer information and behavioral patterns to:

- Predict the probability of customer churn
- Identify potential churn customers
- Classify customers into Low, Medium, and High risk levels
- Provide real-time predictions through an API
- Deploy ML inference using AWS serverless infrastructure

---

## Dataset

The dataset contains **200,000 customer records**.

### Features

- Customer ID
- Age
- Gender
- City
- Tenure Months
- Average Order Value
- Total Orders
- Last Purchase Days Ago
- Support Tickets
- Subscription Type
- Churn

### Target Variable

The `churn` column is the target variable.

```text
0 = Customer Retained
1 = Customer Churned
```

### Dataset Quality

- Records: 200,000
- Missing Values: None
- Duplicate Rows: None

---

## Tech Stack

### Programming & Data Analysis

- Python
- Pandas
- NumPy
- SQL
- Jupyter Notebook

### Machine Learning

- Scikit-learn
- Logistic Regression
- Random Forest
- ONNX
- ONNX Runtime
- Joblib

### API Development

- FastAPI
- Uvicorn

### AWS

- Amazon S3
- AWS Lambda
- AWS IAM
- Lambda Function URL

### Version Control

- Git
- GitHub

---

## Machine Learning Workflow

```text
Raw Customer Data
        |
        v
Data Cleaning
        |
        v
Exploratory Data Analysis
        |
        v
Feature Engineering
        |
        v
Train / Test Split
        |
        v
Data Preprocessing
        |
        v
Model Training
        |
        v
Model Evaluation
        |
        v
Threshold Optimization
        |
        v
ONNX Conversion
        |
        v
AWS Deployment
        |
        v
Real-Time Prediction
```

---

## Exploratory Data Analysis

The dataset was analyzed to understand customer behavior and identify patterns related to churn.

Important observations included:

- Customers with higher purchase recency showed a higher tendency toward churn.
- Support ticket activity was associated with increased churn risk.
- Customer tenure showed a negative relationship with churn.
- Purchase value and total order count were less influential compared with recency and support-related features.

---

## Data Preprocessing

Categorical features were encoded using `OneHotEncoder`.

### Categorical Features

- Gender
- City
- Subscription Type

### Numerical Features

- Age
- Tenure Months
- Average Order Value
- Total Orders
- Last Purchase Days Ago
- Support Tickets
- Total Spend
- Orders per Month
- Support Tickets per Order
- Purchase Recency Ratio

The preprocessing pipeline was implemented using Scikit-learn's `ColumnTransformer`.

---

## Feature Engineering

Four additional features were created from the original customer data.

### 1. Total Spend

```text
total_spend = avg_order_value × total_orders
```

### 2. Orders per Month

```text
orders_per_month = total_orders / tenure_months
```

### 3. Support Tickets per Order

```text
support_tickets_per_order = support_tickets / total_orders
```

### 4. Purchase Recency Ratio

```text
purchase_recency_ratio =
last_purchase_days_ago / (tenure_months × 30)
```

---

## Model Training

Two classification models were evaluated:

1. Logistic Regression
2. Random Forest

The Random Forest model was selected for the final prediction pipeline because it achieved better ROC-AUC performance and captured nonlinear relationships between customer behavior features.

---

## Model Performance

### Random Forest

At the default classification threshold of `0.50`:

| Metric | Score |
|---|---:|
| Accuracy | 66.09% |
| Precision | 58.29% |
| Recall | 31.17% |
| F1 Score | 40.61% |
| ROC-AUC | 67.93% |

---

## Threshold Optimization

The default classification threshold of `0.50` was changed to `0.30` to prioritize identifying potential churners.

At a threshold of `0.30`:

| Metric | Score |
|---|---:|
| Precision | 45.03% |
| Recall | 82.69% |
| F1 Score | 58.31% |

The lower threshold allows the system to identify a much larger proportion of potential churn customers.

For a customer retention use case, higher recall can be useful because missing a customer who is likely to churn may result in a lost retention opportunity.

---

## Feature Importance

The most important features identified by the Random Forest model were:

| Rank | Feature |
|---|---|
| 1 | Purchase Recency Ratio |
| 2 | Last Purchase Days Ago |
| 3 | Support Tickets |
| 4 | Support Tickets per Order |
| 5 | Orders per Month |
| 6 | Tenure Months |
| 7 | Total Spend |
| 8 | Average Order Value |
| 9 | Total Orders |
| 10 | Age |

This indicates that customer purchase recency and support interactions are important signals for predicting churn.

---

## Risk Classification

The model probability is converted into a customer risk level.

| Churn Probability | Risk Level |
|---|---|
| `< 0.30` | Low |
| `0.30 - 0.59` | Medium |
| `>= 0.60` | High |

The churn classification threshold is `0.30`.

---

# Local REST API

A FastAPI REST API was developed to provide real-time churn predictions.

## Endpoint

```text
POST /predict
```

## Example Request

```json
{
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
```

## Example Response

```json
{
  "customer_id": 100001,
  "churn_probability": 0.2811,
  "churn_prediction": 0,
  "risk_level": "Low"
}
```

---

# AWS Deployment

The trained machine learning model was converted to ONNX format and deployed using a serverless AWS architecture.

The final AWS implementation uses Amazon S3 for model storage and AWS Lambda for serverless inference.

## AWS Architecture

```text
                 Customer
                    |
                    v
          Lambda Function URL
                    |
                    v
             AWS Lambda
                    |
          +---------+---------+
          |                   |
          v                   v
      Amazon S3         ONNX Runtime
          |                   |
          |                   v
          |             Model Inference
          |                   |
          +---------+---------+
                    |
                    v
             Churn Probability
                    |
                    v
                Risk Level
```

---

## AWS Services Used

### Amazon S3

Amazon S3 is used to store the ONNX model artifacts.

```text
models/
├── churn_model.onnx
└── preprocessor.onnx
```

### AWS Lambda

AWS Lambda runs the machine learning inference code without requiring an always-running server.

The Lambda function:

1. Receives customer information
2. Loads the ONNX preprocessing model
3. Loads the ONNX churn model from S3
4. Processes the customer input
5. Runs model inference
6. Calculates churn probability
7. Determines the risk level
8. Returns the prediction as JSON

### AWS IAM

AWS IAM provides the Lambda execution role with permission to read the model files stored in Amazon S3.

### Lambda Function URL

A Lambda Function URL provides an HTTP endpoint for sending customer information to the deployed ML model.

---

## AWS Deployment Flow

```text
Local Machine Learning Training
              |
              v
       Scikit-learn Model
              |
              v
        ONNX Conversion
              |
       +------+------+
       |             |
       v             v
preprocessor.onnx  churn_model.onnx
       |             |
       +------+------+
              |
              v
          Amazon S3
              |
              v
        AWS Lambda
              |
              v
    Lambda Function URL
              |
              v
       JSON Prediction
```

---

## Why ONNX?

The Scikit-learn preprocessing pipeline and Random Forest model were converted to ONNX format.

ONNX allows the trained model to be executed using ONNX Runtime.

This makes the model suitable for lightweight inference environments such as AWS Lambda and separates model artifacts from the application code.

---

## AWS Prediction Test

The deployed Lambda function was tested using a customer request through the Lambda Function URL.

### Example Input

```json
{
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
```

### Example Output

```json
{
  "customer_id": 100001,
  "churn_probability": 0.2811,
  "churn_prediction": 0,
  "risk_level": "Low"
}
```

This confirms that the deployed serverless ML inference pipeline successfully returns predictions through the Lambda Function URL.

---

## Project Structure

```text
ecommerce-churn-prediction/
│
├── api/
│   └── app.py
│
├── data/
│   └── raw/
│       └── ecommerce_customer_churn_large.xls
│
├── lambda/
│   └── lambda_function.py
│
├── models/
│   ├── churn_model.onnx
│   └── preprocessor.onnx
│
├── notebooks/
│   └── EDA.ipynb
│
├── src/
│   └── predict.py
│
├── requirements.txt
├── README.md
└── .gitignore
```

---

## Key Learning Outcomes

Through this project, I worked on:

- Exploratory Data Analysis
- Data cleaning
- Data preprocessing
- Feature engineering
- Classification algorithms
- Random Forest
- Model evaluation
- ROC-AUC analysis
- Imbalanced classification
- Threshold optimization
- Feature importance analysis
- Model serialization
- ONNX model conversion
- ONNX Runtime inference
- REST API development
- FastAPI
- Serverless machine learning deployment
- Amazon S3
- AWS Lambda
- AWS IAM
- Lambda Function URLs
- Git and GitHub

---

## Future Improvements

Possible future improvements include:

- Customer retention recommendation system
- Automated data ingestion pipeline
- Scheduled model retraining
- Model monitoring
- Data drift detection
- Batch prediction pipeline
- Power BI dashboard
- Streamlit dashboard
- CI/CD deployment
- Automated AWS deployment

---

## Project Status

**Completed**

- [x] Dataset analysis
- [x] Data preprocessing
- [x] Exploratory Data Analysis
- [x] Feature engineering
- [x] Logistic Regression baseline
- [x] Random Forest model
- [x] Model evaluation
- [x] Threshold optimization
- [x] Feature importance analysis
- [x] FastAPI REST API
- [x] ONNX model conversion
- [x] ONNX Runtime inference
- [x] Amazon S3 model storage
- [x] AWS Lambda deployment
- [x] AWS IAM configuration
- [x] Lambda Function URL
- [x] End-to-end AWS prediction testing

---

## Cost Consideration

This project is designed as a **learning and portfolio project**, not as a production system.

The architecture avoids always-running infrastructure such as:

- EC2 servers
- RDS databases
- NAT gateways
- Dedicated SageMaker inference endpoints

AWS Free Tier, credits, and account-specific pricing may apply. Actual costs depend on AWS account eligibility and resource usage.

---

## Author

**Uday Kumar Das**

B.Tech Information Technology  
Jaipur, Rajasthan, India

GitHub: [U24day](https://github.com/U24day)
