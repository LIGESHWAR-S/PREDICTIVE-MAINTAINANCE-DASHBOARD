import io
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from datetime import datetime, timedelta
from app.database.session import get_db
from app.models.machine import Machine
from app.models.sensor import SensorReading
from app.models.alert import Alert
from app.utils.pdf_gen import generate_dashboard_report, generate_machine_report
from app.api.machines import get_recommendation_and_rul
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Returns analytics metrics and aggregations for Recharts charts.
    """
    # 1. Fetch latest sensor reading for each machine
    subquery = db.query(
        SensorReading.product_id,
        func.max(SensorReading.timestamp).label("max_ts")
    ).group_by(SensorReading.product_id).subquery()

    latest_readings = db.query(SensorReading).join(
        subquery,
        (SensorReading.product_id == subquery.c.product_id) & 
        (SensorReading.timestamp == subquery.c.max_ts)
    ).all()

    if not latest_readings:
        return {
            "health_distribution": [],
            "failure_types": [],
            "sensor_trends": [],
            "alerts_trend": [],
            "machine_comparison": []
        }

    # A. Health Distribution
    healthy_cnt = 0
    warning_cnt = 0
    critical_cnt = 0
    for r in latest_readings:
        prob = r.failure_prob or 0.0
        if prob > 0.7 or r.is_failure:
            critical_cnt += 1
        elif prob > 0.3:
            warning_cnt += 1
        else:
            healthy_cnt += 1

    health_dist = [
        {"name": "Healthy", "value": healthy_cnt, "color": "#16A34A"},
        {"name": "Warning", "value": warning_cnt, "color": "#D97706"},
        {"name": "Critical", "value": critical_cnt, "color": "#DC2626"}
    ]

    # B. Failure Type Distribution
    failure_counts = {}
    for r in latest_readings:
        if r.is_failure and r.failure_type != "No Failure":
            failure_counts[r.failure_type] = failure_counts.get(r.failure_type, 0) + 1
            
    failure_types = [{"type": k, "count": v} for k, v in failure_counts.items()]
    # If empty, add a default for charts
    if not failure_types:
        failure_types = [{"type": "No Active Failures", "count": 0}]

    # C. Sensor parameter ranges (Machine Comparison)
    # Get top 5 machines with highest failure probability
    sorted_readings = sorted(latest_readings, key=lambda x: x.failure_prob or 0.0, reverse=True)
    machine_comp = []
    for r in sorted_readings[:5]:
        machine_comp.append({
            "product_id": r.product_id,
            "failure_probability": round((r.failure_prob or 0.0) * 100, 1),
            "tool_wear": r.tool_wear,
            "torque": r.torque,
            "air_temp": r.air_temp
        })

    # D. Temperature & parameter trends (Sensor Trends)
    # Take a sample of readings to construct a generic timeline
    sensor_trends = []
    # Sort readings by timestamp to show a temporal sequence
    time_sorted = sorted(latest_readings, key=lambda x: x.timestamp)
    # Sample up to 30 readings spaced out
    step = max(1, len(time_sorted) // 30)
    sampled = time_sorted[::step][:30]
    for idx, r in enumerate(sampled):
        sensor_trends.append({
            "time": r.timestamp.strftime("%H:%M") if r.timestamp else f"T-{idx}",
            "air_temp": round(r.air_temp, 1),
            "process_temp": round(r.process_temp, 1),
            "rotational_speed": int(r.rotational_speed),
            "torque": round(r.torque, 1),
            "tool_wear": int(r.tool_wear)
        })

    # E. Alerts Trend (last 7 days)
    alerts_trend = []
    today = datetime.utcnow().date()
    for d in range(6, -1, -1):
        target_date = today - timedelta(days=d)
        cnt = db.query(func.count(Alert.id)).filter(
            func.date(Alert.timestamp) == target_date
        ).scalar() or 0
        alerts_trend.append({
            "date": target_date.strftime("%b %d"),
            "alerts": cnt
        })

    return {
        "health_distribution": health_dist,
        "failure_types": failure_types,
        "sensor_trends": sensor_trends,
        "alerts_trend": alerts_trend,
        "machine_comparison": machine_comp
    }

@router.get("/export/dashboard")
def export_dashboard_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Generates and returns the PDF dashboard summary report.
    """
    # Get stats
    subquery = db.query(
        SensorReading.product_id,
        func.max(SensorReading.timestamp).label("max_ts")
    ).group_by(SensorReading.product_id).subquery()

    latest_readings = db.query(SensorReading).join(
        subquery,
        (SensorReading.product_id == subquery.c.product_id) & 
        (SensorReading.timestamp == subquery.c.max_ts)
    ).all()

    total_machines = db.query(func.count(Machine.product_id)).scalar() or 0

    healthy_cnt = 0
    warning_cnt = 0
    critical_cnt = 0
    total_health = 0.0
    pred_failures = 0

    for r in latest_readings:
        prob = r.failure_prob or 0.0
        total_health += (1.0 - prob) * 100
        if prob > 0.7 or r.is_failure:
            critical_cnt += 1
        elif prob > 0.3:
            warning_cnt += 1
        else:
            healthy_cnt += 1

        if prob > 0.5 or r.is_failure:
            pred_failures += 1

    active_alerts_cnt = db.query(func.count(Alert.id)).filter(Alert.is_resolved == False).scalar() or 0
    avg_health = total_health / len(latest_readings) if latest_readings else 100.0

    stats = {
        "total_machines": total_machines,
        "healthy_machines": healthy_cnt,
        "warning_machines": warning_cnt,
        "critical_machines": critical_cnt,
        "overall_health": avg_health,
        "predicted_failures": pred_failures,
        "active_alerts": active_alerts_cnt
    }

    # Get active alerts (top 20)
    alerts = db.query(Alert).filter(Alert.is_resolved == False).order_by(Alert.timestamp.desc()).limit(20).all()
    alerts_data = []
    for a in alerts:
        alerts_data.append({
            "product_id": a.product_id,
            "type": a.type,
            "message": a.message,
            "severity": a.severity,
            "timestamp": a.timestamp
        })

    pdf_buffer = generate_dashboard_report(stats, alerts_data)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=dashboard_health_report.pdf"}
    )

