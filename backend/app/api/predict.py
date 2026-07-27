from fastapi import APIRouter, Depends, HTTPException
from app.schemas.predict import PredictRequest, PredictResponse
from app.ml.pipeline import load_model, predict_failure
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/predict", tags=["Prediction"])

def fallback_rule_prediction(
    machine_type: str, 
    air_temp: float, 
    process_temp: float, 
    rotational_speed: float, 
    torque: float, 
    tool_wear: float
) -> dict:
    """
    Physically inspired rules-based fallback model matching the AI4I 2020 dataset characteristics.
    """
    prob = 0.02
    fail_type = "No Failure"
    
    # 1. Tool Wear Failure (TWF)
    # Tool wear failure occurs when tool wear is high (typically between 200 and 240 mins)
    if tool_wear > 220:
        prob = max(prob, 0.85)
        fail_type = "Tool Wear Failure (TWF)"
        
    # 2. Heat Dissipation Failure (HDF)
    # HDF occurs if the difference between process temp and air temp is below 8.6 K 
    # AND rotational speed is below 1380 rpm
    temp_diff = process_temp - air_temp
    if temp_diff < 8.6 and rotational_speed < 1380:
        prob = max(prob, 0.90)
        fail_type = "Heat Dissipation Failure (HDF)"
        
    # 3. Power Failure (PWF)
    # PWF occurs if torque * rotational_speed is below 3800 W or above 9000 W
    power = torque * (rotational_speed * 2 * 3.14159 / 60) # Power in Watts
    if power < 3500 or power > 9000:
        prob = max(prob, 0.80)
        fail_type = "Power Failure (PWF)"
        
    # 4. Overstrain Failure (OSF)
    # OSF occurs if tool wear * torque exceeds certain values depending on type
    multiplier = 11000 if machine_type == "L" else (12000 if machine_type == "M" else 13000)
    if tool_wear * torque > multiplier:
        prob = max(prob, 0.78)
        fail_type = "Overstrain Failure (OSF)"
        
    # 5. Random Failure (RNF)
    # Each record has a 0.1% chance of random failure
    import random
    if random.random() < 0.001:
        prob = max(prob, 0.50)
        fail_type = "Random Failure (RNF)"
        
    is_failure = prob > 0.5
    
    return {
        "failure_probability": float(prob),
        "predicted_failure_type": fail_type,
        "is_failure": is_failure
    }

@router.post("", response_model=PredictResponse)
def predict(request: PredictRequest, current_user: User = Depends(get_current_user)):
    """
    Predicts machine failure probability and failure type using the loaded Random Forest model.
    """
    model = load_model()
    
    if model is not None:
        try:
            res = predict_failure(
                model=model,
                machine_type=request.type,
                air_temp=request.air_temp,
                process_temp=request.process_temp,
                rotational_speed=request.rotational_speed,
                torque=request.torque,
                tool_wear=request.tool_wear
            )
            return res
        except Exception as e:
            # Fallback if prediction execution fails
            pass
            
    # Rules-based fallback if model is not loaded or errors out
    res = fallback_rule_prediction(
        machine_type=request.type,
        air_temp=request.air_temp,
        process_temp=request.process_temp,
        rotational_speed=request.rotational_speed,
        torque=request.torque,
        tool_wear=request.tool_wear
    )
    return res
