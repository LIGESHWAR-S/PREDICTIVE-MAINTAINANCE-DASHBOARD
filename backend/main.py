import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database.session import engine, Base, SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash

# Import routers
from app.api import auth, dashboard, machines, predict, alerts, analytics, history, upload, retrain

app = FastAPI(
    title="Predictive Monitoring Dashboard API",
    description="Backend API services for machine predictive maintenance",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development ease
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed Database with default Admin/User
def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        # Check if admin exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            hashed_pw = get_password_hash("admin123")
            admin_user = User(username="admin", hashed_password=hashed_pw, role="admin")
            db.add(admin_user)
            print("Seeded default admin user (admin / admin123)")

        # Check if regular user exists
        regular_user = db.query(User).filter(User.username == "user").first()
        if not regular_user:
            hashed_pw = get_password_hash("user123")
            regular_user = User(username="user", hashed_password=hashed_pw, role="user")
            db.add(regular_user)
            print("Seeded default standard user (user / user123)")
            
        db.commit()
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    seed_database()
    # Create upload directory if it doesn't exist
    os.makedirs(os.path.join(os.path.dirname(__file__), "uploads"), exist_ok=True)
    os.makedirs(os.path.join(os.path.dirname(__file__), "trained_model"), exist_ok=True)
    
    # Auto-detect and import CSV if DB is empty
    db = SessionLocal()
    try:
        from app.models.machine import Machine
        if db.query(Machine).count() == 0:
            print("Database is empty. Checking for CSV to auto-import...")
            search_dirs = [
                os.path.join(os.path.dirname(__file__), "uploads"),
                os.path.dirname(__file__),
                os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
            ]
            csv_file = None
            for d in search_dirs:
                if not os.path.exists(d):
                    continue
                for f in os.listdir(d):
                    if f.endswith(".csv"):
                        csv_file = os.path.join(d, f)
                        break
                if csv_file:
                    break
            
            if csv_file:
                print(f"Found CSV for auto-import: {csv_file}. Processing...")
                import pandas as pd
                from app.api.upload import process_and_import_dataset
                df = pd.read_csv(csv_file)
                res = process_and_import_dataset(df, db)
                print(f"Auto-import successful: {res.get('records_imported')} records imported.")
            else:
                print("No CSV file found to auto-import.")
        else:
            print("Database already contains records. Skipping auto-import.")
    except Exception as e:
        print(f"Error during auto-import: {e}")
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Predictive Monitoring Dashboard API is running."}

# Register Routers
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(machines.router, prefix="/api")
app.include_router(predict.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(retrain.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
