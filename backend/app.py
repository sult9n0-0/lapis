import os

from flask import Flask, request, jsonify

try:
    from .predict import get_model_status, predict_payload
except ImportError:  # pragma: no cover - allows `python app.py` from backend/
    from predict import get_model_status, predict_payload

app = Flask(__name__)


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    return jsonify(predict_payload(payload))


@app.get("/health")
def health():
    status = get_model_status()
    return jsonify({"status": "ok" if status["modelLoaded"] else "model-unavailable", **status})


if __name__ == "__main__":
    debug = os.environ.get("FLASK_DEBUG", "1") not in {"0", "false", "False"}
    app.run(host="127.0.0.1", port=5000, debug=debug)
