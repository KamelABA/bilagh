# PostgreSQL Setup Guide for Bilagh

## Prerequisites

1. **PostgreSQL Installed**
   - Download from: https://www.postgresql.org/download/windows/
   - During installation, remember your password for the `postgres` user
   - Default port: 5432

## Setup Steps

### Option 1: Automatic Setup (Recommended)

1. **Update password in setup_db.py**
   ```python
   DB_PASSWORD = "your_postgres_password"  # Line 14
   ```

2. **Run the setup script**
   ```bash
   cd backend
   python setup_db.py
   ```

3. **Start the backend**
   ```bash
   python main.py
   ```

### Option 2: Manual Setup

1. **Open pgAdmin or psql**

2. **Create database**
   ```sql
   CREATE DATABASE bilagh;
   ```

3. **Run the SQL script**
   ```bash
   psql -U postgres -d bilagh -f setup_postgres.sql
   ```

4. **Update .env file**
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/bilagh
   ```

5. **Start the backend**
   ```bash
   python main.py
   ```

## Verify Setup

### Check if PostgreSQL is running:
```bash
# Windows
Get-Service -Name "*postgres*"

# Or check if port 5432 is listening
netstat -an | findstr 5432
```

### Test connection:
```bash
psql -U postgres -d bilagh -c "SELECT version();"
```

### View tables:
```bash
psql -U postgres -d bilagh -c "\dt"
```

## Database Configuration

**Current settings in `database.py`:**
```python
DATABASE_URL = "postgresql://postgres:postgre14@localhost:5432/bilagh"
```

**Update if needed:**
- Username: `postgres` (default)
- Password: `postgre14` (change to your password)
- Host: `localhost`
- Port: `5432`
- Database: `bilagh`

## Tables Created

### users
- id (SERIAL PRIMARY KEY)
- email (VARCHAR UNIQUE)
- username (VARCHAR UNIQUE)
- full_name (VARCHAR)
- phone (VARCHAR)
- hashed_password (VARCHAR)
- role (VARCHAR - user/admin)
- points (INTEGER)
- created_at (TIMESTAMP)

### reports
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- type (VARCHAR)
- location (VARCHAR)
- latitude (DOUBLE PRECISION)
- longitude (DOUBLE PRECISION)
- description (TEXT)
- status (VARCHAR - pending/in-progress/resolved)
- severity (VARCHAR - low/medium/high)
- image_url (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)

## Troubleshooting

### Error: "could not connect to server"
- Make sure PostgreSQL service is running
- Check Windows Services for "postgresql-x64-XX"

### Error: "password authentication failed"
- Update password in `database.py` or `.env`
- Match the password you set during PostgreSQL installation

### Error: "database does not exist"
- Run `python setup_db.py` to create it
- Or manually: `CREATE DATABASE bilagh;`

### Error: "psycopg2 not installed"
```bash
pip install psycopg2-binary
```

## Migration from SQLite

If you were using SQLite before:

1. **Backup SQLite data** (optional)
   ```bash
   cp bilagh.db bilagh_backup.db
   ```

2. **Switch to PostgreSQL** (already done in database.py)

3. **Run setup**
   ```bash
   python setup_db.py
   ```

4. **Restart backend**
   ```bash
   python main.py
   ```

Note: Existing SQLite data won't be migrated automatically. Users will need to sign up again.

## Advantages of PostgreSQL

✅ **Production-ready** - Better for real applications
✅ **Concurrent users** - Handles multiple connections
✅ **Data integrity** - ACID compliance
✅ **Advanced features** - Triggers, stored procedures
✅ **Scalability** - Can handle large datasets
✅ **Better performance** - For complex queries

## Next Steps

1. ✅ PostgreSQL installed
2. ✅ Database created
3. ✅ Tables created
4. 🚀 Run `python main.py`
5. 📱 Test with your app!
