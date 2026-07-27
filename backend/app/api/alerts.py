from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertResponse
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[AlertResponse])
def get_alerts(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user),
    resolved: bool = False
):
    """
    Retrieves unresolved (or resolved) alerts ordered by timestamp descending.
    """
    alerts = db.query(Alert).filter(
        Alert.is_resolved == resolved
    ).order_by(Alert.timestamp.desc()).all()
    return alerts
