import os
import shutil
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.machine import Machine
from app.models.sensor import SensorReading
from app.models.alert import Alert
from app.ml.pipeline import train_model, load_model, predict_failure, preprocess_df, TYPE_MAPPING
from app.utils.security import get_current_admin
from app.models.user import User

router = APIRouter(prefix="/upload-dataset", tags=["Dataset Upload"])

UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))

def ensure_upload_dir():
    os.makedirs(UPLOAD_DIR, exist_ok=True)


def process_and_import_dataset(df: pd.DataFrame, db: Session) -> dict:
    """
    Core dataset import logic: standardizes, cleans, trains model, clears tables,
    predicts failures, and imports machines/readings/alerts.
    """
    # Standardize column mappings
    column_mapping = {
        "Product ID": "product_id",
        "Type": "type",
        "Air temperature [K]": "air_temp",
        "Process temperature [K]": "process_temp",
        "Rotational speed [rpm]": "rotational_speed",
        "Torque [Nm]": "torque",
        "Tool wear [min]": "tool_wear",
        "Machine failure": "is_failure"
    }

    df_clean = df.copy()
    for col in df_clean.columns:
        for key, val in column_mapping.items():
            if key.lower() in col.lower():
                df_clean.rename(columns={col: val}, inplace=True)

    required = ["product_id", "type", "air_temp", "process_temp", "rotational_speed", "torque", "tool_wear"]
    for req in required:
        if req not in df_clean.columns:
            raise ValueError(f"CSV missing required column: {req}. Found: {list(df.columns)}")

    # Clean missing values
    df_clean = df_clean.dropna(subset=required)

    # 1. Train model on the dataset first so we can use the latest weights
    metrics = train_model(df)

    # Load the newly trained model
    model = load_model()
    if not model:
        raise ValueError("Failed to load trained model after fitting.")

    # 2. Clear existing database records
    db.query(Alert).delete()
    db.query(SensorReading).delete()
    db.query(Machine).delete()
    db.commit()

    # 3. Batch predict failure probabilities using the model
    df_clean["type_encoded"] = df_clean["type"].map(TYPE_MAPPING).fillna(1).astype(int)
    features = df_clean[["type_encoded", "air_temp", "process_temp", "rotational_speed", "torque", "tool_wear"]]
    
    # Predict
    probs = model.predict_proba(features)
    pred_classes = model.predict(features)
    
    # Add predicted columns
    df_clean["failure_prob"] = 1.0 - probs[:, 0]
    
    from app.ml.pipeline import LABEL_TO_FAILURE_TYPE
    df_clean["failure_type"] = [LABEL_TO_FAILURE_TYPE.get(c, "Unknown Failure") for c in pred_classes]
    df_clean["is_failure"] = [bool(c != 0) for c in pred_classes]

    # 4. Insert Machines
    unique_pids = df_clean["product_id"].unique()
    machines_to_insert = []
    for pid in unique_pids:
        m_type = pid[0] if pid[0] in ["L", "M", "H"] else "M"
        machines_to_insert.append(Machine(product_id=pid, type=m_type))
        
    db.bulk_save_objects(machines_to_insert)
    db.commit()

    # 5. Insert Sensor Readings
    sensor_readings_dicts = []
    import datetime
    base_time = datetime.datetime.utcnow() - datetime.timedelta(days=2) # start history 2 days ago
    
    for idx, row in df_clean.iterrows():
        timestamp = base_time + datetime.timedelta(seconds=idx * 15)
        
        sensor_readings_dicts.append({
            "product_id": row["product_id"],
            "timestamp": timestamp,
            "air_temp": float(row["air_temp"]),
            "process_temp": float(row["process_temp"]),
            "rotational_speed": float(row["rotational_speed"]),
            "torque": float(row["torque"]),
            "tool_wear": float(row["tool_wear"]),
            "failure_prob": float(row["failure_prob"]),
            "failure_type": str(row["failure_type"]),
            "is_failure": bool(row["is_failure"])
        })
        
    db.bulk_insert_mappings(SensorReading, sensor_readings_dicts)
    db.commit()

    # 6. Generate Alerts
    alerts_to_insert = []
    for idx, row in df_clean.iterrows():
        prob = float(row["failure_prob"])
        tool_wear = float(row["tool_wear"])
        air_temp = float(row["air_temp"])
        process_temp = float(row["process_temp"])
        speed = float(row["rotational_speed"])
        torque = float(row["torque"])
        pid = row["product_id"]
        
        timestamp = base_time + datetime.timedelta(seconds=idx * 15)
        
        if prob > 0.7:
            alerts_to_insert.append(Alert(
                product_id=pid,
                timestamp=timestamp,
                type="High Failure Risk",
                message=f"Machine failure probability is high ({prob * 100:.1f}%). Predicted type: {row['failure_type']}.",
                severity="critical",
                is_resolved=False
            ))
        elif tool_wear > 200:
            alerts_to_insert.append(Alert(
                product_id=pid,
                timestamp=timestamp,
                type="High Tool Wear",
                message=f"Tool wear limit exceeded: {tool_wear:.1f} min (limit: 200 min).",
                severity="critical",
                is_resolved=False
            ))
        elif air_temp > 303:
            alerts_to_insert.append(Alert(
                product_id=pid,
                timestamp=timestamp,
                type="Air Temp High",
                message=f"Air temperature exceeds threshold: {air_temp:.1f} K.",
                severity="warning",
                is_resolved=False
            ))
        elif process_temp > 313:
            alerts_to_insert.append(Alert(
                product_id=pid,
                timestamp=timestamp,
                type="Process Temp High",
                message=f"Process temperature exceeds threshold: {process_temp:.1f} K.",
                severity="warning",
                is_resolved=False
            ))
        elif speed < 1200 or speed > 2200:
            alerts_to_insert.append(Alert(
                product_id=pid,
                timestamp=timestamp,
                type="Abnormal RPM",
                message=f"Rotational speed out of range: {speed:.0f} rpm.",
                severity="warning",
                is_resolved=False
            ))
        elif torque < 15 or torque > 65:
            alerts_to_insert.append(Alert(
                product_id=pid,
                timestamp=timestamp,
                type="Abnormal Torque",
                message=f"Torque out of range: {torque:.1f} Nm.",
                severity="warning",
                is_resolved=False
            ))
            
    alerts_to_insert.sort(key=lambda x: x.timestamp, reverse=True)
    db.bulk_save_objects(alerts_to_insert[:500])
    db.commit()

    return {
        "message": "Dataset uploaded and processed successfully.",
        "records_imported": len(df_clean),
        "model_metrics": metrics
    }

@router.post("")
def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Uploads a new CSV dataset. Validates columns, imports data,
    retrains the ML model, updates prediction results, and triggers alerts.
    """
    ensure_upload_dir()
    
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CSV structure: {str(e)}")

    try:
        result = process_and_import_dataset(df, db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
