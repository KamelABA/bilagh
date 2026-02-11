# Network Connectivity Fix for Login Issue

## PROBLEM IDENTIFIED ✅

The mobile app is trying to connect to the backend, but the request **times out after 30 seconds**. The backend server shows **no incoming requests**, which means:

**The phone cannot reach the backend server at `http://192.168.2.224:8000`**

---

## IMMEDIATE SOLUTIONS

### Solution 1: Allow Backend Through Windows Firewall (MOST LIKELY FIX)

Windows Firewall is probably blocking incoming connections on port 8000. Here's how to fix it:

1. **Press Windows + R**, type: `wf.msc` and press Enter
2. Click "Inbound Rules" in the left panel
3. Click "New Rule..." in the right panel
4. Select "Port" → Next
5. Select "TCP" → Specific local ports: `8000` → Next
6. Select "Allow the connection" → Next
7. Check all boxes (Domain, Private, Public) → Next
8. Name: `Python Backend Port 8000` → Finish

**OR Quick Test - Temporarily Disable Firewall:**
1. Press Windows + S
2. Type "Windows Defender Firewall"
3. Click "Turn Windows Defender Firewall on or off"
4. Select "Turn off" for both Private and Public
5. Click OK
6. Try logging in again

⚠️ **Remember to re-enable the firewall after testing!**

---

### Solution 2: Verify Same WiFi Network

1. **On Computer:**
   - Open Command Prompt
   - Run: `ipconfig`
   - Look for "Wireless LAN adapter Wi-Fi"
   - Note the IPv4 Address (should be 192.168.2.224)

2. **On Phone:**
   - Open Settings → WiFi
   - Note the network name you're connected to
   - Tap the (i) icon next to your WiFi name
   - Look at IP Address - it should start with `192.168.2.x`

**If phone IP doesn't start with `192.168.2.x`, you're on a different network!**

---

### Solution 3: Test Backend Accessibility from Phone

**Before trying to login again, test if the phone can reach the server:**

1. Open **Safari/Chrome browser on your phone**
2. Go to: `http://192.168.2.224:8000`
3. You should see:
   ```json
   {"message":"Welcome to Bilagh API (MongoDB)","version":"1.0.0"}
   ```

**Results:**
- ✅ **If you see the message:** Backend is accessible! The issue is in the app.
- ❌ **If you get "Cannot connect" or timeout:** Network/firewall issue (use Solution 1 or 2)

---

### Solution 4: Use localhost Tunnel (Alternative)

If firewall/network issues persist, use `ngrok` to create a public URL:

1. Download ngrok: https://ngrok.com/download
2. Extract and run:
   ```bash
   ngrok http 8000
   ```
3. Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)
4. Update `constants/api.ts`:
   ```typescript
   const DEV_API_URL = 'https://abc123.ngrok.io';
   ```
5. Restart Expo
6. Try login again

---

## RECOMMENDED STEPS (In Order)

### Step 1: Quick Firewall Test
1. Temporarily disable Windows Firewall
2. Try logging in from mobile app
3. **If it works:** Re-enable firewall and create exception for port 8000 (see Solution 1)
4. **If it still fails:** Continue to Step 2

### Step 2: Verify Network
1. Check both devices are on same WiFi
2. Both IPs should start with `192.168.2.x`
3. **If not:** Connect to the same WiFi network

### Step 3: Test from Phone Browser
1. Open browser on phone
2. Visit: `http://192.168.2.224:8000`
3. **If you see JSON message:** Network is fine, issue might be in app
4. **If timeout:** Network/firewall issue confirmed

### Step 4: Create Firewall Exception
Follow Solution 1 to permanently allow port 8000

---

## Expected Result After Fix

When you try to login after fixing the network issue, you should see in the backend console:

```
INFO: 192.168.x.x:xxxxx - "POST /token HTTP/1.1" 200 OK
INFO: 192.168.x.x:xxxxx - "GET /users/me HTTP/1.1" 200 OK
```

And in the mobile app console:
```
LOGIN: Sending request to backend...
LOGIN: Got response, status: 200
LOGIN: Response data: {access_token: "...", ...}
LOGIN: Login successful!
```

---

## Still Not Working?

If none of these work, try this diagnostic:

**From your computer, run:**
```bash
curl http://localhost:8000
```

Should return: `{"message":"Welcome to Bilagh API (MongoDB)"...}`

**If this doesn't work, the backend itself has an issue.**

---

**TL;DR: The #1 most likely issue is Windows Firewall blocking port 8000. Try disabling it temporarily to test.**
