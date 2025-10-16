import { useState } from 'react';
import { Button } from './ui/button';
import { Play, Pause } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;

export default function VideoPlayer({ recordingId }) {
  const [speed, setSpeed] = useState(1);

  const speedOptions = [1, 2, 4, 6, 8, 10];

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    const video = document.getElementById(`video-${recordingId}`);
    if (video) {
      video.playbackRate = newSpeed;
    }
  };

  return (
    <div className="space-y-4" data-testid="video-player">
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <video
          id={`video-${recordingId}`}
          src={`${API}/recordings/${recordingId}/download`}
          controls
          className="w-full h-full"
          data-testid="video-player-element"
          onLoadedMetadata={(e) => {
            e.target.playbackRate = speed;
          }}
        >
          Ваш браузер не поддерживает воспроизведение видео
        </video>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">Скорость:</span>
          <div className="flex gap-1">
            {speedOptions.map((s) => (
              <Button
                key={s}
                onClick={() => handleSpeedChange(s)}
                variant={speed === s ? 'default' : 'outline'}
                size="sm"
                className={speed === s ? 'bg-white text-purple-600' : 'border-white/30 text-white hover:bg-white/10'}
                data-testid={`speed-${s}x-btn`}
              >
                {s}x
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}