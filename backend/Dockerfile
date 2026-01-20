FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

# Run the application using shell form to expand variable
# If PORT is missing, default to 8000.
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
