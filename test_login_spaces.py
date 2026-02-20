import requests

def test_login_spaces():
    url = "http://172.20.10.2:8000/token"
    payload = {
        "username": "test@bilagh.dz        ",
        "password": "test123"
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }
    
    try:
        print(f"Testing URL: {url} with spaces in username")
        response = requests.post(url, data=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response Body:", response.text)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_login_spaces()
