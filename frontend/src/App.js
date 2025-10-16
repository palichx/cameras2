import { useState } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CameraView from './pages/CameraView';
import AddCamera from './pages/AddCamera';
import RecordingsView from './pages/RecordingsView';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/camera/:id" element={<CameraView />} />
          <Route path="/add-camera" element={<AddCamera />} />
          <Route path="/recordings" element={<RecordingsView />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;