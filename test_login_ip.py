import requests

def test_login():
    url = "http://192.168.2.224:8000/token"
    payload = {
        "username": "test@bilagh.dz",
        "password": "test123"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }
    
    try:
        print(f"Testing URL: {url}")
        response = requests.post(url, data=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response Headers:", response.headers)
        if 'application/json' in response.headers.get('Content-Type', ''):
             print("Response JSON:", response.json())
        else:
             print("Response Text:", response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login()
