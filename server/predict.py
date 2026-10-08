import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor

def predict_expenses(history_data):

    df = pd.DataFrame(history_data)
    
    X = np.array(df['month_index']).reshape(-1, 1)
    y = np.array(df['amount'])
    
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X, y)
    
    next_month = np.array([[len(df) + 1]])
    prediction = model.predict(next_month)
    
    return prediction[0]

def calculate_pension(monthly_investment, years, annual_yield=0.10):

    months = years * 12
    monthly_yield = annual_yield / 12
    
    time_indices = np.arange(1, months + 1)
    savings_curve = monthly_investment * ((1 + monthly_yield)**time_indices - 1) / monthly_yield
    
    return savings_curve[-1]


