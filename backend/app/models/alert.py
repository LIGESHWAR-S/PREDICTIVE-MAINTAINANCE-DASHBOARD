from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from app.database.session import Base
import datetime

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(String, ForeignKey("machines.product_id", ondelete="CASCADE"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    type = Column(String, nullable=False)        # e.g., 'Air Temp High', 'High Failure Risk'
    message = Column(String, nullable=False)     # alert details
    severity = Column(String, nullable=False)    # 'warning' or 'critical'
    is_resolved = Column(Boolean, default=False)
