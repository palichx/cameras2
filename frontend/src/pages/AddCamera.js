import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AddCamera() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/cameras`, formData);
      toast.success('Camera added successfully');
      navigate('/');
    } catch (error) {
      console.error('Error adding camera:', error);
      toast.error('Failed to add camera');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-white hover:bg-white/10 mb-6"
          data-testid="back-btn"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Dashboard
        </Button>

        <Card className="glass border-white/20" data-testid="add-camera-card">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-white" data-testid="add-camera-title">
              Add New Camera
            </CardTitle>
            <p className="text-white/70 mt-2">Configure your camera connection</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name" className="text-white mb-2 block">
                  Camera Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Front Door Camera"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  data-testid="camera-name-input"
                />
              </div>

              <div>
                <Label htmlFor="url" className="text-white mb-2 block">
                  Camera URL
                </Label>
                <Input
                  id="url"
                  type="text"
                  placeholder="rtsp://192.168.1.100:554/stream1 or http://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  data-testid="camera-url-input"
                />
                <p className="text-white/50 text-sm mt-1">
                  Supports RTSP, RTP, and HTTP protocols
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username" className="text-white mb-2 block">
                    Username (optional)
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    data-testid="camera-username-input"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-white mb-2 block">
                    Password (optional)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    data-testid="camera-password-input"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-white text-purple-600 hover:bg-white/90 font-semibold"
                  data-testid="submit-camera-btn"
                >
                  {loading ? 'Adding...' : 'Add Camera'}
                </Button>
                <Button
                  type="button"
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  data-testid="cancel-btn"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}