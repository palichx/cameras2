import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause } from 'lucide-react';
import { getBackendUrl } from '../utils/api';

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;

export default function VideoPlayer({ recordingId }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);

  const speedOptions = [1, 2, 4, 6, 8, 10];

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startPlayback = async () => {
    setIsPlaying(true);
    
    try {
      const response = await fetch(`${API}/recordings/${recordingId}/stream?speed=${speed}`);
      const reader = response.body.getReader();
      
      let buffer = new Uint8Array(0);
      
      const processStream = async () => {
        while (isPlaying) {
          const { done, value } = await reader.read();
          
          if (done) {
            setIsPlaying(false);
            break;
          }
          
          // Append new data to buffer
          const newBuffer = new Uint8Array(buffer.length + value.length);
          newBuffer.set(buffer);
          newBuffer.set(value, buffer.length);
          buffer = newBuffer;
          
          // Try to find JPEG boundaries
          const start = findJPEGStart(buffer);
          const end = findJPEGEnd(buffer, start);
          
          if (start !== -1 && end !== -1) {
            // Extract JPEG frame
            const frameData = buffer.slice(start, end + 2);
            buffer = buffer.slice(end + 2);
            
            // Display frame
            const blob = new Blob([frameData], { type: 'image/jpeg' });
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
          }
        }
      };
      
      streamRef.current = processStream;
      await processStream();
      
    } catch (error) {
      console.error('Error playing video:', error);
      setIsPlaying(false);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
  };

  const findJPEGStart = (buffer) => {
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD8) {
        return i;
      }
    }
    return -1;
  };

  const findJPEGEnd = (buffer, start) => {
    for (let i = start + 2; i < buffer.length - 1; i++) {
      if (buffer[i] === 0xFF && buffer[i + 1] === 0xD9) {
        return i;
      }
    }
    return -1;
  };

  return (
    <div className="space-y-4" data-testid="video-player">
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full object-contain"
          data-testid="video-player-canvas"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={isPlaying ? stopPlayback : startPlayback}
          className={`${isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
          data-testid="play-pause-btn"
        >
          {isPlaying ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Play
            </>
          )}
        </Button>

        <div className="flex items-center gap-2">
          <span className="text-white text-sm">Speed:</span>
          <div className="flex gap-1">
            {speedOptions.map((s) => (
              <Button
                key={s}
                onClick={() => setSpeed(s)}
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