from sqlalchemy import Column, String, DateTime
from app.database.session import Base
import datetime

class Machine(Base):
    __tablename__ = "machines"

    product_id = Column(String, primary_key=True, index=True)
    type = Column(String, nullable=False)  # 'L', 'M', or 'H'
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
