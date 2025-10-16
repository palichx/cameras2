// Утилита для автоматического определения backend URL
// Работает с любым hostname в локальной сети

export const getBackendUrl = () => {
  // Если задана переменная окружения - используем её
  if (process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Иначе используем текущий host (работает в Docker и локально)
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = 8001; // Backend всегда на 8001
  
  return `${protocol}//${hostname}:${port}`;
};

export const getWebSocketUrl = () => {
  const backendUrl = getBackendUrl();
  // Преобразуем HTTP(S) в WS(S)
  return backendUrl.replace('https://', 'wss://').replace('http://', 'ws://');
};
