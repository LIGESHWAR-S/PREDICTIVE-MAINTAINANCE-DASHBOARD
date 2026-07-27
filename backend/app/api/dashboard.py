from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.machine import Machine
from app.models.sensor import SensorReading
from app.models.alert import Alert
from app.schemas.dashboard import DashboardStats
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns aggregated KPI metrics for the dashboard home screen.
    """
    # 1. Total machines count
    total_machines = db.query(func.count(Machine.product_id)).scalar() or 0

    if total_machines == 0:
        return {
            "total_machines": 0,
            "healthy_machines": 0,
            "warning_machines": 0,
            "critical_machines": 0,
            "overall_health": 100.0,
            "predicted_failures": 0,
            "active_alerts": 0
        }

    # 2. Get latest sensor reading for each machine
    # Since we have one main reading per machine in the database (or the latest),
    # let's fetch the latest sensor reading for all machines.
    # In SQLite/Postgres we can subquery or group. Since datasets are small:
    subquery = db.query(
        SensorReading.product_id,
        func.max(SensorReading.timestamp).label("max_ts")
    ).group_by(SensorReading.product_id).subquery()

    latest_readings = db.query(SensorReading).join(
        subquery,
        (SensorReading.product_id == subquery.c.product_id) & 
        (SensorReading.timestamp == subquery.c.max_ts)
    ).all()

    healthy_count = 0
    warning_count = 0
    critical_count = 0
    total_health_score = 0.0
    predicted_failures_count = 0

    for r in latest_readings:
        prob = r.failure_prob or 0.0
        health = (1.0 - prob) * 100.0
        total_health_score += health

        if prob > 0.7 or r.is_failure:
            critical_count += 1
        elif prob > 0.3:
            warning_count += 1
        else:
            healthy_count += 1

        if prob > 0.5 or r.is_failure:
            predicted_failures_count += 1

    # Active alerts count
    active_alerts = db.query(func.count(Alert.id)).filter(Alert.is_resolved == False).scalar() or 0

    overall_health = total_health_score / len(latest_readings) if latest_readings else 100.0

    # Ensure counts sum to total_machines if some machines don't have readings
    missing_readings = max(0, total_machines - len(latest_readings))
    healthy_count += missing_readings

    return {
        "total_machines": total_machines,
        "healthy_machines": healthy_count,
        "warning_machines": warning_count,
        "critical_machines": critical_count,
        "overall_health": round(overall_health, 2),
        "predicted_failures": predicted_failures_count,
        "active_alerts": active_alerts
    }
