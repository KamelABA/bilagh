# Bilagh Backend API

FastAPI backend with MongoDB Atlas for Bilagh road damage detection app.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Configure .env file
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/bilagh?retryWrites=true&w=majority
SECRET_KEY=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Run server
python main.py
```

## Railway Deployment

1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   - `DATABASE_URL` - MongoDB Atlas connection string
   - `SECRET_KEY` - JWT secret key
   - `CLOUDINARY_*` - Cloudinary credentials
3. Railway will auto-deploy using `Procfile`

## MongoDB Atlas Setup

1. Ensure Network Access allows Railway IPs (or 0.0.0.0/0)
2. Create database user with read/write permissions
3. Copy connection string to `DATABASE_URL`

## API Documentation

- Swagger UI: `/docs`
- ReDoc: `/redoc`

## Main Endpoints

- `POST /register` - Register user
- `POST /token` - Login
- `POST /reports` - Create report
- `GET /reports` - List reports
- `POST /analyze` - Analyze road damage image

## Tech Stack

- **FastAPI** - Web framework
- **MongoDB Atlas** - Cloud database
- **Motor** - Async MongoDB driver
- **Cloudinary** - Image storage
- **Railway** - Deployment platform
