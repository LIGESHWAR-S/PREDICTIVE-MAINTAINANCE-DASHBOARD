from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from app.database.session import Base
import datetime

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("machines.product_id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    air_temp = Column(Float, nullable=False)           # Air temperature [K]
    process_temp = Column(Float, nullable=False)       # Process temperature [K]
    rotational_speed = Column(Float, nullable=False)   # Rotational speed [rpm]
    torque = Column(Float, nullable=False)             # Torque [Nm]
    tool_wear = Column(Float, nullable=False)           # Tool wear [min]
    failure_prob = Column(Float, default=0.0)          # Predicted failure probability
    failure_type = Column(String, default="No Failure") # Predicted or actual failure type
    is_failure = Column(Boolean, default=False)        # Target label (failed or not)
