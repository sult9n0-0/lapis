from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DATA_PATH = ROOT_DIR / "frontend" / "src" / "data" / "laptops.json"
MODEL_PATH = BASE_DIR / "model" / "model.pkl"

FEATURE_COLUMNS = ["company", "typeName", "usageProfile", "cpuScore", "gpuScore", "ram", "storage", "inches"]
TARGET_COLUMN = "price"


def load_dataset() -> pd.DataFrame:
    with DATA_PATH.open(encoding="utf-8") as handle:
        laptops = json.load(handle)
    frame = pd.DataFrame(laptops)
    frame = frame[FEATURE_COLUMNS + [TARGET_COLUMN]].dropna()
    frame["cpuScore"] = pd.to_numeric(frame["cpuScore"], errors="coerce")
    frame["gpuScore"] = pd.to_numeric(frame["gpuScore"], errors="coerce")
    frame["ram"] = pd.to_numeric(frame["ram"], errors="coerce")
    frame["storage"] = pd.to_numeric(frame["storage"], errors="coerce")
    frame["inches"] = pd.to_numeric(frame["inches"], errors="coerce")
    frame[TARGET_COLUMN] = pd.to_numeric(frame[TARGET_COLUMN], errors="coerce")
    frame = frame.dropna().reset_index(drop=True)
    return frame


def build_pipeline() -> Pipeline:
    categorical_features = ["company", "typeName", "usageProfile"]
    numeric_features = ["cpuScore", "gpuScore", "ram", "storage", "inches"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore"), categorical_features),
            ("numeric", "passthrough", numeric_features),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=260,
        random_state=42,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def main() -> None:
    frame = load_dataset()
    pipeline = build_pipeline()
    pipeline.fit(frame[FEATURE_COLUMNS], frame[TARGET_COLUMN])
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    print(f"Saved trained model to {MODEL_PATH}")
    print(f"Training rows: {len(frame)}")


if __name__ == "__main__":
    main()

