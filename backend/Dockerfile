# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY . .

# Expose the port that Cloud Run will use
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Command to run the FastAPI application
CMD ["python", "main.py"]
