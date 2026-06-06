from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

MODEL_PATH = Path(__file__).resolve().parent / "model" / "model.pkl"
PRICE_TO_AED_RATE = 4.32
FEATURE_COLUMNS = ["company", "typeName", "usageProfile", "cpuScore", "gpuScore", "ram", "storage", "inches"]


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _extract_record(features: dict[str, Any]) -> dict[str, Any]:
    laptop = features.get("laptop") if isinstance(features.get("laptop"), dict) else {}
    specs = features.get("specs") if isinstance(features.get("specs"), dict) else {}

    def pick(*keys: str, default: Any = None) -> Any:
        for key in keys:
            if key in features and features[key] not in (None, ""):
                return features[key]
            if key in specs and specs[key] not in (None, ""):
                return specs[key]
            if key in laptop and laptop[key] not in (None, ""):
                return laptop[key]
        return default

    return {
        "id": pick("id", default=None),
        "company": pick("company", "brand", default="Unknown"),
        "typeName": pick("typeName", default="Unknown"),
        "usageProfile": pick("usageProfile", "usage", default="Business"),
        "cpuScore": _to_float(pick("cpuScore", "selectedCPUScore", default=0)),
        "gpuScore": _to_float(pick("gpuScore", "selectedGPUScore", default=0)),
        "ram": _to_float(pick("ram", "selectedRAM", default=0)),
        "storage": _to_float(pick("storage", "selectedStorage", default=0)),
        "inches": _to_float(pick("inches", default=0)),
        "currentPrice": _to_float(pick("currentPrice", "priceAed", "price", default=0)),
        "predictionDate": pick("predictionDate", "date", default=""),
    }


def _days_ahead(prediction_date: str) -> int:
    if not prediction_date:
        return 0
    try:
        target = datetime.fromisoformat(f"{prediction_date}T00:00:00")
    except ValueError:
        return 0
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    delta_days = int((target - today).total_seconds() // 86400)
    return max(0, delta_days)


def _time_multiplier(days_ahead: int) -> float:
    return 1.0 + min(0.2, days_ahead * 0.0008)


@lru_cache(maxsize=1)
def _load_model() -> Any | None:
    if not MODEL_PATH.exists():
        return None

    try:
        artifact = joblib.load(MODEL_PATH)
    except Exception:
        return None

    if hasattr(artifact, "predict"):
        return artifact
    if isinstance(artifact, dict):
        for key in ("model", "estimator", "pipeline"):
            candidate = artifact.get(key)
            if hasattr(candidate, "predict"):
                return candidate
    return None


def get_model_status() -> dict[str, Any]:
    model = _load_model()
    return {
        "modelLoaded": model is not None,
        "modelPath": str(MODEL_PATH),
    }


def _fallback_baseline_price(record: dict[str, Any]) -> float:
    cpu_component = record["cpuScore"] * 0.11
    gpu_component = record["gpuScore"] * 0.09
    ram_component = record["ram"] * 14.5
    storage_component = record["storage"] * 0.38
    size_component = record["inches"] * 18

    company_multipliers = {
        "Apple": 1.45,
        "Microsoft": 1.2,
        "Razer": 1.3,
        "MSI": 1.18,
        "ASUS": 1.08,
        "Dell": 1.02,
        "HP": 0.98,
        "Lenovo": 0.97,
        "Acer": 0.92,
        "Samsung": 1.05,
        "LG": 1.04,
        "Gigabyte": 1.1,
        "Alienware": 1.35,
        "Huawei": 0.96,
        "Toshiba": 0.9,
        "Fujitsu": 0.9,
    }
    type_multipliers = {
        "Ultrabook": 1.12,
        "Notebook": 1.0,
        "Gaming": 1.24,
        "2 in 1 Convertible": 1.08,
        "Workstation": 1.22,
    }
    usage_multipliers = {
        "Gaming": 1.12,
        "Creator": 1.08,
        "Business": 1.0,
        "Student": 0.9,
    }

    base_price = cpu_component + gpu_component + ram_component + storage_component + size_component
    base_price *= company_multipliers.get(record["company"], 1.0)
    base_price *= type_multipliers.get(record["typeName"], 1.0)
    base_price *= usage_multipliers.get(record["usageProfile"], 1.0)
    return max(base_price, 0.0)


def _predict_baseline_price(record: dict[str, Any]) -> tuple[float, str]:
    model = _load_model()
    if model is None:
        return _fallback_baseline_price(record), "fallback"

    frame = pd.DataFrame([{column: record[column] for column in FEATURE_COLUMNS}])
    prediction = model.predict(frame)[0]
    return max(_to_float(prediction), 0.0), "model"


def _confidence_score(record: dict[str, Any], baseline_price: float, final_price: float, days_ahead: int, source: str) -> str:
    completeness = sum(1 for key in FEATURE_COLUMNS if record.get(key) not in (None, "")) / len(FEATURE_COLUMNS)
    horizon_penalty = min(10.0, days_ahead * 0.18)
    drift_penalty = min(12.0, abs(final_price - baseline_price) / max(baseline_price, 1.0) * 10.0)
    model_bonus = 2.5 if source == "model" else 0.0
    score = min(100.0, max(78.0, 97.0 + model_bonus + completeness * 3.0 - horizon_penalty - drift_penalty))
    return f"{round(score)}%"


def predict_price(features: dict[str, Any]) -> dict[str, Any]:
    record = _extract_record(features)
    days_ahead = _days_ahead(str(record.get("predictionDate") or ""))
    baseline_price, source = _predict_baseline_price(record)
    final_price_raw = baseline_price * _time_multiplier(days_ahead)
    final_price_aed = round(final_price_raw * PRICE_TO_AED_RATE)

    return {
        "id": record.get("id"),
        "prediction": final_price_aed,
        "confidenceScore": _confidence_score(record, baseline_price, final_price_raw, days_ahead, source),
        "daysAhead": days_ahead,
        "modelSource": source,
    }


def predict_prices(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [predict_price(item) for item in items]


def predict_payload(payload: Any) -> Any:
    if isinstance(payload, list):
        return {"predictions": predict_prices(payload)}

    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        prediction_date = payload.get("predictionDate")
        items = [
            {**item, "predictionDate": item.get("predictionDate", prediction_date)}
            for item in payload["items"]
            if isinstance(item, dict)
        ]
        return {"predictions": predict_prices(items)}

    if not isinstance(payload, dict):
        payload = {}

    return predict_price(payload)
