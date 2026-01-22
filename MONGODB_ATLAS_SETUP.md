# MongoDB Atlas Configuration for Railway

## Current Setup
- **Cluster:** cluster0.6vbwfjv.mongodb.net
- **Database:** bilagh
- **User:** kamelbilagh

## Pre-Deployment Steps

### 1. Network Access (CRITICAL)
Railway needs to connect to your MongoDB Atlas cluster:

**Option A: Allow All IPs (Quick but less secure)**
1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere"
4. Add IP: `0.0.0.0/0`
5. Click "Confirm"

**Option B: Railway-Specific IPs (More secure)**
Railway uses dynamic IPs, so Option A is recommended for Railway deployments.

### 2. Database User (RECOMMENDED)
Create a dedicated production user:

1. Go to MongoDB Atlas → Database Access
2. Click "Add New Database User"
3. Create user:
   - Username: `bilagh_railway`
   - Password: Generate strong password
   - Database User Privileges: "Read and write to any database"
4. Click "Add User"

### 3. Update Connection String
After creating new user, update your connection string:

```env
# Old (current)
DATABASE_URL=mongodb+srv://kamelbilagh:kamelbilagh@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# New (recommended for production)
DATABASE_URL=mongodb+srv://bilagh_railway:YOUR_STRONG_PASSWORD@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

### 4. Test Connection Locally
Before deploying to Railway, test the connection:

```bash
cd backend
python -c "from database import client; print(client.server_info())"
```

Should print MongoDB server info without errors.

## Railway Environment Variables

Set these in Railway dashboard (Settings → Variables):

```env
DATABASE_URL=mongodb+srv://bilagh_railway:YOUR_PASSWORD@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
SECRET_KEY=your-secure-random-secret-key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Security Checklist

- [ ] Network Access configured for Railway
- [ ] Strong password for production database user
- [ ] Connection string uses production user (not default)
- [ ] SECRET_KEY is random and strong
- [ ] .env file is in .gitignore (don't push sensitive data)
- [ ] CLOUDINARY credentials are correct

## Common Issues

### "ServerSelectionTimeoutError"
**Cause:** Railway can't reach MongoDB Atlas
**Solution:** Check Network Access allows 0.0.0.0/0

### "Authentication failed"
**Cause:** Wrong username/password in connection string
**Solution:** Verify credentials in MongoDB Atlas → Database Access

### "SSL handshake failed"
**Cause:** SSL/TLS configuration issue
**Solution:** Ensure connection string includes `retryWrites=true&w=majority`

## After Deployment

### Test Backend Connection
```bash
# Replace with your Railway URL
curl https://your-app.up.railway.app/health

# Should return: {"status":"healthy"}
```

### Check Railway Logs
Go to Railway dashboard → Deployments → View Logs
Look for: "MongoDB client initialized for database: bilagh"

## MongoDB Atlas Free Tier Limits

- ✅ 512 MB storage
- ✅ Shared RAM
- ✅ Suitable for development/testing
- ⚠️ Upgrade to M10+ for production with real users

## Need Help?

If you see connection errors:
1. Check Railway logs for error messages
2. Verify MongoDB Atlas Network Access
3. Test connection string locally first
4. Ensure all environment variables are set in Railway
