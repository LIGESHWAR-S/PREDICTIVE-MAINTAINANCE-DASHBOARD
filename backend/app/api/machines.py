from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database.session import get_db
from app.models.machine import Machine
from app.models.sensor import SensorReading
from app.schemas.sensor import MachineDetailResponse, SensorReadingResponse
from app.utils.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/machines", tags=["Machines"])

def get_recommendation_and_rul(prob: float, fail_type: str, tool_wear: float, air_temp: float) -> tuple[str, float]:
    """
    Helper to calculate remaining useful life and generate maintenance advice.
    """
    # Estimate RUL based on tool wear (max 250 mins)
    estimated_rul = max(0.0, 250.0 - tool_wear)
    
    # Generate recommendations
    if prob > 0.7:
        recommendation = "CRITICAL: Immediate shutdown recommended. High risk of failure. Inspect the tool, verify torque load, and check cooling system."
    elif "tool wear" in fail_type.lower() or tool_wear > 180:
        recommendation = "PREVENTIVE: Tool wear is critical (exceeding 180 min). Schedule immediate tool replacement to prevent surface damage."
    elif "heat dissipation" in fail_type.lower() or air_temp > 303:
        recommendation = "PREVENTIVE: Thermal dissipation warning. Inspect cooling fans, clean debris, or check coolant level."
    elif "power" in fail_type.lower():
        recommendation = "PREVENTIVE: Power deviation alert. Verify motor electrical supply and ensure torque matches rotational speed."
    elif "overstrain" in fail_type.lower():
        recommendation = "PREVENTIVE: Structural overstrain warning. Reduce torque load or operational speed."
    elif prob > 0.3:
        recommendation = "MONITOR: Elevated failure risk. Inspect mechanical links and schedule routine maintenance at next shift change."
    else:
        recommendation = "NOMINAL: Asset is operating within standard parameters. Continue routine inspection schedule."
        
    return recommendation, estimated_rul

@router.get("", response_model=dict)
def get_machines(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Search by Machine ID"),
    type: Optional[str] = Query(None, description="Filter by Machine Type (L, M, H)"),
    status: Optional[str] = Query(None, description="Filter by Status (Healthy, Warning, Critical)"),
    sort_by: Optional[str] = Query("product_id", description="Sort by product_id, health_score, or failure_probability"),
    sort_order: Optional[str] = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100)
):
    """
    Retrieves all machines with search, filters, sorting, and pagination.
    """
    # Base query: join machines and their latest sensor readings
    latest_reading_subquery = db.query(func.max(SensorReading.timestamp))\
        .filter(SensorReading.product_id == Machine.product_id)\
        .correlate(Machine)\
        .scalar_subquery()

    query = db.query(Machine, SensorReading).outerjoin(
        SensorReading,
        (Machine.product_id == SensorReading.product_id) &
        (SensorReading.timestamp == latest_reading_subquery)
    )

    # Apply search filter
    if search:
        query = query.filter(Machine.product_id.ilike(f"%{search}%"))

    # Apply machine type filter
    if type:
        query = query.filter(Machine.type == type.upper())

    # Apply status filter
    if status:
        status_lower = status.lower()
        if status_lower == "critical":
            query = query.filter((SensorReading.failure_prob > 0.7) | (SensorReading.is_failure == True))
        elif status_lower == "warning":
            query = query.filter((SensorReading.failure_prob > 0.3) & (SensorReading.failure_prob <= 0.7) & (SensorReading.is_failure == False))
        elif status_lower == "healthy":
            query = query.filter((SensorReading.failure_prob <= 0.3) & (SensorReading.is_failure == False))

    # Fetch results first to perform custom calculations (like health_score which is dynamic)
    results = query.all()

    # Map database models to dictionaries for sorting/manipulating
    machines_list = []
    for m, r in results:
        prob = r.failure_prob if r else 0.0
        health = (1.0 - prob) * 100.0
        
        # Status Label
        stat = "Healthy"
        if prob > 0.7 or (r and r.is_failure):
            stat = "Critical"
        elif prob > 0.3:
            stat = "Warning"

        machines_list.append({
            "product_id": m.product_id,
            "type": m.type,
            "last_updated": m.last_updated,
            "latest_reading": SensorReadingResponse.from_orm(r) if r else None,
            "failure_probability": prob,
            "health_score": health,
            "status": stat
        })

    # Apply sorting
    reverse = (sort_order.lower() == "desc")
    if sort_by == "health_score":
        machines_list.sort(key=lambda x: x["health_score"], reverse=reverse)
    elif sort_by == "failure_probability":
        machines_list.sort(key=lambda x: x["failure_probability"], reverse=reverse)
    else:
        machines_list.sort(key=lambda x: x["product_id"], reverse=reverse)

    # Paginate
    total = len(machines_list)
    start = (page - 1) * limit
    end = start + limit
    paginated_data = machines_list[start:end]

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "data": paginated_data
    }

@router.get("/{id}", response_model=MachineDetailResponse)
def get_machine_detail(id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves detailed info, health score, RUL, and recommendations for a single machine.
    """
    machine = db.query(Machine).filter(Machine.product_id == id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Machine not found")

    # Get latest reading
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
        health_score = min(health_score, 10.0) # Force low health if failed

    recommendation, estimated_rul = get_recommendation_and_rul(prob, fail_type, tool_wear, air_temp)

    return {
        "product_id": machine.product_id,
        "type": machine.type,
        "last_updated": machine.last_updated,
        "latest_reading": SensorReadingResponse.from_orm(latest_reading) if latest_reading else None,
        "health_score": health_score,
        "failure_probability": prob,
        "predicted_failure_type": fail_type,
        "maintenance_recommendation": recommendation,
        "estimated_rul": estimated_rul
    }
