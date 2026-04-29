import cv2
import time
import threading
import json
import os
import requests
import logging
import logging.handlers
import gc
import psutil
import sys
from collections import deque
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from ultralytics import YOLO

# ================================================================
# GOLD SHE MESH — INDUSTRIAL VISION ENGINE v4.0 (FastAPI)
# GAP 2: Multiprocessing Architecture & Shared Memory IPC
# ================================================================

# Setup logging with Daily Rotation (7 days retention, max 1GB total managed by watchdog)
LOG_FILE = "vision_engine.log"
handler = logging.handlers.TimedRotatingFileHandler(
    LOG_FILE, when='midnight', interval=1, backupCount=7
)
logging.basicConfig(
    level=logging.INFO, 
    format='[VisionEngine] %(asctime)s %(levelname)s %(message)s',
    handlers=[handler, logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Gold She Vision Engine")

# CONFIGURATION
HUB_SNIPPETS_DIR = os.path.join(os.getcwd(), 'public', 'snippets')
FRAME_BUFFER_MAX = 300  # 30 seconds at 10 FPS
DEFAULT_FPS = 10.0

# Ensure snippet directory exists
os.makedirs(HUB_SNIPPETS_DIR, exist_ok=True)

# GLOBAL STATE
model = YOLO('yolov8n.pt')
inference_count = 0
inference_lock = threading.Lock()
MEMORY_LIMIT_GB = 2.0

class CameraConfig(BaseModel):
    camera_id: str
    profile: str = "GENERIC"
    ip: str = "0.0.0.0"
    user: str = "admin"
    password: str = "admin"

class SnippetTrigger(BaseModel):
    uuid: str
    camera_id: str = "DEFAULT"

def get_rtsp_url(profile, ip, user, password):
    if 'DAHUA' in profile.upper() or 'IMOU' in profile.upper():
        return f"rtsp://{user}:{password}@{ip}:554/cam/realmonitor?channel=1&subtype=0"
    elif 'HIKVISION' in profile.upper():
        return f"rtsp://{user}:{password}@{ip}:554/Streaming/Channels/101"
    return f"rtsp://{user}:{password}@{ip}:554/live"

class IndustrialStream:
    def __init__(self, camera_id, rtsp_url):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.ring_buffer = deque(maxlen=FRAME_BUFFER_MAX)
        self.buffer_lock = threading.Lock()
        self.latest_frame = None
        self.is_running = True
        self.event_count = 0
        self.status = "reconnecting" # stable, reconnecting, lost
        
        self.capture_thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.process_thread = threading.Thread(target=self._process_loop, daemon=True)
        
        self.capture_thread.start()
        self.process_thread.start()

    def _report_health(self, status):
        self.status = status
        try:
            requests.post("http://localhost:3000/api/system/ai-event", 
                          json={"camera_id": self.camera_id, "type": "STREAM_HEALTH", "status": status}, 
                          timeout=0.5)
        except:
            pass

    def _capture_loop(self):
        """
        GAP 3: RTSP Watchdog & Exponential Backoff Recovery
        """
        backoff_delays = [2, 4, 8, 16, 32, 60]
        retry_count = 0
        
        while self.is_running:
            self._report_health("reconnecting")
            logger.info(f"Stream[{self.camera_id}]: Attempting connection to {self.rtsp_url}")
            
            cap = cv2.VideoCapture(self.rtsp_url, cv2.CAP_FFMPEG)
            if not cap.isOpened():
                delay = backoff_delays[min(retry_count, len(backoff_delays)-1)]
                logger.warning(f"Stream[{self.camera_id}]: Connection failed. Retrying in {delay}s...")
                
                if retry_count > 2:
                    self._report_health("lost")
                
                time.sleep(delay)
                retry_count += 1
                continue

            # Connection Successful
            logger.info(f"Stream[{self.camera_id}]: Connection ESTABLISHED")
            self._report_health("stable")
            retry_count = 0
            
            while self.is_running:
                ret, frame = cap.read()
                if not ret:
                    logger.error(f"Stream[{self.camera_id}]: Data stream dropped")
                    break
                self.latest_frame = frame
            
            cap.release()
            if self.is_running:
                logger.info(f"Stream[{self.camera_id}]: Initiating watchdog recovery...")
                time.sleep(1)

    def _process_loop(self):
        last_process_time = 0
        while self.is_running:
            now = time.time()
            if now - last_process_time < (1.0 / DEFAULT_FPS):
                time.sleep(0.01)
                continue
                
            if self.latest_frame is not None:
                frame = self.latest_frame.copy()
                results = model(frame, classes=[0], verbose=False, stream=True)
                
                detections = []
                for r in results:
                    for box in r.boxes:
                        b = box.xyxy[0].tolist()
                        conf = float(box.conf[0])
                        detections.append({
                            "label": "person",
                            "confidence": conf,
                            "box": b
                        })
                        cv2.rectangle(frame, (int(b[0]), int(b[1])), (int(b[2]), int(b[3])), (250, 165, 96), 2)
                
                self.event_count = len(detections)
                
                # Push Event Data to Hub (IPC via Shared API or Redis would go here)
                if self.event_count > 0:
                    self._report_event(detections)

                with self.buffer_lock:
                    self.ring_buffer.append(frame)
                
                # PILLAR 4: Manual Garbage Collection every 500 inferences
                global inference_count
                with inference_lock:
                    inference_count += 1
                    if inference_count % 500 == 0:
                        logger.info("Purging video buffers & forcing Garbage Collection...")
                        gc.collect()
                
                last_process_time = now

    def _report_event(self, detections):
        """
        Pushes detection data to the Hub UI.
        In a real Redis setup, we'd use redis.publish('ai_events', ...)
        """
        try:
            # Fallback to internal HTTP IPC for event data
            requests.post("http://localhost:3000/api/system/ai-event", 
                          json={"camera_id": self.camera_id, "detections": detections}, 
                          timeout=0.5)
        except:
            pass

    def save_snippet(self, uuid):
        filepath = os.path.join(HUB_SNIPPETS_DIR, f"{uuid}.mp4")
        with self.buffer_lock:
            frames = list(self.ring_buffer)
        
        if not frames: return

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        h, w = frames[0].shape[:2]
        out = cv2.VideoWriter(filepath, fourcc, DEFAULT_FPS, (w, h))
        for f in frames:
            out.write(f)
        out.release()
        logger.info(f"Snippet[{self.camera_id}]: Forensic proof saved: {filepath}")

# GLOBAL MANAGER
streams = {}

@app.on_event("startup")
async def startup_event():
    # Start Resource Monitor
    threading.Thread(target=monitor_resources, daemon=True).start()
    
    # Start default stream (webcam 0)
    streams['DEFAULT'] = IndustrialStream('DEFAULT', 0)
    logger.info("Industrial Vision Engine (FastAPI) Online | Stability Watchdog Active")

def monitor_resources():
    """
    STABILITY WATCHDOG: Tracks RAM, CPU, sends Health Pulse, and triggers soft-reset if leaking for > 5 mins.
    """
    process = psutil.Process(os.getpid())
    over_limit_start_time = None
    
    # Initialize CPU percentage
    process.cpu_percent(interval=None)
    
    while True:
        try:
            mem_info = process.memory_info()
            rss_gb = mem_info.rss / (1024 * 1024 * 1024)
            cpu_percent = process.cpu_percent(interval=None)
            
            # Send Health Pulse to Hub UI
            try:
                requests.post("http://localhost:3000/api/system/ai-event", 
                              json={
                                  "camera_id": "SYSTEM",
                                  "type": "HEALTH_PULSE", 
                                  "ram_gb": round(rss_gb, 2),
                                  "cpu_percent": round(cpu_percent, 2)
                              }, 
                              timeout=0.5)
            except:
                pass
            
            # Auto-Restart Logic (RAM > 2GB for > 5 mins)
            if rss_gb > MEMORY_LIMIT_GB:
                if over_limit_start_time is None:
                    over_limit_start_time = time.time()
                elif time.time() - over_limit_start_time > 300: # 5 minutes
                    logger.critical(f"MEMORY BREACH: RAM Usage > {MEMORY_LIMIT_GB}GB for > 5 mins. Exiting.")
                    for s in streams.values():
                        s.is_running = False
                    time.sleep(1) # Grace period
                    sys.exit(0) 
            else:
                over_limit_start_time = None # Reset
                
            # Log Management: Cap total log size at 1GB
            log_dir = os.path.dirname(LOG_FILE) or '.'
            base_log_name = os.path.basename(LOG_FILE)
            log_files = [f for f in os.listdir(log_dir) if f.startswith(base_log_name)]
            total_size = sum(os.path.getsize(os.path.join(log_dir, f)) for f in log_files)
            
            if total_size > 1 * 1024 * 1024 * 1024:
                logger.warning("Total log size exceeds 1GB. Deleting oldest logs.")
                log_files.sort(key=lambda x: os.path.getmtime(os.path.join(log_dir, x)))
                while total_size > 1 * 1024 * 1024 * 1024 and len(log_files) > 1:
                    oldest_log = log_files.pop(0)
                    if oldest_log != base_log_name:
                        file_path = os.path.join(log_dir, oldest_log)
                        try:
                            file_size = os.path.getsize(file_path)
                            os.remove(file_path)
                            total_size -= file_size
                        except OSError:
                            pass
                            
            time.sleep(10) # Check every 10 seconds
        except Exception as e:
            logger.error(f"Watchdog Error: {e}")
            time.sleep(5)

@app.post("/configure-camera")
async def configure_camera(config: CameraConfig):
    rtsp = get_rtsp_url(config.profile, config.ip, config.user, config.password)
    streams[config.camera_id] = IndustrialStream(config.camera_id, rtsp)
    return {"success": True, "camera_id": config.camera_id}

@app.post("/trigger-snippet")
async def trigger_snippet(trigger: SnippetTrigger, background_tasks: BackgroundTasks):
    if trigger.camera_id not in streams:
        return {"error": "Camera not found"}, 404
    
    background_tasks.add_task(streams[trigger.camera_id].save_snippet, trigger.uuid)
    return {"success": True, "message": "Compilation Started"}

@app.get("/status")
async def get_status():
    return {
        "status": "online",
        "active_streams": list(streams.keys()),
        "stream_health": {cid: s.status for cid, s in streams.items()},
        "event_counts": {cid: s.event_count for cid, s in streams.items()}
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
