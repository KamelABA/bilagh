FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

# Expose port
EXPOSE 8000

# Set environment variable for port
ENV PORT=8000

# Run the application with shell to expand $PORT
CMD python -m uvicorn main:app --host 0.0.0.0 --port ${PORT}
