"""
Test Login and Registration API
"""
import requests
import json

BASE_URL = "http://192.168.2.224:8000"

def test_register():
    """Test user registration"""
    print("\n" + "="*60)
    print("TEST 1: USER REGISTRATION")
    print("="*60)
    
    data = {
        "email": "test@bilagh.com",
        "username": "testuser",
        "full_name": "Test User",
        "password": "test123456"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/register", json=data)
        print(f"\n📤 Request: POST /register")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 201:
            user = response.json()
            print(f"✅ SUCCESS! User created:")
            print(f"   ID: {user['id']}")
            print(f"   Email: {user['email']}")
            print(f"   Username: {user['username']}")
            print(f"   Full Name: {user['full_name']}")
            print(f"   Points: {user['points']}")
            print(f"   Role: {user['role']}")
            return True
        else:
            error = response.json()
            print(f"❌ FAILED: {error.get('detail', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_login():
    """Test user login"""
    print("\n" + "="*60)
    print("TEST 2: USER LOGIN")
    print("="*60)
    
    data = {
        "username": "test@bilagh.com",  # FastAPI OAuth2 uses 'username' field
        "password": "test123456"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data=data,  # Form data, not JSON
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"\n📤 Request: POST /token")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            print(f"✅ SUCCESS! Login successful:")
            print(f"   Access Token: {token_data['access_token'][:50]}...")
            print(f"   Token Type: {token_data['token_type']}")
            return token_data['access_token']
        else:
            error = response.json()
            print(f"❌ FAILED: {error.get('detail', 'Unknown error')}")
            return None
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return None

def test_get_user(token):
    """Test getting current user info"""
    print("\n" + "="*60)
    print("TEST 3: GET CURRENT USER")
    print("="*60)
    
    try:
        response = requests.get(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        print(f"\n📤 Request: GET /users/me")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            user = response.json()
            print(f"✅ SUCCESS! User info retrieved:")
            print(f"   ID: {user['id']}")
            print(f"   Email: {user['email']}")
            print(f"   Username: {user['username']}")
            print(f"   Full Name: {user['full_name']}")
            print(f"   Points: {user['points']}")
            return True
        else:
            error = response.json()
            print(f"❌ FAILED: {error.get('detail', 'Unknown error')}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_wrong_password():
    """Test login with wrong password"""
    print("\n" + "="*60)
    print("TEST 4: LOGIN WITH WRONG PASSWORD")
    print("="*60)
    
    data = {
        "username": "test@bilagh.com",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/token",
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        print(f"\n📤 Request: POST /token (wrong password)")
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 401:
            print(f"✅ SUCCESS! Correctly rejected wrong password")
            return True
        else:
            print(f"❌ FAILED: Should have rejected wrong password")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("\n" + "🚀"*30)
    print("BILAGH API AUTHENTICATION TESTS")
    print("🚀"*30)
    print(f"\n🔗 Testing API at: {BASE_URL}")
    
    # Test 1: Register
    register_success = test_register()
    
    # Test 2: Login
    if register_success:
        token = test_login()
        
        # Test 3: Get user info
        if token:
            test_get_user(token)
        
        # Test 4: Wrong password
        test_wrong_password()
    
    print("\n" + "="*60)
    print("🏁 TESTS COMPLETE!")
    print("="*60)
    print("\n💡 TIP: Check your PostgreSQL database:")
    print("   psql -U postgres -d bilagh -c \"SELECT * FROM users;\"")

if __name__ == "__main__":
    main()
