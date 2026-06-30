import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Pastikan path ini benar
import './index.css'; // Jika Anda memiliki file CSS global

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);