# 🎯 Railway Deployment with MongoDB Atlas

## ✅ Completed
- [x] Removed all unnecessary files (logs, databases, test scripts)
- [x] Removed large model files (22MB .keras, 6MB .pt)
- [x] Updated .gitignore files
- [x] Simplified README documentation
- [x] Cleaned backend directory (17 files remaining)

## 📋 Next Steps

### 1️⃣ Install Git (if needed)
```bash
# Download from: https://git-scm.com/download/win
# After installation, configure:
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 2️⃣ Push to GitHub
```bash
cd c:\Users\still\Documents\GitHub\bilagh

# Check status
git status

# Add all files
git add .

# Commit changes
git commit -m "Clean project for production deployment"

# Push to GitHub
git push origin main
```

### 3️⃣ Deploy Backend to Railway

**A. Create Railway Account**
- Go to https://railway.app
- Sign up with GitHub

**B. Create New Project**
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose `KamelABA/bilagh`
4. Select the repository root (Railway will detect backend via `Procfile`)

**C. Configure Root Directory**
If Railway doesn't auto-detect the backend:
1. Go to Settings
2. Set "Root Directory" to `backend`
3. Or update `railway.json` to specify backend path

**D. Set Environment Variables**
Go to your Railway project → Variables tab:

```env
# MongoDB Atlas Connection (REQUIRED)
DATABASE_URL=mongodb+srv://kamelbilagh:kamelbilagh@cluster0.6vbwfjv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# JWT Configuration (REQUIRED)
SECRET_KEY=your-secure-random-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Cloudinary Configuration (REQUIRED)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# CORS Configuration (adjust based on your frontend URL)
ALLOWED_ORIGINS=https://your-app.com,exp://your-expo-url
```

**E. Deploy**
- Railway will automatically deploy
- Wait for deployment to complete
- Copy your app URL (e.g., `https://bilagh-production.up.railway.app`)

### 4️⃣ Verify MongoDB Atlas Access

**Important:** Make sure your MongoDB Atlas is configured to accept connections:

1. Go to MongoDB Atlas → Network Access
2. Click "Add IP Address"
3. Select "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add Railway's IP addresses specifically

### 5️⃣ Update Frontend API URL

Edit `constants/api.ts`:
```typescript
// Change from localhost to Railway URL
export const API_BASE_URL = 'https://bilagh-production.up.railway.app';
```

Commit and push this change:
```bash
git add constants/api.ts
git commit -m "Update API URL for Railway deployment"
git push origin main
```

### 6️⃣ Test Backend

```bash
# Test health endpoint
curl https://your-app-name.up.railway.app/health

# Should return: {"status":"healthy"}

# Test API root
curl https://your-app-name.up.railway.app/
```

### 7️⃣ Rebuild Mobile App

```bash
# For development testing
npm start

# For production APK
eas build -p android --profile production
```

## 🔒 Important Security Notes

### 1. MongoDB Atlas Connection String
Your current connection string is visible in `.env`. For production:
- ✅ Create a dedicated database user for production
- ✅ Use a strong password (not "kamelbilagh")
- ✅ Set Network Access to Railway IPs only (more secure than 0.0.0.0/0)

### 2. Secret Key
Generate a secure secret key:
```python
import secrets
print(secrets.token_urlsafe(32))
```
Use this instead of "your-secret-key-change-this"

### 3. Environment Variables
The `.env` file is in `.gitignore` and won't be pushed.
Always set sensitive data in Railway's Variables tab.

## 📊 Your Setup

**Database:** MongoDB Atlas
- Cluster: `cluster0.6vbwfjv.mongodb.net`
- Database: `bilagh`
- Current user: `kamelbilagh`

**Backend Stack:**
- FastAPI
- Motor (async MongoDB driver)
- Cloudinary (image storage)

**Deployment:**
- Platform: Railway
- No additional database needed (using existing Atlas cluster)

## ⚠️ Pre-Deployment Checklist

- [ ] MongoDB Atlas Network Access allows Railway connections
- [ ] Strong password for MongoDB user
- [ ] SECRET_KEY is secure and random
- [ ] CLOUDINARY credentials are correct
- [ ] ALLOWED_ORIGINS includes your frontend URLs
- [ ] `.env` file is NOT pushed to GitHub (check .gitignore)

## 🚀 Railway Advantages with MongoDB Atlas

✅ **No database provisioning needed** - Use existing Atlas cluster
✅ **Auto-deployment** - Pushes to GitHub auto-deploy
✅ **Free tier available** - Great for testing
✅ **Easy scaling** - Upgrade when needed
✅ **SSL/HTTPS** - Automatic secure connections

## 🆘 Common Issues

### Issue: "Error connecting to MongoDB"
**Solution:** Check MongoDB Atlas Network Access allows Railway IPs

### Issue: "Module not found"
**Solution:** Ensure `requirements.txt` has all dependencies:
```
motor
pymongo
fastapi
uvicorn
python-dotenv
cloudinary
```

### Issue: "Port already in use"
**Solution:** Railway auto-assigns ports, no config needed

## ✨ Ready to Deploy!

Your project is configured for MongoDB Atlas and ready for Railway deployment.

Follow steps 1-7 above to complete deployment.
