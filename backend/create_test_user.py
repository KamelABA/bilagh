"""
Create a test user in the database
"""
import requests

BASE_URL = "http://192.168.2.224:8000"

print("\n" + "="*60)
print("CREATING TEST USER")
print("="*60)

# Create user
user_data = {
    "email": "test@bilagh.com",
    "username": "testuser",
    "full_name": "Test User",
    "password": "123456"
}

print(f"\n📤 Creating user: {user_data['email']}")

try:
    response = requests.post(f"{BASE_URL}/register", json=user_data)
    
    if response.status_code == 201:
        user = response.json()
        print(f"\n✅ SUCCESS! User created:")
        print(f"   ID: {user['id']}")
        print(f"   Email: {user['email']}")
        print(f"   Username: {user['username']}")
        print(f"   Full Name: {user['full_name']}")
        print(f"   Points: {user['points']}")
        
        print(f"\n🔑 Login credentials:")
        print(f"   Email: test@bilagh.com")
        print(f"   Password: 123456")
        
        # Now test login
        print(f"\n" + "="*60)
        print("TESTING LOGIN")
        print("="*60)
        
        login_data = {
            "username": "test@bilagh.com",
            "password": "123456"
        }
        
        login_response = requests.post(
            f"{BASE_URL}/token",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            print(f"\n✅ LOGIN SUCCESS!")
            print(f"   Token: {token_data['access_token'][:50]}...")
            print(f"   Type: {token_data['token_type']}")
        else:
            print(f"\n❌ LOGIN FAILED: {login_response.json()}")
            
    else:
        error = response.json()
        print(f"\n❌ FAILED: {error.get('detail', 'Unknown error')}")
        
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print(f"\n💡 Make sure:")
    print(f"   1. Backend is running: python main.py")
    print(f"   2. requests library installed: pip install requests")

print("\n" + "="*60)
