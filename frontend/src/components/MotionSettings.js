import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Button } from './ui/button';
import axios from 'axios';
import { toast } from 'sonner';
import { getBackendUrl } from '../utils/api';

const BACKEND_URL = getBackendUrl();
const API = `${BACKEND_URL}/api`;

export default function MotionSettings({ cameraId, initialSettings, onSave }) {
  const [settings, setSettings] = useState(initialSettings || {
    enabled: true,
    sensitivity: 25,
    min_area: 500,
    pre_record: 5,
    post_record: 10
  });

  const handleSave = async () => {
    try {
      await axios.put(`${API}/cameras/${cameraId}`, {
        motion_settings: settings
      });
      toast.success('Настройки сохранены');
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving motion settings:', error);
      toast.error('Ошибка сохранения настроек');
    }
  };

  return (
    <Card className="glass border-white/20" data-testid="motion-settings-card">
      <CardHeader>
        <CardTitle className="text-white text-xl">Настройки детектора движения</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Включение записи по движению */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-white font-semibold">Запись при движении</Label>
            <p className="text-white/60 text-sm">Автоматическая запись при обнаружении движения</p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            data-testid="motion-enabled-switch"
          />
        </div>

        {settings.enabled && (
          <>
            {/* Чувствительность */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-white">Чувствительность: {settings.sensitivity}</Label>
                <span className="text-white/60 text-sm">
                  {settings.sensitivity < 33 ? 'Высокая' : settings.sensitivity < 66 ? 'Средняя' : 'Низкая'}
                </span>
              </div>
              <Slider
                value={[settings.sensitivity]}
                onValueChange={([value]) => setSettings({ ...settings, sensitivity: value })}
                min={1}
                max={100}
                step={1}
                className="w-full"
                data-testid="sensitivity-slider"
              />
              <p className="text-white/50 text-xs">Меньше значение = выше чувствительность</p>
            </div>

            {/* Минимальная площадь */}
            <div className="space-y-2">
              <Label className="text-white">Минимальная площадь движения (пиксели)</Label>
              <Input
                type="number"
                value={settings.min_area}
                onChange={(e) => setSettings({ ...settings, min_area: parseInt(e.target.value) || 500 })}
                min="100"
                max="10000"
                step="100"
                className="bg-white/10 border-white/20 text-white"
                data-testid="min-area-input"
              />
              <p className="text-white/50 text-xs">Игнорировать движения меньше этой площади</p>
            </div>

            {/* Предзапись */}
            <div className="space-y-2">
              <Label className="text-white">Предзапись (секунды)</Label>
              <Input
                type="number"
                value={settings.pre_record}
                onChange={(e) => setSettings({ ...settings, pre_record: parseInt(e.target.value) || 5 })}
                min="0"
                max="30"
                step="1"
                className="bg-white/10 border-white/20 text-white"
                data-testid="pre-record-input"
              />
              <p className="text-white/50 text-xs">Сколько секунд записать ДО обнаружения движения</p>
            </div>

            {/* Постзапись */}
            <div className="space-y-2">
              <Label className="text-white">Постзапись (секунды)</Label>
              <Input
                type="number"
                value={settings.post_record}
                onChange={(e) => setSettings({ ...settings, post_record: parseInt(e.target.value) || 10 })}
                min="0"
                max="60"
                step="1"
                className="bg-white/10 border-white/20 text-white"
                data-testid="post-record-input"
              />
              <p className="text-white/50 text-xs">Сколько секунд записать ПОСЛЕ последнего движения</p>
            </div>
          </>
        )}

        <Button
          onClick={handleSave}
          className="w-full bg-white text-purple-600 hover:bg-white/90 font-semibold"
          data-testid="save-motion-settings-btn"
        >
          Сохранить настройки
        </Button>
      </CardContent>
    </Card>
  );
}
