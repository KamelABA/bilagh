import requests

# 1. Login to get token
login_url = "http://127.0.0.1:8000/token"
response = requests.post(login_url, data={"username": "testuser@example.com", "password": "password123"})
if response.status_code != 200:
    print(f"Login failed: {response.text}")
    
    # Try creating one
    res = requests.post("http://127.0.0.1:8000/register", json={
        "email": "testuser@example.com",
        "username": "testuser",
        "password": "password123",
        "full_name": "Test User",
        "phone": "123456"
    })
    print("Registered user:", res.text)
    
    response = requests.post(login_url, data={"username": "testuser@example.com", "password": "password123"})
    print("Login after register:", response.status_code)

token = response.json().get("access_token")

# 2. Get map reports
map_url = "http://127.0.0.1:8000/reports/map"
headers = {"Authorization": f"Bearer {token}"}

res = requests.get(map_url, headers=headers)
print(f"Map status: {res.status_code}")
if res.status_code == 200:
    data = res.json()
    print(f"Loaded {len(data)} reports from /reports/map")
    if len(data) > 0:
        print("Sample report keys:", data[0].keys())
else:
    print(f"Map error: {res.text}")
