# Bilagh Backend API

FastAPI backend with PostgreSQL database for the Bilagh road damage detection app.

## Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Report Management**: CRUD operations for road damage reports
- **PostgreSQL Database**: Relational database with SQLAlchemy ORM
- **RESTful API**: Well-structured endpoints following REST principles
- **CORS Support**: Configured for React Native/Expo frontend

## Setup Instructions

### 1. Install PostgreSQL

Download and install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/)

### 2. Create Database

```sql
CREATE DATABASE bilagh_db;
```

### 3. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Edit `.env` file with your database credentials:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bilagh_db
SECRET_KEY=your-secret-key-change-this
```

### 5. Run the Server

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Authentication
- `POST /register` - Register new user
- `POST /token` - Login and get access token
- `GET /users/me` - Get current user info

### Reports
- `POST /reports` - Create new report
- `GET /reports` - Get all user reports (with filters)
- `GET /reports/{id}` - Get specific report
- `PUT /reports/{id}` - Update report
- `DELETE /reports/{id}` - Delete report

### Health
- `GET /health` - Health check
- `GET /` - API info

## Database Schema

### Users Table
- id (Primary Key)
- email (Unique)
- username (Unique)
- full_name
- phone
- hashed_password
- role (user/admin)
- points
- created_at

### Reports Table
- id (Primary Key)
- user_id (Foreign Key)
- type (Pothole, Crack, etc.)
- location
- latitude
- longitude
- description
- status (pending/in-progress/resolved)
- severity (low/medium/high)
- image_url
- created_at
- updated_at

## Testing with cURL

### Register User
```bash
curl -X POST "http://localhost:8000/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### Login
```bash
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"
```

### Create Report
```bash
curl -X POST "http://localhost:8000/reports" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Pothole",
    "location": "Main Street",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "description": "Large pothole",
    "severity": "high"
  }'
```

## Security

- Passwords are hashed using bcrypt
- JWT tokens expire after 30 minutes
- CORS is configured for specific origins
- SQL injection protection via SQLAlchemy ORM

## Production Deployment

1. Change `SECRET_KEY` in `.env`
2. Use a production PostgreSQL server
3. Set up HTTPS
4. Configure proper CORS origins
5. Use environment variables for sensitive data
6. Set up database backups

## Tech Stack

- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Relational database
- **SQLAlchemy**: ORM for database operations
- **Pydantic**: Data validation
- **JWT**: Authentication tokens
- **Bcrypt**: Password hashing
