import json
import pandas as pd
import os

def prepare_ml_dataset(json_path, csv_path):
    # Load data
    with open(json_path, encoding='utf-8') as f:
        laptops = json.load(f)
    df = pd.DataFrame(laptops)

    # Select and clean features
    features = ['cpuScore', 'gpuScore', 'ram', 'storage', 'inches', 'company', 'typeName', 'usageProfile', 'price']
    df = df[features]

    # Drop rows with missing or invalid values
    df = df.dropna()
    df = df[(df['cpuScore'].apply(lambda x: isinstance(x, (int, float)))) &
            (df['gpuScore'].apply(lambda x: isinstance(x, (int, float)))) &
            (df['ram'].apply(lambda x: isinstance(x, (int, float)))) &
            (df['storage'].apply(lambda x: isinstance(x, (int, float)))) &
            (df['inches'].apply(lambda x: isinstance(x, (int, float)))) &
            (df['price'].apply(lambda x: isinstance(x, (int, float))))]

    # One-hot encode categorical features with 0/1 (not True/False)
    df = pd.get_dummies(df, columns=['company', 'typeName', 'usageProfile'], prefix=['company', 'typeName', 'usageProfile'], dtype=int)

    # Ensure all columns are numeric except the target
    for col in df.columns:
        if col != 'price':
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
    df['price'] = pd.to_numeric(df['price'], errors='coerce').fillna(0)

    # Drop any rows with missing values after encoding
    df = df.dropna()

    # Save to CSV
    df.to_csv(csv_path, index=False)
    print(f"ML-ready dataset written to {csv_path}")

if __name__ == '__main__':
    base = os.path.dirname(__file__)
    # Prefer laptop.json, fallback to laptops.json
    json_path = os.path.join(base, 'laptop.json')
    if not os.path.exists(json_path):
        json_path = os.path.join(base, 'laptops.json')
    csv_path = os.path.join(base, 'laptop_ml_ready.csv')
    prepare_ml_dataset(json_path, csv_path)