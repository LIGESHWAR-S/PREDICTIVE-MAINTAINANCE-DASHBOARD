import os
import sqlite3

db_path = "backend/predictive_maintenance.db"

if not os.path.exists(db_path):
    print(f"Database file not found at: {db_path}")
    print("Please make sure you have run the backend server first to initialize the database.")
    exit(1)

print(f"Connecting to database at: {db_path}...\n")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Fetch tables
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [row[0] for row in cursor.fetchall() if not row[0].startswith("sqlite_")]

print("=== DATABASE TABLES ===")
for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"Table: {table:<18} | Total Records: {count}")
print("=======================\n")

# 2. Show sample users
print("=== SAMPLE USERS ===")
cursor.execute("SELECT id, username, role FROM users LIMIT 5;")
for row in cursor.fetchall():
    print(f"ID: {row[0]:<2} | Username: {row[1]:<10} | Role: {row[2]}")
print("====================\n")

# 3. Show sample machines
print("=== SAMPLE MONITORED ASSETS (MACHINES) ===")
cursor.execute("SELECT product_id, type, last_updated FROM machines LIMIT 5;")
rows = cursor.fetchall()
if not rows:
    print("No machines found. Please upload a dataset first.")
else:
    for row in rows:
        print(f"Machine ID: {row[0]:<10} | Type: {row[1]:<2} | Last Updated: {row[2]}")
print("==========================================\n")

# 4. Show sample sensor readings
print("=== SAMPLE SENSOR HISTORY & PREDICTIONS ===")
cursor.execute("SELECT product_id, timestamp, air_temp, rotational_speed, failure_prob, failure_type FROM sensor_readings LIMIT 5;")
rows = cursor.fetchall()
if not rows:
    print("No sensor readings found. Please upload a dataset first.")
else:
    for row in rows:
        print(f"Asset: {row[0]:<10} | Time: {row[1]} | Temp: {row[2]}K | Speed: {row[3]}rpm | Failure Risk: {row[4]*100:.1f}% | Type: {row[5]}")
print("===========================================\n")

conn.close()
