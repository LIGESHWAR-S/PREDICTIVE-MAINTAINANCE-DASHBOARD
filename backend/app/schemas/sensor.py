from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class SensorReadingCreate(BaseModel):
    product_id: str
    air_temp: float
    process_temp: float
    rotational_speed: float
    torque: float
    tool_wear: float
    failure_prob: Optional[float] = 0.0
    failure_type: Optional[str] = "No Failure"
    is_failure: Optional[bool] = False

class SensorReadingResponse(BaseModel):
    id: int
    product_id: str
    timestamp: datetime
    air_temp: float
    process_temp: float
    rotational_speed: float
    torque: float
    tool_wear: float
    failure_prob: float
    failure_type: str
    is_failure: bool

    class Config:
        from_attributes = True

class MachineDetailResponse(BaseModel):
    product_id: str
    type: str
    last_updated: datetime
    latest_reading: Optional[SensorReadingResponse] = None
    health_score: float                  # 0 to 100
    failure_probability: float           # 0 to 1
    predicted_failure_type: str
    maintenance_recommendation: str
    estimated_rul: float                 # Estimated Remaining Useful Life in minutes
