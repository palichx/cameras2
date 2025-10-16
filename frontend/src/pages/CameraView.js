import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ArrowLeft, Square } from 'lucide-react';
import { toast } from 'sonner';
import ZoneEditor from '../components/ZoneEditor';
import MotionSettings from '../components/MotionSettings';
import { getBackendUrl, getWebSocketUrl } from '../utils/api';

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;
const WS_URL = getWebSocketUrl();

export default function CameraView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [camera, setCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeTab, setActiveTab] = useState('live');

  useEffect(() => {
    fetchCamera();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  const fetchCamera = async () => {
    try {
      const response = await axios.get(`${API}/cameras/${id}`);
      setCamera(response.data);
      setIsRecording(response.data.status === 'recording');
    } catch (error) {
      console.error('Error fetching camera:', error);
      toast.error('Failed to fetch camera');
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(`${WS_URL}/api/ws/camera/${id}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send ping every 30 seconds to keep connection alive
      setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') return;
      
      // Create image from binary data
      const blob = event.data;
      const url = URL.createObjectURL(blob);
      const img = new Image();
      
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast.error('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (id) connectWebSocket();
      }, 3000);
    };

    wsRef.current = ws;
  };

  const toggleRecording = async () => {
    try {
      if (isRecording) {
        await axios.post(`${API}/cameras/${id}/record/stop`);
        toast.success('Recording stopped');
        setIsRecording(false);
      } else {
        await axios.post(`${API}/cameras/${id}/record/start`);
        toast.success('Recording started');
        setIsRecording(true);
      }
      fetchCamera();
    } catch (error) {
      console.error('Error toggling recording:', error);
      toast.error('Failed to toggle recording');
    }
  };

  const handleSettingsSaved = async () => {
    toast.success('Настройки сохранены');
    fetchCamera();
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-white text-xl" data-testid="loading-camera">Loading camera...</p>
      </div>
    );
  }

  if (!camera) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-white text-xl" data-testid="camera-not-found">Camera not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="text-white hover:bg-white/10"
            data-testid="back-to-dashboard-btn"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Dashboard
          </Button>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowZoneEditor(!showZoneEditor)}
              className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
              data-testid="toggle-zone-editor-btn"
            >
              {showZoneEditor ? 'Hide' : 'Edit'} Exclusion Zones
            </Button>
            <Button
              onClick={toggleRecording}
              className={`${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white font-semibold`}
              data-testid="toggle-recording-btn"
            >
              {isRecording ? (
                <>
                  <Square className="mr-2 h-5 w-5" />
                  Stop Recording
                </>
              ) : (
                'Start Recording'
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <Card className="glass border-white/20" data-testid="live-feed-card">
              <CardHeader>
                <CardTitle className="text-white text-2xl" data-testid="camera-view-title">
                  {camera.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full object-contain"
                    data-testid="video-canvas"
                  />
                  {isRecording && (
                    <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-2" data-testid="recording-indicator">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                      REC
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Camera Info */}
          <div>
            <Card className="glass border-white/20" data-testid="camera-info-card">
              <CardHeader>
                <CardTitle className="text-white text-xl">Информация о камере</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-white/80">
                <div>
                  <p className="text-white/50 text-sm">Статус</p>
                  <p className="font-semibold capitalize" data-testid="camera-info-status">{camera.status}</p>
                </div>
                {camera.resolution && (
                  <>
                    <div>
                      <p className="text-white/50 text-sm">Разрешение</p>
                      <p className="font-semibold" data-testid="camera-info-resolution">{camera.resolution}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm">FPS</p>
                      <p className="font-semibold" data-testid="camera-info-fps">{camera.fps?.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm">Кодек</p>
                      <p className="font-semibold" data-testid="camera-info-codec">{camera.codec}</p>
                    </div>
                    <div>
                      <p className="text-white/50 text-sm">Битрейт</p>
                      <p className="font-semibold" data-testid="camera-info-bitrate">{camera.bitrate}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-white/50 text-sm">Зоны исключения</p>
                  <p className="font-semibold" data-testid="exclusion-zones-count">
                    {camera.exclusion_zones?.length || 0} зон
                  </p>
                </div>
                <div>
                  <p className="text-white/50 text-sm">Запись по движению</p>
                  <p className="font-semibold" data-testid="motion-recording-status">
                    {camera.motion_settings?.enabled ? 'Вкл' : 'Выкл'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Settings Tabs */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10">
              <TabsTrigger value="live" className="data-[state=active]:bg-white/20">
                Live Preview
              </TabsTrigger>
              <TabsTrigger value="zones" className="data-[state=active]:bg-white/20">
                Зоны исключения
              </TabsTrigger>
              <TabsTrigger value="motion" className="data-[state=active]:bg-white/20">
                Детектор движения
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="live" className="mt-4">
              <Card className="glass border-white/20">
                <CardContent className="pt-6">
                  <p className="text-white/70">Используйте live preview выше для просмотра камеры в реальном времени</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="zones" className="mt-4">
              <ZoneEditor
                cameraId={id}
                initialZones={camera.exclusion_zones || []}
                onSave={handleSettingsSaved}
              />
            </TabsContent>
            
            <TabsContent value="motion" className="mt-4">
              <MotionSettings
                cameraId={id}
                initialSettings={camera.motion_settings}
                onSave={handleSettingsSaved}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}