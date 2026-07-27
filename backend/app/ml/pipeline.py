import os
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from typing import Dict, Any, Tuple, Optional

# Constants
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "trained_model"))
MODEL_PATH = os.path.join(MODEL_DIR, "model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

# Mapping from integer label to human-readable failure type name
LABEL_TO_FAILURE_TYPE = {
    0: "No Failure",
    1: "Tool Wear Failure (TWF)",
    2: "Heat Dissipation Failure (HDF)",
    3: "Power Failure (PWF)",
    4: "Overstrain Failure (OSF)",
    5: "Random Failure (RNF)",
    6: "Unknown Failure"
}

TYPE_MAPPING = {"L": 0, "M": 1, "H": 2}

def ensure_model_dir():
    os.makedirs(MODEL_DIR, exist_ok=True)

def preprocess_df(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Cleans, validates columns, maps categorical variables, and generates target labels.
    """
    # Standardize column names (stripping whitespace and removing brackets/dots if any, but let's do soft mapping)
    df_clean = df.copy()
    
    # Check for expected column patterns and rename for ease
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
    
    # Support slight variations in column names
    for col in df_clean.columns:
        for key, val in column_mapping.items():
            if key.lower() in col.lower():
                df_clean.rename(columns={col: val}, inplace=True)
                
    # Check required columns
    required = ["type", "air_temp", "process_temp", "rotational_speed", "torque", "tool_wear"]
    for req in required:
        if req not in df_clean.columns:
            raise ValueError(f"Missing required sensor column: {req}. Found columns: {list(df_clean.columns)}")

    # Clean missing values
    numeric_cols = ["air_temp", "process_temp", "rotational_speed", "torque", "tool_wear"]
    df_clean[numeric_cols] = df_clean[numeric_cols].apply(pd.to_numeric, errors='coerce')
    df_clean.dropna(subset=required, inplace=True)

    # Map Type
    df_clean["type_encoded"] = df_clean["type"].map(TYPE_MAPPING).fillna(1).astype(int) # Default to Medium if missing

    # Target Mapping
    # Determine the target column (is_failure)
    if "is_failure" not in df_clean.columns:
        # Default to 0 if target column not present
        df_clean["is_failure"] = 0

    # Map target multi-class label
    def get_label(row):
        if row.get("is_failure", 0) == 0:
            return 0
        if row.get("TWF", 0) == 1:
            return 1
        if row.get("HDF", 0) == 1:
            return 2
        if row.get("PWF", 0) == 1:
            return 3
        if row.get("OSF", 0) == 1:
            return 4
        if row.get("RNF", 0) == 1:
            return 5
        return 6 # Unknown failure if is_failure is 1 but no details

    df_clean["target_class"] = df_clean.apply(get_label, axis=1)

    features = df_clean[["type_encoded", "air_temp", "process_temp", "rotational_speed", "torque", "tool_wear"]]
    target = df_clean["target_class"]

    return features, target

def train_model(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Trains a Random Forest classifier on the dataset and saves the model.
    """
    ensure_model_dir()
    
    features, target = preprocess_df(df)
    
    if len(features) < 10:
        raise ValueError("Insufficient data to train the model. Need at least 10 rows.")
        
    # Check if we can stratify: all classes must have at least 5 members
    class_counts = target.value_counts()
    min_class_count = class_counts.min() if len(class_counts) > 0 else 0
    can_stratify = len(class_counts) > 1 and min_class_count >= 5

    X_train, X_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42, stratify=target if can_stratify else None
    )
    
    # Train Random Forest Classifier
    clf = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    clf.fit(X_train, y_train)
    
    # Evaluate model
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    # Compute precision, recall, f1 for overall and per-class
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
    
    metrics = {
        "accuracy": float(accuracy),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "samples_trained": int(len(features))
    }
    
    # Save model and metadata
    joblib.dump(clf, MODEL_PATH)
    
    with open(METADATA_PATH, "w") as f:
        json.dump(metrics, f)
        
    return metrics

def load_model() -> Optional[RandomForestClassifier]:
    """
    Loads the trained model from model.pkl.
    """
    if os.path.exists(MODEL_PATH):
        try:
            return joblib.load(MODEL_PATH)
        except Exception:
            return None
    return None

def load_metrics() -> Optional[Dict[str, Any]]:
    """
    Loads model training metadata.
    """
    if os.path.exists(METADATA_PATH):
        try:
            with open(METADATA_PATH, "r") as f:
                return json.load(f)
        except Exception:
            return None
    return None

def predict_failure(
    model: RandomForestClassifier, 
    machine_type: str, 
    air_temp: float, 
    process_temp: float, 
    rotational_speed: float, 
    torque: float, 
    tool_wear: float
) -> Dict[str, Any]:
    """
    Runs inference using the Random Forest classifier.
    """
    type_encoded = TYPE_MAPPING.get(machine_type.upper(), 1)
    
    # Prepare input array
    input_data = np.array([[type_encoded, air_temp, process_temp, rotational_speed, torque, tool_wear]])
    
    # Predict probabilities for each class
    probs = model.predict_proba(input_data)[0]
    
    # The probability of any failure is 1.0 - probability of class 0 (No Failure)
    # Ensure class 0 index exists
    no_failure_prob = probs[0] if len(probs) > 0 else 1.0
    failure_probability = float(1.0 - no_failure_prob)
    
    # Get overall predicted class
    pred_class_idx = int(np.argmax(probs))
    predicted_type = LABEL_TO_FAILURE_TYPE.get(pred_class_idx, "Unknown Failure")
    
    is_failure = bool(pred_class_idx != 0)
    
    return {
        "failure_probability": failure_probability,
        "predicted_failure_type": predicted_type,
        "is_failure": is_failure
    }
