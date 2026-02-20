import requests

def test_login():
    url = "http://localhost:8000/token"
    payload = {
        "username": "test@bilagh.dz",
        "password": "test123"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        response = requests.post(url, data=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:", response.headers)
        print("Response Body:", response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
