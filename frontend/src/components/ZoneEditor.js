import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ZoneEditor({ cameraId, initialZones, onSave }) {
  const [zones, setZones] = useState(initialZones || []);
  const [currentZone, setCurrentZone] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });

  useEffect(() => {
    drawZones();
  }, [zones, currentZone]);

  const drawZones = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing zones
    zones.forEach((zone, index) => {
      if (zone.points && zone.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(zone.points[0][0], zone.points[0][1]);
        zone.points.forEach(([x, y]) => {
          ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw points
        zone.points.forEach(([x, y]) => {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        });
      }
    });

    // Draw current zone being drawn
    if (currentZone.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentZone[0][0], currentZone[0][1]);
      currentZone.forEach(([x, y]) => {
        ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      currentZone.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'green';
        ctx.fill();
      });
    }
  };

  const handleCanvasClick = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.height);

    setCurrentZone([...currentZone, [x, y]]);
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentZone([]);
  };

  const finishDrawing = () => {
    if (currentZone.length >= 3) {
      setZones([...zones, { points: currentZone }]);
      setCurrentZone([]);
      setIsDrawing(false);
      toast.success('Zone added');
    } else {
      toast.error('Zone must have at least 3 points');
    }
  };

  const cancelDrawing = () => {
    setCurrentZone([]);
    setIsDrawing(false);
  };

  const deleteZone = (index) => {
    setZones(zones.filter((_, i) => i !== index));
    toast.success('Zone deleted');
  };

  const saveZones = async () => {
    try {
      await axios.put(`${API}/cameras/${cameraId}`, {
        exclusion_zones: zones
      });
      onSave();
    } catch (error) {
      console.error('Error saving zones:', error);
      toast.error('Failed to save zones');
    }
  };

  return (
    <Card className="glass border-white/20" data-testid="zone-editor-card">
      <CardHeader>
        <CardTitle className="text-white text-2xl">Exclusion Zones Editor</CardTitle>
        <p className="text-white/70 text-sm mt-2">
          Click on the canvas to draw exclusion zones where motion detection will be disabled
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative bg-gray-900 rounded-lg overflow-hidden" data-testid="zone-canvas-container">
            <canvas
              ref={canvasRef}
              width={canvasSize.width}
              height={canvasSize.height}
              onClick={handleCanvasClick}
              className="w-full cursor-crosshair"
              data-testid="zone-canvas"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {!isDrawing ? (
              <Button
                onClick={startDrawing}
                className="bg-green-500 hover:bg-green-600 text-white"
                data-testid="start-drawing-btn"
              >
                Start Drawing Zone
              </Button>
            ) : (
              <>
                <Button
                  onClick={finishDrawing}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  data-testid="finish-zone-btn"
                >
                  Finish Zone ({currentZone.length} points)
                </Button>
                <Button
                  onClick={cancelDrawing}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  data-testid="cancel-zone-btn"
                >
                  Cancel
                </Button>
              </>
            )}

            {zones.length > 0 && (
              <Button
                onClick={saveZones}
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold"
                data-testid="save-zones-btn"
              >
                Save Zones
              </Button>
            )}
          </div>

          {zones.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold">Active Zones ({zones.length})</h3>
              <div className="space-y-2">
                {zones.map((zone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/10 rounded p-3"
                    data-testid={`zone-item-${index}`}
                  >
                    <span className="text-white">
                      Zone {index + 1} ({zone.points?.length || 0} points)
                    </span>
                    <Button
                      onClick={() => deleteZone(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                      data-testid={`delete-zone-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}