from pydantic import BaseModel
from datetime import datetime

class MachineCreate(BaseModel):
    product_id: str
    type: str

class MachineResponse(BaseModel):
    product_id: str
    type: str
    last_updated: datetime

    class Config:
        from_attributes = True
