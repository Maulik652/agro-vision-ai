"""
start_all.py — Starts all AgroVision AI microservices in parallel.

Usage:
    cd agro-vision-ai/ai_service
    python start_all.py

Services started:
    Port 8001 — crop_scan_api          (Crop Disease Detection)
    Port 8002 — weather_ai_microservice (Weather AI Analysis)
    Port 8003 — analytics_prediction_service (Analytics Predictions)
    Port 8004 — buyer_dashboard_ai_service   (Buyer Dashboard AI)

Press Ctrl+C to stop all services.
"""
import subprocess
import sys
import signal
import os

SERVICES = [
    {
        "name": "Crop Scan API",
        "module": "crop_scan_api:app",
        "port": 8001,
    },
    {
        "name": "Weather AI",
        "module": "weather_ai_microservice:app",
        "port": 8002,
    },
    {
        "name": "Analytics Prediction",
        "module": "analytics_prediction_service:app",
        "port": 8003,
    },
    {
        "name": "Buyer Dashboard AI",
        "module": "buyer_dashboard_ai_service:app",
        "port": 8004,
    },
]

processes = []

def start_services():
    script_dir = os.path.dirname(os.path.abspath(__file__))

    for svc in SERVICES:
        cmd = [
            sys.executable, "-m", "uvicorn",
            svc["module"],
            "--host", "0.0.0.0",
            "--port", str(svc["port"]),
            "--reload",
        ]
        print(f"  Starting {svc['name']} on port {svc['port']}...")
        proc = subprocess.Popen(cmd, cwd=script_dir)
        processes.append((svc["name"], proc))

    print("\n  All services started. Press Ctrl+C to stop.\n")
    print("  Endpoints:")
    for svc in SERVICES:
        print(f"    http://127.0.0.1:{svc['port']}/health  — {svc['name']}")
    print()

def stop_all(sig=None, frame=None):
    print("\n  Stopping all AI services...")
    for name, proc in processes:
        proc.terminate()
        print(f"    Stopped {name}")
    sys.exit(0)

signal.signal(signal.SIGINT,  stop_all)
signal.signal(signal.SIGTERM, stop_all)

if __name__ == "__main__":
    print("\n  AgroVision AI — Starting all microservices\n")
    start_services()
    # Wait for all processes
    for name, proc in processes:
        proc.wait()
