#!/usr/bin/env python3
"""
Alternative startup script for Google Cloud Run deployment
"""
import os
import uvicorn
from main import app

if __name__ == "__main__":
    # Get port from environment variable (Google Cloud Run uses PORT)
    port = int(os.environ.get("PORT", 8080))
    host = "0.0.0.0"
    
    print(f"🚀 Starting Data Alchemist Backend...")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    
    # Start the server with production settings
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
        access_log=True,
        reload=False,  # Disable reload in production
        workers=1      # Single worker for Cloud Run
    )
