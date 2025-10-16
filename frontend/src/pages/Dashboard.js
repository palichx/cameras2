import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Plus, Video, Trash2, Play, Square, Eye } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const response = await axios.get(`${API}/cameras`);
      setCameras(response.data);
    } catch (error) {
      console.error('Error fetching cameras:', error);
      toast.error('Failed to fetch cameras');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async (cameraId) => {
    try {
      await axios.post(`${API}/cameras/${cameraId}/start`);
      toast.success('Camera started');
      fetchCameras();
    } catch (error) {
      console.error('Error starting camera:', error);
      toast.error('Failed to start camera');
    }
  };

  const stopCamera = async (cameraId) => {
    try {
      await axios.post(`${API}/cameras/${cameraId}/stop`);
      toast.success('Camera stopped');
      fetchCameras();
    } catch (error) {
      console.error('Error stopping camera:', error);
      toast.error('Failed to stop camera');
    }
  };

  const startRecording = async (cameraId) => {
    try {
      await axios.post(`${API}/cameras/${cameraId}/record/start`);
      toast.success('Recording started');
      fetchCameras();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = async (cameraId) => {
    try {
      await axios.post(`${API}/cameras/${cameraId}/record/stop`);
      toast.success('Recording stopped');
      fetchCameras();
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };

  const deleteCamera = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) return;
    
    try {
      await axios.delete(`${API}/cameras/${cameraId}`);
      toast.success('Camera deleted');
      fetchCameras();
    } catch (error) {
      console.error('Error deleting camera:', error);
      toast.error('Failed to delete camera');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'recording': return 'bg-red-500';
      case 'error': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2" data-testid="dashboard-title">
                Video Surveillance System
              </h1>
              <p className="text-white/80 text-lg">Manage your cameras and recordings</p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/recordings')}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                data-testid="view-recordings-btn"
              >
                <Video className="mr-2 h-5 w-5" />
                Recordings
              </Button>
              <Button
                onClick={() => navigate('/add-camera')}
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold"
                data-testid="add-camera-btn"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Camera
              </Button>
            </div>
          </div>
        </div>

        {/* Cameras Grid */}
        {loading ? (
          <div className="text-center text-white text-xl" data-testid="loading-indicator">Loading cameras...</div>
        ) : cameras.length === 0 ? (
          <Card className="glass border-white/20" data-testid="no-cameras-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Video className="h-16 w-16 text-white/50 mb-4" />
              <p className="text-white text-lg mb-4">No cameras added yet</p>
              <Button
                onClick={() => navigate('/add-camera')}
                className="bg-white text-purple-600 hover:bg-white/90"
                data-testid="no-cameras-add-btn"
              >
                <Plus className="mr-2 h-5 w-5" />
                Add Your First Camera
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="cameras-grid">
            {cameras.map((camera) => (
              <Card
                key={camera.id}
                className="glass border-white/20 card-hover overflow-hidden"
                data-testid={`camera-card-${camera.id}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-xl mb-2" data-testid={`camera-name-${camera.id}`}>
                        {camera.name}
                      </CardTitle>
                      <Badge className={`${getStatusColor(camera.status)} text-white`} data-testid={`camera-status-${camera.id}`}>
                        {camera.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCamera(camera.id)}
                      className="text-white/80 hover:text-red-400 hover:bg-red-500/20"
                      data-testid={`delete-camera-${camera.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {camera.resolution && (
                    <div className="space-y-1 mb-4 text-sm text-white/70">
                      <p data-testid={`camera-resolution-${camera.id}`}>Resolution: {camera.resolution}</p>
                      <p data-testid={`camera-fps-${camera.id}`}>FPS: {camera.fps?.toFixed(1)}</p>
                      <p data-testid={`camera-codec-${camera.id}`}>Codec: {camera.codec}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    {camera.status === 'inactive' ? (
                      <Button
                        onClick={() => startCamera(camera.id)}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                        data-testid={`start-camera-${camera.id}`}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Start Camera
                      </Button>
                    ) : (
                      <>
                        <Button
                          onClick={() => navigate(`/camera/${camera.id}`)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white"
                          data-testid={`view-camera-${camera.id}`}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Live
                        </Button>
                        
                        {camera.status === 'recording' ? (
                          <Button
                            onClick={() => stopRecording(camera.id)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white"
                            data-testid={`stop-recording-${camera.id}`}
                          >
                            <Square className="mr-2 h-4 w-4" />
                            Stop Recording
                          </Button>
                        ) : (
                          <Button
                            onClick={() => startRecording(camera.id)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white"
                            data-testid={`start-recording-${camera.id}`}
                          >
                            <Video className="mr-2 h-4 w-4" />
                            Start Recording
                          </Button>
                        )}
                        
                        <Button
                          onClick={() => stopCamera(camera.id)}
                          variant="outline"
                          className="w-full border-white/30 text-white hover:bg-white/10"
                          data-testid={`stop-camera-${camera.id}`}
                        >
                          Stop Camera
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}