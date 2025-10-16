import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Download, Play } from 'lucide-react';
import { toast } from 'sonner';
import VideoPlayer from '../components/VideoPlayer';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RecordingsView() {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecording, setSelectedRecording] = useState(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const response = await axios.get(`${API}/recordings`);
      setRecordings(response.data);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  const downloadRecording = async (recordingId, filename) => {
    try {
      const response = await axios.get(`${API}/recordings/${recordingId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Recording downloaded');
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Failed to download recording');
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          data-testid="back-to-dashboard-btn"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Dashboard
        </Button>

        <h1 className="text-5xl font-bold text-white mb-8" data-testid="recordings-title">
          Recordings
        </h1>

        {selectedRecording && (
          <div className="mb-6">
            <Card className="glass border-white/20" data-testid="video-player-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-2xl">
                    {selectedRecording.camera_name}
                  </CardTitle>
                  <Button
                    onClick={() => setSelectedRecording(null)}
                    variant="ghost"
                    className="text-white hover:bg-white/10"
                    data-testid="close-player-btn"
                  >
                    Close Player
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <VideoPlayer recordingId={selectedRecording.id} />
              </CardContent>
            </Card>
          </div>
        )}

        {loading ? (
          <div className="text-center text-white text-xl" data-testid="loading-recordings">Loading recordings...</div>
        ) : recordings.length === 0 ? (
          <Card className="glass border-white/20" data-testid="no-recordings-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-white text-lg">No recordings available</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4" data-testid="recordings-list">
            {recordings.map((recording) => (
              <Card
                key={recording.id}
                className="glass border-white/20 card-hover"
                data-testid={`recording-card-${recording.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white text-xl font-semibold mb-2" data-testid={`recording-camera-${recording.id}`}>
                        {recording.camera_name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/70">
                        <div>
                          <p className="text-white/50">Start Time</p>
                          <p data-testid={`recording-start-${recording.id}`}>{formatDate(recording.start_time)}</p>
                        </div>
                        <div>
                          <p className="text-white/50">Duration</p>
                          <p data-testid={`recording-duration-${recording.id}`}>{formatDuration(recording.duration)}</p>
                        </div>
                        <div>
                          <p className="text-white/50">File Size</p>
                          <p data-testid={`recording-size-${recording.id}`}>{formatFileSize(recording.file_size)}</p>
                        </div>
                        <div>
                          <p className="text-white/50">Motion Events</p>
                          <p data-testid={`recording-motion-${recording.id}`}>{recording.motion_events}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        onClick={() => setSelectedRecording(recording)}
                        className="bg-green-500 hover:bg-green-600 text-white"
                        data-testid={`play-recording-${recording.id}`}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        Play
                      </Button>
                      <Button
                        onClick={() => downloadRecording(recording.id, recording.filename)}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        data-testid={`download-recording-${recording.id}`}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    </div>
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