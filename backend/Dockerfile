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

# Create simple startup script that prints environment and starts uvicorn
# We use shell execution to ensure PORT is passed correctly
RUN echo '#!/bin/sh\n\
    echo "Starting application..."\n\
    echo "PORT is set to: ${PORT}"\n\
    exec python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}' > /start.sh && chmod +x /start.sh

# Run the startup script
CMD ["/bin/sh", "/start.sh"]
