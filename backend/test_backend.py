import os
import sys
import unittest
from sqlalchemy.orm import Session

# Add current folder to sys.path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.session import Base, engine, SessionLocal
from app.models.user import User
from app.models.machine import Machine
from app.models.sensor import SensorReading
from app.models.alert import Alert
from app.utils.security import get_password_hash, verify_password
from app.api.predict import fallback_rule_prediction
from app.utils.pdf_gen import generate_dashboard_report, generate_machine_report

class TestPredictiveBackend(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        # Initialize test tables (uses local sqlite if DATABASE_URL not overridden)
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        
    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        
    def test_01_user_seeding(self):
        """Test database connection, user seeding and password hashing"""
        db = self.db
        # Seed test admin
        admin_check = db.query(User).filter(User.username == "test_admin").first()
        if admin_check:
            db.delete(admin_check)
            db.commit()
            
        hashed_pw = get_password_hash("test_pwd_123")
        new_admin = User(username="test_admin", hashed_password=hashed_pw, role="admin")
        db.add(new_admin)
        db.commit()
        
        # Verify
        retrieved = db.query(User).filter(User.username == "test_admin").first()
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.role, "admin")
        self.assertTrue(verify_password("test_pwd_123", retrieved.hashed_password))
        self.assertFalse(verify_password("wrong_password", retrieved.hashed_password))
        
        # Clean up
        db.delete(retrieved)
        db.commit()

    def test_02_rules_based_prediction(self):
        """Test rules-based fallback logic for machine parameters"""
        # Nominal case: Healthy
        res_ok = fallback_rule_prediction(
            machine_type="L",
            air_temp=298.0,
            process_temp=308.5,
            rotational_speed=1500.0,
            torque=40.0,
            tool_wear=10.0
        )
        self.assertFalse(res_ok["is_failure"])
        self.assertLess(res_ok["failure_probability"], 0.30)
        self.assertEqual(res_ok["predicted_failure_type"], "No Failure")
        
        # Tool wear limit violation
        res_twf = fallback_rule_prediction(
            machine_type="L",
            air_temp=298.0,
            process_temp=308.5,
            rotational_speed=1500.0,
            torque=40.0,
            tool_wear=230.0
        )
        self.assertTrue(res_twf["is_failure"])
        self.assertGreater(res_twf["failure_probability"], 0.70)
        self.assertEqual(res_twf["predicted_failure_type"], "Tool Wear Failure (TWF)")
        
        # Heat dissipation failure (low temp diff < 8.6 AND low speed < 1380)
        res_hdf = fallback_rule_prediction(
            machine_type="M",
            air_temp=300.0,
            process_temp=308.0, # diff = 8.0 < 8.6
            rotational_speed=1300.0, # < 1380
            torque=40.0,
            tool_wear=10.0
        )
        self.assertTrue(res_hdf["is_failure"])
        self.assertEqual(res_hdf["predicted_failure_type"], "Heat Dissipation Failure (HDF)")

    def test_03_pdf_generation(self):
        """Test compiling ReportLab documents without crashing"""
        stats = {
            "total_machines": 10,
            "healthy_machines": 8,
            "warning_machines": 1,
            "critical_machines": 1,
            "overall_health": 92.5,
            "predicted_failures": 1,
            "active_alerts": 2
        }
        alerts = [
            {"product_id": "L47181", "type": "High Tool Wear", "message": "Tool wear exceeds limit", "severity": "critical", "timestamp": "2026-07-19 12:00:00"}
        ]
        
        # Build dashboard report
        try:
            pdf_buf = generate_dashboard_report(stats, alerts)
            self.assertIsNotNone(pdf_buf)
            self.assertTrue(len(pdf_buf.getvalue()) > 1000) # Should contain binary PDF data
        except Exception as e:
            self.fail(f"generate_dashboard_report failed with exception: {e}")

if __name__ == "__main__":
    unittest.main()
