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

# Create startup script
RUN echo '#!/bin/sh\npython -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}' > /start.sh && chmod +x /start.sh

# Run the application
CMD ["/bin/sh", "/start.sh"]
