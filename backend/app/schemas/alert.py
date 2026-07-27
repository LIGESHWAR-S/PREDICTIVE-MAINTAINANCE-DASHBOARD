from pydantic import BaseModel
from datetime import datetime

class AlertCreate(BaseModel):
    product_id: str
    type: str
    message: str
    severity: str  # 'warning' or 'critical'

class AlertResponse(BaseModel):
    id: int
    product_id: str
    timestamp: datetime
    type: str
    message: str
    severity: str
    is_resolved: bool

    class Config:
        from_attributes = True
