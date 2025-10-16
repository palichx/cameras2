from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Tuple
import uuid
from datetime import datetime, timezone
import cv2
import numpy as np
import asyncio
import json
import aiofiles
from collections import defaultdict
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create recordings directory
RECORDINGS_DIR = ROOT_DIR / 'recordings'
RECORDINGS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Models
class ExclusionZone(BaseModel):
    points: List[Tuple[int, int]]  # List of (x, y) coordinates

class CameraCreate(BaseModel):
    name: str
    url: str  # rtsp://username:password@ip:port/path or http://...
    username: Optional[str] = None
    password: Optional[str] = None

class Camera(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    username: Optional[str] = None
    password: Optional[str] = None
    status: str = "inactive"  # inactive, active, recording, error
    codec: Optional[str] = None
    resolution: Optional[str] = None
    bitrate: Optional[str] = None
    fps: Optional[float] = None
    exclusion_zones: List[ExclusionZone] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Recording(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    camera_id: str
    camera_name: str
    filename: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: Optional[float] = None
    motion_events: int = 0
    file_size: Optional[int] = None

class CameraUpdate(BaseModel):
    name: Optional[str] = None
    exclusion_zones: Optional[List[ExclusionZone]] = None

# Camera Manager - Singleton for managing camera connections
class CameraManager:
    def __init__(self):
        self.active_cameras: Dict[str, dict] = {}  # camera_id -> {cap, task, recording, mog2}
        
    async def connect_camera(self, camera: Camera) -> bool:
        try:
            # Build URL with auth if provided
            url = camera.url
            if camera.username and camera.password and not ('@' in url):
                # Insert credentials into URL
                if url.startswith('rtsp://'):
                    url = f"rtsp://{camera.username}:{camera.password}@{url[7:]}"
                elif url.startswith('http://'):
                    url = f"http://{camera.username}:{camera.password}@{url[7:]}"
            
            # Open video capture in a thread to avoid blocking
            cap = await asyncio.to_thread(cv2.VideoCapture, url)
            
            if not cap.isOpened():
                logger.error(f"Failed to open camera {camera.id}")
                return False
            
            # Get camera properties
            codec = int(cap.get(cv2.CAP_PROP_FOURCC))
            codec_str = "".join([chr((codec >> 8 * i) & 0xFF) for i in range(4)])
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            bitrate = cap.get(cv2.CAP_PROP_BITRATE)
            
            # Update camera info in DB
            await db.cameras.update_one(
                {"id": camera.id},
                {"$set": {
                    "codec": codec_str,
                    "resolution": f"{width}x{height}",
                    "bitrate": f"{int(bitrate/1000)}kbps" if bitrate > 0 else "unknown",
                    "fps": fps if fps > 0 else 25.0,
                    "status": "active"
                }}
            )
            
            # Create MOG2 background subtractor for motion detection
            mog2 = cv2.createBackgroundSubtractorMOG2(detectShadows=True)
            
            self.active_cameras[camera.id] = {
                'cap': cap,
                'mog2': mog2,
                'recording': None,
                'task': None,
                'url': url
            }
            
            logger.info(f"Camera {camera.id} connected: {width}x{height} @ {fps}fps, codec: {codec_str}")
            return True
            
        except Exception as e:
            logger.error(f"Error connecting to camera {camera.id}: {e}")
            await db.cameras.update_one({"id": camera.id}, {"$set": {"status": "error"}})
            return False
    
    async def disconnect_camera(self, camera_id: str):
        if camera_id in self.active_cameras:
            cam_data = self.active_cameras[camera_id]
            
            # Stop recording if active
            if cam_data['recording']:
                await self.stop_recording(camera_id)
            
            # Stop task
            if cam_data['task']:
                cam_data['task'].cancel()
            
            # Release capture
            if cam_data['cap']:
                await asyncio.to_thread(cam_data['cap'].release)
            
            del self.active_cameras[camera_id]
            await db.cameras.update_one({"id": camera_id}, {"$set": {"status": "inactive"}})
            logger.info(f"Camera {camera_id} disconnected")
    
    async def start_recording(self, camera_id: str, camera_name: str) -> Optional[str]:
        if camera_id not in self.active_cameras:
            return None
        
        cam_data = self.active_cameras[camera_id]
        if cam_data['recording']:
            return cam_data['recording']['id']
        
        # Create recording entry
        recording_id = str(uuid.uuid4())
        filename = f"{camera_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.avi"
        filepath = RECORDINGS_DIR / filename
        
        # Get video properties
        cap = cam_data['cap']
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 25.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
        
        # Create video writer
        writer = cv2.VideoWriter(str(filepath), fourcc, fps, (width, height))
        
        recording = {
            'id': recording_id,
            'camera_id': camera_id,
            'camera_name': camera_name,
            'filename': filename,
            'filepath': filepath,
            'writer': writer,
            'start_time': datetime.now(timezone.utc),
            'motion_events': 0
        }
        
        cam_data['recording'] = recording
        
        # Save to DB
        recording_doc = Recording(
            id=recording_id,
            camera_id=camera_id,
            camera_name=camera_name,
            filename=filename,
            start_time=recording['start_time']
        )
        doc = recording_doc.model_dump()
        doc['start_time'] = doc['start_time'].isoformat()
        await db.recordings.insert_one(doc)
        
        await db.cameras.update_one({"id": camera_id}, {"$set": {"status": "recording"}})
        
        logger.info(f"Started recording for camera {camera_id}: {filename}")
        return recording_id
    
    async def stop_recording(self, camera_id: str):
        if camera_id not in self.active_cameras:
            return
        
        cam_data = self.active_cameras[camera_id]
        recording = cam_data['recording']
        
        if not recording:
            return
        
        # Release writer
        recording['writer'].release()
        
        # Calculate duration and file size
        end_time = datetime.now(timezone.utc)
        duration = (end_time - recording['start_time']).total_seconds()
        file_size = recording['filepath'].stat().st_size if recording['filepath'].exists() else 0
        
        # Update recording in DB
        await db.recordings.update_one(
            {"id": recording['id']},
            {"$set": {
                "end_time": end_time.isoformat(),
                "duration": duration,
                "file_size": file_size,
                "motion_events": recording['motion_events']
            }}
        )
        
        cam_data['recording'] = None
        await db.cameras.update_one({"id": camera_id}, {"$set": {"status": "active"}})
        
        logger.info(f"Stopped recording for camera {camera_id}")
    
    def is_connected(self, camera_id: str) -> bool:
        return camera_id in self.active_cameras

camera_manager = CameraManager()

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = defaultdict(list)
    
    async def connect(self, camera_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[camera_id].append(websocket)
    
    def disconnect(self, camera_id: str, websocket: WebSocket):
        if camera_id in self.active_connections:
            if websocket in self.active_connections[camera_id]:
                self.active_connections[camera_id].remove(websocket)
    
    async def broadcast(self, camera_id: str, data: bytes):
        if camera_id in self.active_connections:
            disconnected = []
            for connection in self.active_connections[camera_id]:
                try:
                    await connection.send_bytes(data)
                except:
                    disconnected.append(connection)
            
            for conn in disconnected:
                self.disconnect(camera_id, conn)

ws_manager = ConnectionManager()

# Background task for processing camera stream
async def process_camera_stream(camera_id: str):
    while camera_id in camera_manager.active_cameras:
        try:
            cam_data = camera_manager.active_cameras[camera_id]
            cap = cam_data['cap']
            mog2 = cam_data['mog2']
            recording = cam_data['recording']
            
            # Read frame
            ret, frame = await asyncio.to_thread(cap.read)
            
            if not ret:
                logger.warning(f"Failed to read frame from camera {camera_id}")
                await asyncio.sleep(0.1)
                continue
            
            # Write to recording if active
            if recording and recording['writer']:
                await asyncio.to_thread(recording['writer'].write, frame)
            
            # Motion detection with exclusion zones
            camera_doc = await db.cameras.find_one({"id": camera_id}, {"exclusion_zones": 1})
            exclusion_zones = camera_doc.get('exclusion_zones', []) if camera_doc else []
            
            # Apply MOG2
            fg_mask = await asyncio.to_thread(mog2.apply, frame)
            
            # Apply exclusion zones
            if exclusion_zones:
                mask = np.ones(fg_mask.shape, dtype=np.uint8) * 255
                for zone in exclusion_zones:
                    if zone.get('points'):
                        pts = np.array(zone['points'], dtype=np.int32)
                        cv2.fillPoly(mask, [pts], 0)
                fg_mask = cv2.bitwise_and(fg_mask, mask)
            
            # Detect motion
            motion_pixels = cv2.countNonZero(fg_mask)
            if motion_pixels > 1000 and recording:  # Threshold for motion
                recording['motion_events'] += 1
            
            # Encode frame for WebSocket (lower quality for streaming)
            small_frame = cv2.resize(frame, (640, 360))
            _, buffer = await asyncio.to_thread(cv2.imencode, '.jpg', small_frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
            
            # Broadcast to WebSocket clients
            await ws_manager.broadcast(camera_id, buffer.tobytes())
            
            await asyncio.sleep(0.03)  # ~30fps for live stream
            
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error processing camera {camera_id}: {e}")
            await asyncio.sleep(1)

# API Routes
@api_router.post("/cameras", response_model=Camera)
async def create_camera(camera: CameraCreate, background_tasks: BackgroundTasks):
    camera_obj = Camera(
        name=camera.name,
        url=camera.url,
        username=camera.username,
        password=camera.password
    )
    
    doc = camera_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.cameras.insert_one(doc)
    
    # Connect to camera in background
    background_tasks.add_task(camera_manager.connect_camera, camera_obj)
    
    return camera_obj

@api_router.get("/cameras", response_model=List[Camera])
async def get_cameras():
    cameras = await db.cameras.find({}, {"_id": 0}).to_list(1000)
    for cam in cameras:
        if isinstance(cam.get('created_at'), str):
            cam['created_at'] = datetime.fromisoformat(cam['created_at'])
    return cameras

@api_router.get("/cameras/{camera_id}", response_model=Camera)
async def get_camera(camera_id: str):
    camera = await db.cameras.find_one({"id": camera_id}, {"_id": 0})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    if isinstance(camera.get('created_at'), str):
        camera['created_at'] = datetime.fromisoformat(camera['created_at'])
    return camera

@api_router.put("/cameras/{camera_id}", response_model=Camera)
async def update_camera(camera_id: str, update: CameraUpdate):
    camera = await db.cameras.find_one({"id": camera_id})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.cameras.update_one({"id": camera_id}, {"$set": update_data})
    
    updated_camera = await db.cameras.find_one({"id": camera_id}, {"_id": 0})
    if isinstance(updated_camera.get('created_at'), str):
        updated_camera['created_at'] = datetime.fromisoformat(updated_camera['created_at'])
    return updated_camera

@api_router.delete("/cameras/{camera_id}")
async def delete_camera(camera_id: str):
    await camera_manager.disconnect_camera(camera_id)
    result = await db.cameras.delete_one({"id": camera_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Camera not found")
    return {"message": "Camera deleted"}

@api_router.post("/cameras/{camera_id}/start")
async def start_camera(camera_id: str):
    camera = await db.cameras.find_one({"id": camera_id})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if not camera_manager.is_connected(camera_id):
        camera_obj = Camera(**{k: v for k, v in camera.items() if k != '_id'})
        if isinstance(camera_obj.created_at, str):
            camera_obj.created_at = datetime.fromisoformat(camera_obj.created_at)
        
        success = await camera_manager.connect_camera(camera_obj)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to connect to camera")
        
        # Start processing task
        task = asyncio.create_task(process_camera_stream(camera_id))
        camera_manager.active_cameras[camera_id]['task'] = task
    
    return {"message": "Camera started", "status": "active"}

@api_router.post("/cameras/{camera_id}/stop")
async def stop_camera(camera_id: str):
    await camera_manager.disconnect_camera(camera_id)
    return {"message": "Camera stopped", "status": "inactive"}

@api_router.post("/cameras/{camera_id}/record/start")
async def start_recording(camera_id: str):
    camera = await db.cameras.find_one({"id": camera_id})
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if not camera_manager.is_connected(camera_id):
        raise HTTPException(status_code=400, detail="Camera is not active")
    
    recording_id = await camera_manager.start_recording(camera_id, camera['name'])
    if not recording_id:
        raise HTTPException(status_code=500, detail="Failed to start recording")
    
    return {"message": "Recording started", "recording_id": recording_id}

@api_router.post("/cameras/{camera_id}/record/stop")
async def stop_recording_endpoint(camera_id: str):
    await camera_manager.stop_recording(camera_id)
    return {"message": "Recording stopped"}

@api_router.get("/recordings", response_model=List[Recording])
async def get_recordings(camera_id: Optional[str] = None):
    query = {"camera_id": camera_id} if camera_id else {}
    recordings = await db.recordings.find(query, {"_id": 0}).sort("start_time", -1).to_list(1000)
    
    for rec in recordings:
        if isinstance(rec.get('start_time'), str):
            rec['start_time'] = datetime.fromisoformat(rec['start_time'])
        if isinstance(rec.get('end_time'), str):
            rec['end_time'] = datetime.fromisoformat(rec['end_time'])
    
    return recordings

@api_router.get("/recordings/{recording_id}/download")
async def download_recording(recording_id: str):
    recording = await db.recordings.find_one({"id": recording_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    filepath = RECORDINGS_DIR / recording['filename']
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Recording file not found")
    
    return FileResponse(filepath, media_type="video/x-msvideo", filename=recording['filename'])

@api_router.get("/recordings/{recording_id}/stream")
async def stream_recording(recording_id: str, speed: float = 1.0):
    recording = await db.recordings.find_one({"id": recording_id})
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    
    filepath = RECORDINGS_DIR / recording['filename']
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Recording file not found")
    
    async def generate():
        cap = cv2.VideoCapture(str(filepath))
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            fps = 25.0
        
        delay = (1.0 / fps) / speed
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Encode frame
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            yield buffer.tobytes()
            
            await asyncio.sleep(delay)
        
        cap.release()
    
    return StreamingResponse(generate(), media_type="multipart/x-mixed-replace; boundary=frame")

@api_router.websocket("/ws/camera/{camera_id}")
async def websocket_camera(websocket: WebSocket, camera_id: str):
    await ws_manager.connect(camera_id, websocket)
    try:
        while True:
            # Keep connection alive
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(camera_id, websocket)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_event():
    # Disconnect all cameras
    camera_ids = list(camera_manager.active_cameras.keys())
    for camera_id in camera_ids:
        await camera_manager.disconnect_camera(camera_id)
    client.close()