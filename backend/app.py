from flask import Flask, request, jsonify

from predict import predict_price

app = Flask(__name__)


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True) or {}
    prediction = predict_price(payload)
    return jsonify({"prediction": prediction})


if __name__ == "__main__":
    app.run(debug=True)
