import urllib.request
import urllib.parse
import json

url = "http://localhost:8000/api"

try:
    # 1. Log in
    print("Logging in...")
    login_url = f"{url}/auth/login"
    login_data = urllib.parse.urlencode({
        "username": "admin",
        "password": "admin123"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        login_url,
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    with urllib.request.urlopen(req) as resp:
        login_resp = json.loads(resp.read().decode('utf-8'))
        token = login_resp["access_token"]
        
    print("Login successful.")

    # 2. Get dashboard stats
    print("Fetching dashboard stats...")
    dash_req = urllib.request.Request(
        f"{url}/dashboard",
        headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(dash_req) as resp:
        print("Dashboard status:", resp.status)
        print("Dashboard content:", resp.read().decode('utf-8'))
        
except Exception as e:
    print("Error:")
    print(e)
