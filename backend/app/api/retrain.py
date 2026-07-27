from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import pandas as pd
from app.database.session import get_db
from app.models.sensor import SensorReading
from app.ml.pipeline import train_model, load_metrics
from app.utils.security import get_current_admin, get_current_user
from app.models.user import User

router = APIRouter(tags=["Model Lifecycle"])

@router.post("/retrain-model")
@router.post("/model/retrain")
def retrain_model(db: Session = Depends(get_db), current_user: User = Depends(get_current_admin)):
    """
    Manually triggers model retraining on the current dataset loaded in the database.
    Requires Admin role.
    """
    # Fetch all sensor readings from the database
    readings = db.query(SensorReading).all()
    if not readings:
        raise HTTPException(
            status_code=400, 
            detail="No sensor readings available in the database to train the model. Please upload a dataset first."
        )

    # Convert to DataFrame
    data = []
    for r in readings:
        # Standardize columns to match raw CSV mapping expected by pipeline.preprocess_df
        # We need: product_id, type, air_temp, process_temp, rotational_speed, torque, tool_wear, is_failure
        # And also failure type indicator flags (TWF, HDF, PWF, OSF, RNF) based on failure_type
        row = {
            "Product ID": r.product_id,
            "Type": r.product_id[0], # L, M, or H
            "Air temperature [K]": r.air_temp,
            "Process temperature [K]": r.process_temp,
            "Rotational speed [rpm]": r.rotational_speed,
            "Torque [Nm]": r.torque,
            "Tool wear [min]": r.tool_wear,
            "Machine failure": 1 if r.is_failure else 0,
            "TWF": 1 if "tool wear" in r.failure_type.lower() else 0,
            "HDF": 1 if "heat dissipation" in r.failure_type.lower() else 0,
            "PWF": 1 if "power" in r.failure_type.lower() else 0,
            "OSF": 1 if "overstrain" in r.failure_type.lower() else 0,
            "RNF": 1 if "random" in r.failure_type.lower() else 0,
        }
        data.append(row)

    df = pd.DataFrame(data)

    try:
        metrics = train_model(df)
        return {
            "message": "Model retrained successfully.",
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model retraining failed: {str(e)}")

@router.get("/model-status")
@router.get("/model/status")
def get_model_status(current_user: User = Depends(get_current_user)):
    """
    Returns metrics of the currently active machine learning model.
    """
    metrics = load_metrics()
    if not metrics:
        return {
            "trained": False,
            "message": "No trained model found. Running on rules-based fallback."
        }
    return {
        "trained": True,
        "metrics": metrics
    }
