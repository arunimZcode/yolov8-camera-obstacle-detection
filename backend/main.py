"""
VIGILai Backend — FastAPI
- Serves each camera as an MJPEG stream (/stream/{camera_id})
- Runs YOLO detection on each stream frame
- Pushes alert events to all connected browsers via WebSocket (/ws/alerts)
- REST endpoints for camera list and event history (/api/cameras, /api/events)
"""

import os, json, time, cv2, asyncio, threading
from datetime import datetime
from pathlib import Path
from typing import Dict, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ── Config ─────────────────────────────────────────────────────────────────────

VIDEO_DIR   = Path(os.getenv("VIDEO_DIR", "./videos"))    # put your .mp4 files here
SNAPSHOT_DIR = Path("./snapshots")
EVENT_LOG   = Path("./events.json")
CONF_THRESHOLD = 0.4
COOLDOWN_SEC   = 3

SNAPSHOT_DIR.mkdir(exist_ok=True)
VIDEO_DIR.mkdir(exist_ok=True)

# ── YOLO model (lazy-loaded once) ──────────────────────────────────────────────

_model = None
def get_model():
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            _model = YOLO("yolov8n.pt")
            print("✓ YOLOv8 loaded")
        except Exception as e:
            print(f"⚠ YOLO unavailable ({e}), using MobileNet-SSD")
            _model = "mobilenet"
    return _model

# MobileNet-SSD fallback
_ssd_net = None
SSD_CLASSES = ["background","aeroplane","bicycle","bird","boat","bottle","bus","car",
               "cat","chair","cow","diningtable","dog","horse","motorbike","person",
               "pottedplant","sheep","sofa","train","tvmonitor"]
def get_ssd():
    global _ssd_net
    if _ssd_net is None:
        try:
            _ssd_net = cv2.dnn.readNetFromCaffe("deploy.prototxt", "mobilenet_iter_73000.caffemodel")
        except:
            _ssd_net = False
    return _ssd_net

RELEVANT = {
    "person":"Human Detected","bicycle":"Vehicle Detected","car":"Vehicle Detected",
    "motorcycle":"Vehicle Detected","bus":"Vehicle Detected","truck":"Vehicle Detected",
    "dog":"Animal Detected","cat":"Animal Detected","horse":"Animal Detected",
    "cow":"Animal Detected","sheep":"Animal Detected",
}

# ── Camera registry ────────────────────────────────────────────────────────────

def discover_cameras() -> List[dict]:
    """
    Each .mp4 (or .avi, .mkv) file in VIDEO_DIR becomes a camera.
    You can also hard-code RTSP URLs here:
      {"id": "cam-gate", "name": "Main Gate", "source": "rtsp://...", "status": "online"}
    """
    cams = []
    video_files = sorted(VIDEO_DIR.glob("*.mp4")) + \
                  sorted(VIDEO_DIR.glob("*.avi")) + \
                  sorted(VIDEO_DIR.glob("*.mkv"))
    for i, f in enumerate(video_files[:50]):
        cams.append({
            "id": f"cam-{i+1:02d}",
            "name": f"Camera {i+1:02d}",
            "location": f.stem,
            "source": str(f),
            "status": "online",
        })
    if not cams:
        # Demo: one simulated camera using a test pattern
        cams.append({
            "id": "cam-01", "name": "Camera 01", "location": "Demo Feed",
            "source": "demo", "status": "online"
        })
    return cams

cameras: List[dict] = []
events: List[dict] = []
if EVENT_LOG.exists():
    try:
        events = json.loads(EVENT_LOG.read_text())
    except:
        events = []

# ── Detection ──────────────────────────────────────────────────────────────────

