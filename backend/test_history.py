import traceback
from app.database.session import SessionLocal
from app.api.history import get_machine_history
from app.api.machines import get_machine_detail

db = SessionLocal()
try:
    # 1. Fetch a machine product ID
    from app.models.machine import Machine
    machine = db.query(Machine).first()
    
    if not machine:
        print("ERROR: Database has no machines. Please upload a dataset first.")
        exit(1)
        
    machine_id = machine.product_id
    print(f"Testing diagnostics for Machine: {machine_id}")
    
    # 2. Get machine detail
    print("Calling get_machine_detail...")
    detail = get_machine_detail(machine_id, db)
    print("Detail keys:", list(detail.keys()))
    print("Detail status:", detail.get("health_score"), detail.get("predicted_failure_type"))
    
    # 3. Get machine history
    print("Calling get_machine_history...")
    history = get_machine_history(machine_id, db)
    print(f"History returned: {len(history)} records.")
    if len(history) > 0:
        first = history[0]
        # print some fields
        print("First reading fields: temp =", first.air_temp, "speed =", first.rotational_speed, "prob =", first.failure_prob)
        
    print("SUCCESS! Backend APIs for machine details and history are working perfectly.")
except Exception as e:
    print("FAILED with exception:")
    traceback.print_exc()
finally:
    db.close()
