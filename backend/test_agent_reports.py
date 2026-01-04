import requests
import json

BASE_URL = "http://localhost:8000"
EMAIL = "agent@bilagh.dz"
PASSWORD = "agent123"

def test_agent_reports():
    # 1. Login
    print(f"Logging in as {EMAIL}...")
    try:
        response = requests.post(f"{BASE_URL}/token", data={
            "username": EMAIL,
            "password": PASSWORD
        })
        
        if response.status_code != 200:
            print(f"Login failed: {response.status_code} {response.text}")
            return
        
        token = response.json()["access_token"]
        print("Login successful.")
        
        # 2. Fetch Agent Reports
        print("Fetching agent reports...")
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/agent/reports", headers=headers)
        
        if response.status_code == 200:
            reports = response.json()
            print(f"Success! Fetched {len(reports)} reports.")
            if len(reports) > 0:
                print("First report sample:")
                print(json.dumps(reports[0], indent=2))
        else:
            print(f"Failed to fetch reports: {response.status_code} {response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_agent_reports()
