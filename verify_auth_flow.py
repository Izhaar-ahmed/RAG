import requests
import io

BASE_URL = "http://127.0.0.1:8000"
TEST_EMAIL = "senior.eng@example.com"
TEST_PASS = "securepassword123"

def run_test():
    print(f"Testing Enterprise Auth Flow at {BASE_URL}...")
    
    # 1. Register
    print("\n[1] Registering User...")
    try:
        reg_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": TEST_EMAIL, 
            "password": TEST_PASS, 
            "full_name": "Senior Engineer"
        })
        if reg_resp.status_code == 200:
            print("✅ Registration Successful")
        elif reg_resp.status_code == 400 and "already registered" in reg_resp.text:
            print("⚠️ User already registered (skipping)")
        else:
            print(f"❌ Registration Failed: {reg_resp.text}")
            return
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return

    # 2. Login
    print("\n[2] Logging In...")
    login_resp = requests.post(f"{BASE_URL}/token", data={
        "username": TEST_EMAIL,  # OAuth2 expects 'username' field
        "password": TEST_PASS
    })
    
    if login_resp.status_code != 200:
        print(f"❌ Login Failed: {login_resp.text}")
        return
        
    token = login_resp.json()["access_token"]
    print(f"✅ Login Successful. Token: {token[:15]}...")
    
    auth_headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Test Protected Endpoint (List Docs) without Token
    print("\n[3] Testing Unauthorized Access...")
    unauth_resp = requests.get(f"{BASE_URL}/documents")
    if unauth_resp.status_code == 401:
        print("✅ Access Denied (Expected)")
    else:
        print(f"❌ Protected Route Failed (Got {unauth_resp.status_code})")
    
    # 4. Test Protected Endpoint WITH Token
    print("\n[4] Testing Authorized Access...")
    auth_resp = requests.get(f"{BASE_URL}/documents", headers=auth_headers)
    if auth_resp.status_code == 200:
        print("✅ Access Granted")
    else:
        print(f"❌ Access Failed: {auth_resp.text}")

    # 5. Test Upload
    print("\n[5] Testing Secure Upload...")
    files = {'file': ('test_secure.txt', io.BytesIO(b"Confidential data"), 'text/plain')}
    upload_resp = requests.post(f"{BASE_URL}/upload", headers=auth_headers, files=files)
    if upload_resp.status_code == 200:
        print("✅ Upload Successful")
    else:
        print(f"❌ Upload Failed: {upload_resp.text}")

    print("\n🎉 Enterprise Verification Complete!")

if __name__ == "__main__":
    run_test()
