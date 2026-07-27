from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import datetime
import random
from typing import List
from app.database.session import get_db
from app.models.sensor import SensorReading
from app.schemas.sensor import SensorReadingResponse
from app.utils.security import get_current_user
from app.models.user import User
from app.api.predict import fallback_rule_prediction
from app.ml.pipeline import load_model, predict_failure

router = APIRouter(prefix="/history", tags=["History"])

@router.get("/{machine_id}", response_model=List[SensorReadingResponse])
def get_machine_history(machine_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns time-series history for a machine. If only 1 record exists in the DB,
    it dynamically generates 15 historical steps leading up to it for visualization.
    """
    # Fetch existing records
    readings = db.query(SensorReading).filter(
        SensorReading.product_id == machine_id
    ).order_by(SensorReading.timestamp.asc()).all()

    if not readings:
        raise HTTPException(status_code=404, detail="Machine has no sensor readings")

    # If we have multiple historical readings, return them
    if len(readings) > 1:
        return readings

    # If we only have 1 reading, let's generate 15 historical points leading up to it
    latest = readings[0]
    
    # Load ML model once for generating realistic probabilities
    model = load_model()
    
    generated_readings = []
    
    current_time = latest.timestamp or datetime.datetime.utcnow()
    current_tool_wear = latest.tool_wear
    current_air_temp = latest.air_temp
    current_process_temp = latest.process_temp
    
    steps = 15
    for i in range(steps - 1, -1, -1):
        if i == 0:
            # The final step is the actual latest reading
            generated_readings.append(latest)
            continue
            
        # Deduct time: 10 minutes per step
        step_time = current_time - datetime.timedelta(minutes=10 * i)
        
        # Deduct tool wear: tool wear grows by roughly 1-2 minutes per step
        step_tool_wear = max(0.0, current_tool_wear - (i * 1.5))
        
        # Temperature fluctuations: slightly lower in the past (warming up)
        temp_reduction = i * 0.1 # air temp rises slightly over operation
        step_air_temp = current_air_temp - temp_reduction + random.normalvariate(0, 0.2)
        step_process_temp = current_process_temp - temp_reduction + random.normalvariate(0, 0.2)
        
        # Rotational speed and torque fluctuate with inverse relationship
        # Let's keep them close to the latest value with random noise
        step_speed = latest.rotational_speed + random.randint(-50, 50)
        step_torque = latest.torque + random.uniform(-3, 3)
        
        # Run prediction for this step
        if model:
            pred = predict_failure(
                model=model,
                machine_type=latest.product_id[0], # L, M, or H
                air_temp=step_air_temp,
                process_temp=step_process_temp,
                rotational_speed=step_speed,
                torque=step_torque,
                tool_wear=step_tool_wear
            )
        else:
            pred = fallback_rule_prediction(
                machine_type=latest.product_id[0],
                air_temp=step_air_temp,
                process_temp=step_process_temp,
                rotational_speed=step_speed,
                torque=step_torque,
                tool_wear=step_tool_wear
            )
            
        # Create a mock database object (non-persistent)
        mock_reading = SensorReading(
            id=-(i + 1), # negative IDs to distinguish mock records
            product_id=machine_id,
            timestamp=step_time,
            air_temp=round(step_air_temp, 2),
            process_temp=round(step_process_temp, 2),
            rotational_speed=round(step_speed, 1),
            torque=round(step_torque, 2),
            tool_wear=round(step_tool_wear, 1),
            failure_prob=pred["failure_probability"],
            failure_type=pred["predicted_failure_type"],
            is_failure=pred["is_failure"]
        )
        generated_readings.append(mock_reading)
        
    return generated_readings
