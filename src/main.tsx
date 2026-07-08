import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent zoom gestures globally to lock the application viewport zoom
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // 1. Prevent pinch-to-zoom (multi-touch zoom) on mobile screens
  document.addEventListener('touchstart', (event) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, { passive: false });

  // 2. Prevent gesture-start zooming on iOS/Safari
  document.addEventListener('gesturestart', (event) => {
    event.preventDefault();
  });

  // 3. Prevent pinch-to-zoom on desktop trackpads (ctrlKey + mouse wheel)
  document.addEventListener('wheel', (event) => {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }, { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <App />
  </StrictMode>,
);

