import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles.css';
import App from './App';
import { initializeDatabase } from './lib/db';

initializeDatabase().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}