@router.get("/export/machine/{id}")
def export_machine_pdf(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Generates and returns the PDF diagnostics report for a specific machine.
    """
    machine = db.query(Machine).filter(Machine.product_id == id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Latest reading
    latest_reading = db.query(SensorReading).filter(
        SensorReading.product_id == id
    ).order_by(SensorReading.timestamp.desc()).first()

    prob = latest_reading.failure_prob if latest_reading else 0.0
    fail_type = latest_reading.failure_type if latest_reading else "No Failure"
    tool_wear = latest_reading.tool_wear if latest_reading else 0.0
    air_temp = latest_reading.air_temp if latest_reading else 298.0
    is_failed = latest_reading.is_failure if latest_reading else False

    health_score = (1.0 - prob) * 100.0
    if is_failed:
        health_score = min(health_score, 10.0)

    recommendation, estimated_rul = get_recommendation_and_rul(prob, fail_type, tool_wear, air_temp)

    # Compile machine dict
    machine_dict = {
        "product_id": machine.product_id,
        "type": machine.type,
        "last_updated": machine.last_updated,
        "latest_reading": latest_reading,
        "health_score": health_score,
        "failure_probability": prob,
        "predicted_failure_type": fail_type,
        "maintenance_recommendation": recommendation,
        "estimated_rul": estimated_rul
    }

    # Fetch history (last 20 readings)
    history = db.query(SensorReading).filter(
        SensorReading.product_id == id
    ).order_by(SensorReading.timestamp.desc()).limit(20).all()

    # If only 1 reading exists, mock history for PDF
    if len(history) == 1:
        # Import history generator logic
        from app.api.history import get_machine_history
        # Call history endpoint logic directly (using mock user)
        history = get_machine_history(id, db, current_user)

    pdf_buffer = generate_machine_report(machine_dict, history)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=machine_{id}_report.pdf"}
    )

@router.get("/export/predictions")
def export_predictions_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Exports a CSV spreadsheet containing prediction outputs for all machines.
    """
    subquery = db.query(
        SensorReading.product_id,
        func.max(SensorReading.timestamp).label("max_ts")
    ).group_by(SensorReading.product_id).subquery()

    readings = db.query(SensorReading).join(
        subquery,
        (SensorReading.product_id == subquery.c.product_id) & 
        (SensorReading.timestamp == subquery.c.max_ts)
    ).all()

    if not readings:
        raise HTTPException(status_code=400, detail="No prediction records found to export.")

    data = []
    for r in readings:
        data.append({
            "Machine ID": r.product_id,
            "Type": r.product_id[0],
            "Air Temperature [K]": r.air_temp,
            "Process Temperature [K]": r.process_temp,
            "Rotational Speed [rpm]": r.rotational_speed,
            "Torque [Nm]": r.torque,
            "Tool Wear [min]": r.tool_wear,
            "Failure Probability": round(r.failure_prob, 4),
            "Predicted Failure Type": r.failure_type,
            "Status": "Critical" if r.failure_prob > 0.7 or r.is_failure else ("Warning" if r.failure_prob > 0.3 else "Healthy")
        })

    df = pd.DataFrame(data)
    
    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    return StreamingResponse(
        io.BytesIO(csv_buffer.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=predictive_maintenance_results.csv"}
    )
