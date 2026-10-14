"""
FinMonitor — ML-модуль прогнозування витрат (референсна реалізація на Python).

Логіка повторює алгоритм, реалізований у клієнті (client/src/pages/Dashboard.js):
Random Forest Regressor на часовому ряді місячних витрат + оцінка якості (RMSE, R², MAPE).

Використання:
    python predict.py                      # демо на синтетичних даних
    python predict.py history.json         # [{"month_index": 1, "amount": 12500}, ...]
"""
import json
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, mean_squared_error, r2_score


def predict_expenses(history_data, n_estimators=100, random_state=42):
    """Прогноз суми витрат на наступний місяць.

    history_data: список словників з ключами `month_index` та `amount`.
    Повертає словник з прогнозом і метриками якості моделі.
    """
    df = pd.DataFrame(history_data).sort_values("month_index")
    if len(df) < 2:
        raise ValueError("Потрібно щонайменше 2 місяці історії")

    X = df[["month_index"]].to_numpy()
    y = df["amount"].to_numpy(dtype=float)

    model = RandomForestRegressor(n_estimators=n_estimators, random_state=random_state)
    model.fit(X, y)

    fitted = model.predict(X)
    next_month = np.array([[df["month_index"].max() + 1]])
    forecast = float(model.predict(next_month)[0])

    return {
        "forecast_next_month": round(forecast, 2),
        "rmse": round(float(np.sqrt(mean_squared_error(y, fitted))), 2),
        "r2": round(float(r2_score(y, fitted)), 4),
        "mape_pct": round(float(mean_absolute_percentage_error(y, fitted) * 100), 2),
    }


def calculate_pension(monthly_investment, years, annual_yield=0.10):
    """Майбутня вартість регулярних щомісячних внесків (формула ануїтету, FV)."""
    months = years * 12
    monthly_yield = annual_yield / 12
    if monthly_yield == 0:
        return monthly_investment * months
    return monthly_investment * ((1 + monthly_yield) ** months - 1) / monthly_yield


def _demo_history(months=12, seed=7):
    rng = np.random.default_rng(seed)
    base = 18000 + np.arange(months) * 250
    season = 1500 * np.sin(np.arange(months) / 12 * 2 * np.pi)
    noise = rng.normal(0, 900, months)
    return [{"month_index": i + 1, "amount": round(float(v), 2)}
            for i, v in enumerate(base + season + noise)]


if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            history = json.load(f)
    else:
        history = _demo_history()

    result = predict_expenses(history)
    result["pension_fv_example"] = round(calculate_pension(2000, 20), 2)
    print(json.dumps(result, ensure_ascii=False, indent=2))
