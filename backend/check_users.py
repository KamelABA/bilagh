"""
Check users in database
"""
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port="5432",
        user="postgres",
        password="postgre14",
        database="bilagh"
    )
    cursor = conn.cursor()
    
    # Get all users
    cursor.execute("SELECT id, email, username, full_name, points, created_at FROM users;")
    users = cursor.fetchall()
    
    print("\n" + "="*60)
    print("USERS IN DATABASE")
    print("="*60)
    
    if users:
        print(f"\n📊 Total users: {len(users)}\n")
        for user in users:
            print(f"ID: {user[0]}")
            print(f"Email: {user[1]}")
            print(f"Username: {user[2]}")
            print(f"Full Name: {user[3]}")
            print(f"Points: {user[4]}")
            print(f"Created: {user[5]}")
            print("-" * 60)
    else:
        print("\n❌ No users found in database!")
        print("\n💡 You need to create a user first:")
        print("   1. Go to http://192.168.2.224:8000/docs")
        print("   2. Use POST /register endpoint")
        print("   3. Or use the signup screen in your app")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Error: {e}")
