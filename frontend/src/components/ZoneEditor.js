import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { getBackendUrl } from '../utils/api';

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;

export default function ZoneEditor({ cameraId, initialZones, onSave }) {
  const [zones, setZones] = useState(initialZones || []);
  const [currentZone, setCurrentZone] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    loadSnapshot();
  }, [cameraId]);

  useEffect(() => {
    if (snapshot) {
      drawZones();
    }
  }, [zones, currentZone, snapshot]);

  const loadSnapshot = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/cameras/${cameraId}/snapshot`, {
        responseType: 'blob'
      });
      const imageUrl = URL.createObjectURL(response.data);
      setSnapshot(imageUrl);
      
      // Load image to get dimensions
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = img.width;
          canvas.height = img.height;
          drawZones();
        }
      };
      img.src = imageUrl;
      imageRef.current = img;
      
    } catch (error) {
      console.error('Error loading snapshot:', error);
      toast.error('Не удалось загрузить изображение с камеры. Убедитесь что камера активна.');
    } finally {
      setLoading(false);
    }
  };

  const drawZones = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    
    // Draw camera image
    if (snapshot && imageRef.current.complete) {
      ctx.drawImage(imageRef.current, 0, 0);
    }

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
        
        // Draw zone number
        const centerX = zone.points.reduce((sum, p) => sum + p[0], 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + p[1], 0) / zone.points.length;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(`Зона ${index + 1}`, centerX - 25, centerY);
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
      toast.success('Зона добавлена');
    } else {
      toast.error('Зона должна иметь минимум 3 точки');
    }
  };

  const cancelDrawing = () => {
    setCurrentZone([]);
    setIsDrawing(false);
  };

  const deleteZone = (index) => {
    setZones(zones.filter((_, i) => i !== index));
    toast.success('Зона удалена');
  };

  const saveZones = async () => {
    try {
      await axios.put(`${API}/cameras/${cameraId}`, {
        exclusion_zones: zones
      });
      onSave();
    } catch (error) {
      console.error('Error saving zones:', error);
      toast.error('Ошибка сохранения зон');
    }
  };

  return (
    <Card className="glass border-white/20" data-testid="zone-editor-card">
      <CardHeader>
        <CardTitle className="text-white text-2xl">Редактор зон исключения</CardTitle>
        <p className="text-white/70 text-sm mt-2">
          Нарисуйте зоны, где детектор движения будет отключен (деревья, дороги, флаги и т.д.)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Snapshot loading */}
          {loading && (
            <div className="text-white text-center py-8">Загрузка изображения...</div>
          )}
          
          {!loading && !snapshot && (
            <div className="text-white/70 text-center py-8">
              <p>Не удалось загрузить изображение</p>
              <Button onClick={loadSnapshot} className="mt-4">
                <RefreshCw className="mr-2 h-4 w-4" />
                Повторить
              </Button>
            </div>
          )}

          {snapshot && (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden" data-testid="zone-canvas-container">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="w-full cursor-crosshair"
                data-testid="zone-canvas"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadSnapshot}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              data-testid="refresh-snapshot-btn"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить изображение
            </Button>
            
            {!isDrawing ? (
              <Button
                onClick={startDrawing}
                className="bg-green-500 hover:bg-green-600 text-white"
                data-testid="start-drawing-btn"
                disabled={!snapshot}
              >
                Начать рисование зоны
              </Button>
            ) : (
              <>
                <Button
                  onClick={finishDrawing}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  data-testid="finish-zone-btn"
                >
                  Завершить зону ({currentZone.length} точек)
                </Button>
                <Button
                  onClick={cancelDrawing}
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  data-testid="cancel-zone-btn"
                >
                  Отмена
                </Button>
              </>
            )}

            {zones.length > 0 && (
              <Button
                onClick={saveZones}
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold"
                data-testid="save-zones-btn"
              >
                Сохранить зоны
              </Button>
            )}
          </div>

          {zones.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold">Активные зоны ({zones.length})</h3>
              <div className="space-y-2">
                {zones.map((zone, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white/10 rounded p-3"
                    data-testid={`zone-item-${index}`}
                  >
                    <span className="text-white">
                      Зона {index + 1} ({zone.points?.length || 0} точек)
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