def detect_frame(frame, camera_id: str, cooldowns: dict) -> List[dict]:
    model = get_model()
    h, w = frame.shape[:2]
    found = {}

    if model == "mobilenet":
        net = get_ssd()
        if not net:
            return []
        blob = cv2.dnn.blobFromImage(frame, 0.007843, (300,300), 127.5)
        net.setInput(blob)
        dets = net.forward()
        for i in range(dets.shape[2]):
            conf = float(dets[0,0,i,2])
            if conf < CONF_THRESHOLD: continue
            cls_id = int(dets[0,0,i,1])
            if cls_id < 0 or cls_id >= len(SSD_CLASSES): continue
            label = SSD_CLASSES[cls_id]
            if label not in RELEVANT: continue
            box = dets[0,0,i,3:7] * [w,h,w,h]
            x1,y1,x2,y2 = box.astype(int)
            evt = RELEVANT[label]
            if evt not in found or conf > found[evt][0]:
                found[evt] = (conf, (x1,y1,x2,y2), label)
            color = (0,255,0) if evt=="Human Detected" else (255,140,0) if evt=="Vehicle Detected" else (0,165,255)
            cv2.rectangle(frame,(x1,y1),(x2,y2),color,2)
            cv2.putText(frame,f"{label} {conf:.2f}",(x1,max(y1-6,0)),cv2.FONT_HERSHEY_SIMPLEX,0.45,color,1)
    else:
        results = model(frame, verbose=False)[0]
        for box in results.boxes:
            cls_id = int(box.cls[0])
            label = model.names[cls_id]
            conf = float(box.conf[0])
            if label not in RELEVANT or conf < CONF_THRESHOLD: continue
            x1,y1,x2,y2 = map(int, box.xyxy[0])
            evt = RELEVANT[label]
            if evt not in found or conf > found[evt][0]:
                found[evt] = (conf, (x1,y1,x2,y2), label)
            color = (0,255,0) if evt=="Human Detected" else (255,140,0) if evt=="Vehicle Detected" else (0,165,255)
            cv2.rectangle(frame,(x1,y1),(x2,y2),color,2)
            cv2.putText(frame,f"{label} {conf:.2f}",(x1,max(y1-6,0)),cv2.FONT_HERSHEY_SIMPLEX,0.45,color,1)

    # Overlays
    cv2.putText(frame, camera_id.upper(), (8,20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)
    cv2.putText(frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                (8,h-8), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (220,220,220), 1)

    new_events = []
    now = time.time()
    for evt, (conf, bbox, label) in found.items():
        key = f"{camera_id}-{evt}"
        if now - cooldowns.get(key, 0) < COOLDOWN_SEC:
            continue
        cooldowns[key] = now
        snap_path = SNAPSHOT_DIR / f"{camera_id}_{evt.replace(' ','_')}_{int(now)}.jpg"
        cv2.imwrite(str(snap_path), frame)
        new_events.append({
            "camera": camera_id,
            "camera_id": camera_id,
            "timestamp": datetime.now().isoformat(),
            "event_type": evt,
            "detected_class": label,
            "confidence": round(conf, 3),
            "snapshot": str(snap_path),
        })
    return new_events

# ── MJPEG stream per camera ────────────────────────────────────────────────────

def make_demo_frame(camera_id: str, frame_n: int):
    """Generate a synthetic frame when no video file is available."""
    frame = __import__('numpy').zeros((360,640,3), dtype=__import__('numpy').uint8)
    frame[:] = (15, 20, 25)
    cv2.putText(frame,"NO VIDEO FILE",(170,170),cv2.FONT_HERSHEY_SIMPLEX,1,(80,80,80),2)
    cv2.putText(frame,f"Place .mp4 files in ./videos/ folder",(80,220),cv2.FONT_HERSHEY_SIMPLEX,0.55,(60,60,60),1)
    cv2.putText(frame, camera_id.upper(),(8,20),cv2.FONT_HERSHEY_SIMPLEX,0.5,(255,255,255),1)
    cv2.putText(frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                (8,352),cv2.FONT_HERSHEY_SIMPLEX,0.38,(180,180,180),1)
    return frame

async def stream_camera(camera: dict):
    source = camera["source"]
    camera_id = camera["id"]
    cooldowns: dict = {}
    cap = None
    frame_n = 0

    if source != "demo":
        cap = cv2.VideoCapture(source)

    while True:
        if source == "demo":
            frame = make_demo_frame(camera_id, frame_n)
            await asyncio.sleep(0.1)
        else:
            ret, frame = cap.read()
            if not ret:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = cap.read()
                if not ret:
                    await asyncio.sleep(0.5)
                    continue

        new_events = detect_frame(frame, camera_id, cooldowns)
        for evt in new_events:
            events.insert(0, evt)
            events[:] = events[:500]
            EVENT_LOG.write_text(json.dumps(events[:200], indent=2))
            for ws in list(ws_clients):
                try:
                    await ws.send_text(json.dumps(evt))
                except:
                    ws_clients.discard(ws)

        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
        frame_n += 1
        await asyncio.sleep(0.05)  # ~20fps target

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(title="VIGILai")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

ws_clients: set = set()

@app.on_event("startup")
async def startup():
    global cameras
    cameras = discover_cameras()
    print(f"✓ Loaded {len(cameras)} cameras")

@app.get("/api/cameras")
def get_cameras():
    return [{"id":c["id"],"name":c["name"],"location":c.get("location",""),"status":c["status"]} for c in cameras]

@app.get("/api/events")
def get_events():
    return events[:200]

@app.get("/api/snapshot/{path:path}")
def get_snapshot(path: str):
    p = Path(path)
    if p.exists():
        return FileResponse(str(p))
    return JSONResponse({"error": "not found"}, status_code=404)

@app.get("/stream/{camera_id}")
async def get_stream(camera_id: str):
    cam = next((c for c in cameras if c["id"] == camera_id), None)
    if not cam:
        return JSONResponse({"error": "camera not found"}, status_code=404)
    return StreamingResponse(
        stream_camera(cam),
        media_type="multipart/x-mixed-replace;boundary=frame"
    )

@app.websocket("/ws/alerts")
async def alerts_ws(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_clients.discard(websocket)
